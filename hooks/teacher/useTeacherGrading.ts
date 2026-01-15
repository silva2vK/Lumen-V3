
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, collection, query, orderBy, getDocs, updateDoc, increment, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../components/firebaseClient';
import type { Activity, ActivitySubmission, Unidade } from '../../types';
import { createNotification } from '../../utils/createNotification';
import { recalculateStudentGradeSummary } from '../../utils/gradingUtils';
import { getGamificationConfig } from '../../utils/gamificationConfig';
import { processGamificationEvent } from '../../utils/gamificationEngine';

interface GradeMutationParams {
    studentId: string;
    grade: number;
    feedback: string;
    scores?: Record<string, number>;
}

export function useTeacherGrading(activityId: string | undefined, user: any) {
    const queryClient = useQueryClient();

    // 1. Fetch Activity Details
    const activityQuery = useQuery({
        queryKey: ['activity', activityId],
        queryFn: async () => {
            if (!activityId) throw new Error("No activity ID");
            const ref = doc(db, "activities", activityId);
            const snap = await getDoc(ref);
            if (!snap.exists()) throw new Error("Activity not found");
            return { id: snap.id, ...snap.data() } as Activity;
        },
        enabled: !!activityId
    });

    // 2. Fetch Submissions
    const submissionsQuery = useQuery({
        queryKey: ['activitySubmissions', activityId],
        queryFn: async () => {
            if (!activityId) return [];
            const subRef = collection(db, "activities", activityId, "submissions");
            const q = query(subRef, orderBy("submissionDate", "asc"));
            const snap = await getDocs(q);
            return snap.docs.map(d => ({
                studentId: d.id,
                ...d.data(),
                submissionDate: d.data().submissionDate?.toDate ? d.data().submissionDate.toDate().toISOString() : d.data().submissionDate,
                gradedAt: d.data().gradedAt?.toDate ? d.data().gradedAt.toDate().toISOString() : d.data().gradedAt
            } as ActivitySubmission));
        },
        enabled: !!activityId
    });

    // 3. New: Fetch Private Answer Key (For Quizzes)
    const answerKeyQuery = useQuery({
        queryKey: ['activityAnswerKey', activityId],
        queryFn: async () => {
            if (!activityId) return null;
            // Checks if this activity is a wrapper for a Quiz (via external ID or type)
            // Or if we implemented the split directly on activities.
            // Assuming this hook is used for Quizzes stored as activities or Quizzes logic.
            // For now, let's assume we look for the key if it's a quiz.
            
            // Try fetching from standard location for Quizzes
            // Note: If activity is actually a Quiz reference, we might need the quizId. 
            // Assuming activityId IS the quizId for this context based on refactoring.
            try {
                const keyRef = doc(db, 'quizzes', activityId, 'answers', 'key');
                const snap = await getDoc(keyRef);
                if (snap.exists()) return snap.data();
            } catch (e) {
                // Ignore if not found (it might be a regular activity)
            }
            return null;
        },
        enabled: !!activityId,
        retry: false
    });

    // 4. Grade Mutation
    const gradeMutation = useMutation({
        mutationFn: async ({ studentId, grade, feedback, scores }: GradeMutationParams) => {
            if (!activityId || !user || !activityQuery.data) throw new Error("Context missing");
            
            const activityData = activityQuery.data;
            const activityRef = doc(db, "activities", activityId);
            
            const submissionPayload: any = { 
                status: 'Corrigido', 
                grade, 
                feedback, 
                gradedAt: new Date().toISOString() 
            };
            if (scores) submissionPayload.scores = scores;

            // Update Submission
            await setDoc(doc(collection(activityRef, "submissions"), studentId), submissionPayload, { merge: true });
            
            // Decrement Pending Counter
            await updateDoc(activityRef, { pendingSubmissionCount: increment(-1) });

            // AWARD XP (Server-side equivalent logic)
            // This is the "Trusted Client" acting.
            // We fetch the config and award XP because the student client is not allowed to do it.
            try {
                const config = await getGamificationConfig();
                // If it's a quiz (auto-graded), award quiz XP. If manual activity, award activity XP.
                // We use a heuristic or pass a type. Defaulting to 'activity_sent' base + score bonus?
                // Simpler: Just give the standard activity XP or score-based XP.
                const baseXp = config['activity_sent'] || 20;
                // Bonus for good grade? Optional.
                await processGamificationEvent(studentId, 'activity_sent', baseXp);
            } catch (e) { console.error("XP Error", e); }

            // Notification
            try {
                await createNotification({
                    userId: studentId, actorId: user.id, actorName: user.name, type: 'activity_correction',
                    title: 'Atividade Corrigida', text: `Sua atividade foi corrigida. Nota: ${grade}`,
                    classId: activityData.classId!, activityId: activityId
                });
            } catch (e) { console.error("Notification failed", e); }

            // Recalculate School Record
            if (activityData.classId) {
                await recalculateStudentGradeSummary(
                    activityData.classId, 
                    studentId, 
                    { 
                        activityId, 
                        title: activityData.title,
                        grade,
                        maxPoints: activityData.points,
                        unidade: activityData.unidade as Unidade,
                        materia: activityData.materia || 'Geral'
                    }, 
                    activityData.className
                );
            }

            return { studentId, grade, feedback, scores };
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['activitySubmissions', activityId], (old: ActivitySubmission[] | undefined) => {
                if (!old) return [];
                return old.map(s => s.studentId === data.studentId ? { ...s, ...data, status: 'Corrigido', gradedAt: new Date().toISOString() } : s);
            });
            queryClient.invalidateQueries({ queryKey: ['pendingActivities'] });
        }
    });

    return {
        activity: activityQuery.data,
        submissions: submissionsQuery.data || [],
        answerKey: answerKeyQuery.data,
        isLoading: activityQuery.isLoading || submissionsQuery.isLoading,
        gradeMutation
    };
}
