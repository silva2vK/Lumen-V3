
import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
    collection, query, where, getDocs, doc, getDoc, 
    limit, updateDoc, arrayUnion, increment, 
    serverTimestamp, setDoc, writeBatch, documentId, collectionGroup, orderBy
} from 'firebase/firestore';
import { db } from '../components/firebaseClient';
import { useToast } from '../contexts/ToastContext';
import type { Module, Quiz, Activity, TeacherClass, User, ActivitySubmission } from '../types';
import { processGamificationEvent } from '../utils/gamificationEngine';
import { getGamificationConfig } from '../utils/gamificationConfig';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createNotification } from '../utils/createNotification';
import { MAX_STUDENTS_PER_CLASS } from '../constants/index';

export function useStudentContent(user: User | null) {
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    
    // UI State
    const [searchedModules, setSearchedModules] = useState<Module[]>([]);
    const [searchedQuizzes, setSearchedQuizzes] = useState<Quiz[]>([]);
    const [isSearchingQuizzes, setIsSearchingQuizzes] = useState(false);
    const [isSearchingModules, setIsSearchingModules] = useState(false);
    
    const isStudent = user?.role === 'aluno';
    const isProfessor = user?.role === 'professor';
    const canViewMyLibrary = isStudent || isProfessor;

    // Default filters - Auto-detect default scope based on role
    const [moduleFilters, setModuleFilters] = useState({ 
        queryText: '', 
        serie: 'all', 
        materia: 'all', 
        status: 'all', // all, not_started, in_progress, completed
        scope: (user && canViewMyLibrary) ? 'my_modules' : 'public' as 'my_modules' | 'public' 
    });

    // 1. Get Classes (Essential for 'My Library' Scope for Students)
    const { data: rawStudentClasses, isLoading: isLoadingClasses } = useQuery({
        queryKey: ['studentClasses', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const q = query(collection(db, "classes"), where("studentIds", "array-contains", user.id));
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as TeacherClass));
        },
        enabled: isStudent && !!user,
    });
    const studentClasses = useMemo(() => rawStudentClasses || [], [rawStudentClasses]);

    // 2. Get Progress (Essential for Status Filtering)
    const { data: progressMap = new Map<string, number>() } = useQuery({
        queryKey: ['studentProgressMap', user?.id],
        queryFn: async () => {
            if (!user) return new Map();
            const snap = await getDocs(collection(db, "users", user.id, "modulesProgress"));
            const map = new Map<string, number>();
            snap.docs.forEach(d => {
                map.set(d.id, d.data().progress || 0);
            });
            return map;
        },
        enabled: isStudent && !!user,
        staleTime: 1000 * 60 * 5 
    });

    // --- Refactored: Server-Side Search Strategy ---
    const searchModules = useCallback(async (filters: typeof moduleFilters) => {
        if (!user) return;
        setIsSearchingModules(true);
        setModuleFilters(filters);

        try {
            const { status, materia, serie, queryText } = filters;
            
            // Allow my_modules for students and professors, force public otherwise
            const allowedMyLibrary = user.role === 'aluno' || user.role === 'professor';
            const scope = allowedMyLibrary ? filters.scope : 'public';
            
            let results: Module[] = [];

            // Helper to get matching IDs from progress map
            const getProgressIds = (checkFn: (p: number) => boolean) => {
                const ids: string[] = [];
                progressMap.forEach((prog, id) => {
                    if (checkFn(prog)) ids.push(id);
                });
                return ids;
            };

            // STRATEGY 1: Filter by Status "In Progress" or "Completed" (Student Only feature basically)
            if ((status === 'in_progress' || status === 'completed') && user.role === 'aluno') {
                const targetIds = getProgressIds(p => 
                    status === 'completed' ? p === 100 : (p > 0 && p < 100)
                );

                if (targetIds.length === 0) {
                    setSearchedModules([]);
                    setIsSearchingModules(false);
                    return;
                }

                const chunks = [];
                for (let i = 0; i < targetIds.length; i += 10) {
                    chunks.push(targetIds.slice(i, i + 10));
                }

                for (const chunk of chunks) {
                    const q = query(collection(db, "modules"), where(documentId(), "in", chunk));
                    const snap = await getDocs(q);
                    snap.docs.forEach(d => results.push({ id: d.id, ...d.data() } as Module));
                }

                results = results.filter(m => {
                    if (materia !== 'all' && m.materia !== materia && !m.materia?.includes(materia)) return false;
                    if (serie !== 'all' && m.series !== serie && !m.series?.includes(serie)) return false;
                    return true;
                });

            } 
            // STRATEGY 2: Filter by "All" or "Not Started" (or Professor View)
            else {
                // Determine base query based on scope and role
                let constraints: any[] = [];

                // 2a. Scope Constraints
                if (scope === 'my_modules') {
                    if (user.role === 'aluno') {
                        const classIds = studentClasses.map(c => c.id);
                        if (classIds.length === 0) {
                            setSearchedModules([]); 
                            setIsSearchingModules(false);
                            return;
                        }
                        constraints.push(where("status", "==", "Ativo"));
                        constraints.push(where("classIds", "array-contains-any", classIds.slice(0, 10)));
                    } else if (user.role === 'professor') {
                        // Professors see their own modules (created by them)
                        constraints.push(where("creatorId", "==", user.id));
                        constraints.push(where("status", "==", "Ativo"));
                    }
                } else {
                    // Public Scope
                    constraints.push(where("status", "==", "Ativo"));
                    constraints.push(where("visibility", "==", "public"));
                }

                // 2b. Field Constraints (Server-Side)
                if (materia !== 'all') constraints.push(where("materia", "==", materia)); 
                
                const q = query(collection(db, "modules"), ...constraints, limit(50));
                const snap = await getDocs(q);
                
                const potentialModules = snap.docs.map(d => ({ id: d.id, ...d.data() } as Module));

                // 2c. "Not Started" Filter (Client-Side Exclusion - Student Only)
                if (status === 'not_started' && user.role === 'aluno') {
                    results = potentialModules.filter(m => !progressMap.has(m.id));
                } else {
                    results = potentialModules;
                }

                // 2d. Apply remaining memory filters (Series, Text)
                results = results.filter(m => {
                    if (serie !== 'all') {
                        const s = Array.isArray(m.series) ? m.series : [m.series];
                        if (!s.includes(serie)) return false;
                    }
                    return true;
                });
            }

            // Final Text Search (In Memory)
            if (queryText) {
                const lower = queryText.toLowerCase();
                results = results.filter(m => 
                    m.title.toLowerCase().includes(lower) || 
                    m.description.toLowerCase().includes(lower)
                );
            }

            // Inject Progress Data for UI (Student Only)
            const finalModules = results.map(m => ({
                ...m,
                progress: progressMap.get(m.id) || 0
            }));

            setSearchedModules(finalModules);

        } catch (error) {
            console.error("Search failed:", error);
            addToast("Erro na busca.", "error");
        } finally {
            setIsSearchingModules(false);
        }
    }, [user, progressMap, studentClasses, addToast]);

    // Force public scope update ONLY if user is not allowed to see 'my_modules'
    useEffect(() => {
        const canViewMyLibrary = user && (user.role === 'aluno' || user.role === 'professor');
        if (user && !canViewMyLibrary && moduleFilters.scope === 'my_modules') {
            const newFilters = { ...moduleFilters, scope: 'public' as const };
            setModuleFilters(newFilters);
            searchModules(newFilters);
        }
    }, [user, moduleFilters.scope, searchModules]);

    const { data: rawUserSubmissions } = useQuery({
        queryKey: ['studentSubmissions', user?.id],
        queryFn: async () => {
            if (!user) return {};
            try {
                // TRY/CATCH para evitar que erros de índice quebrem a página inteira
                const q = query(collectionGroup(db, 'submissions'), where('studentId', '==', user.id));
                const snap = await getDocs(q);
                const subsMap: Record<string, ActivitySubmission> = {};
                snap.forEach(d => {
                    const activityId = d.ref.parent.parent?.id; 
                    if (activityId) subsMap[activityId] = d.data() as ActivitySubmission;
                });
                return subsMap;
            } catch (error) { 
                console.warn("Falha ao buscar submissões (Índice pode estar ausente):", error);
                return {}; 
            }
        },
        enabled: isStudent && !!user,
        retry: false // Não tentar repedidas vezes se falhar por permissão/índice
    });
    const userSubmissions = useMemo(() => rawUserSubmissions || {}, [rawUserSubmissions]);

    const submitActivityMutation = useMutation({
        mutationFn: async ({ activityId, content }: { activityId: string, content: string }) => {
            if (!user) throw new Error("Auth required");

            const activityRef = doc(db, "activities", activityId);
            const activitySnap = await getDoc(activityRef);
            if (!activitySnap.exists()) throw new Error("Atividade não existe");
            
            const status = 'Aguardando correção';

            const submissionData: ActivitySubmission = {
                studentId: user.id,
                studentName: user.name,
                studentAvatarUrl: user.avatarUrl || '', 
                studentSeries: user.series || '', 
                submissionDate: new Date().toISOString(),
                content: content,
                status: status, 
            };

            const subRef = doc(db, "activities", activityId, "submissions", user.id);
            const subSnap = await getDoc(subRef);
            const isUpdate = subSnap.exists();

            await setDoc(subRef, { ...submissionData, timestamp: serverTimestamp() }, { merge: true });

            if (!isUpdate) {
                await updateDoc(activityRef, {
                    submissionCount: increment(1),
                    pendingSubmissionCount: increment(1)
                });
            }
            
            return { success: true };
        },
        onSuccess: () => {
            addToast("Respostas enviadas! Aguarde a correção.", "success");
            queryClient.invalidateQueries({ queryKey: ['studentSubmissions'] });
            queryClient.invalidateQueries({ queryKey: ['activities'] });
        },
        onError: (error: any) => addToast("Erro ao enviar.", "error")
    });

    // --- Handlers ---

    const handleActivitySubmit = async (activityId: string, content: string) => {
        try { await submitActivityMutation.mutateAsync({ activityId, content }); } catch {}
    };

    const searchQuizzes = useCallback(async (filters: any) => {
        if (!user) return;
        setIsSearchingQuizzes(true);
        setSearchedQuizzes([]);
        try {
            let q = query(collection(db, "quizzes"), where("status", "==", "Ativo"), limit(20));
            if (filters.serie && filters.serie !== 'all') q = query(q, where("series", "array-contains", filters.serie));
            
            const snap = await getDocs(q);
            let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as Quiz));

            if (filters.materia && filters.materia !== 'all') {
                results = results.filter(qz => {
                    const mat = Array.isArray(qz.materia) ? qz.materia : [qz.materia];
                    return mat.includes(filters.materia);
                });
            }
            setSearchedQuizzes(results);
        } catch { addToast("Erro na busca.", "error"); } 
        finally { setIsSearchingQuizzes(false); }
    }, [user, addToast]);

    const handleJoinClass = async (code: string) => {
        if (!user) return false;
        try {
            const q = query(collection(db, "classes"), where("code", "==", code));
            const snap = await getDocs(q);
            if (snap.empty) {
                addToast("Código de turma inválido.", "error");
                return false;
            }
            const classDoc = snap.docs[0];
            const classData = classDoc.data();
            
            if (classData.studentIds?.includes(user.id)) {
                addToast("Você já está nesta turma.", "info");
                return false;
            }

            const currentCount = classData.studentCount || (classData.students?.length || 0);
            if (currentCount >= MAX_STUDENTS_PER_CLASS) {
                addToast(`Esta turma atingiu o limite de ${MAX_STUDENTS_PER_CLASS} alunos.`, "error");
                return false;
            }

            await updateDoc(classDoc.ref, {
                students: arrayUnion({ id: user.id, name: user.name, avatarUrl: user.avatarUrl || '', status: 'active' }),
                studentIds: arrayUnion(user.id),
                studentCount: increment(1)
            });

            await createNotification({
                userId: classData.teacherId,
                actorId: user.id,
                actorName: user.name,
                type: 'notice_post', 
                title: 'Novo Aluno',
                text: `${user.name} entrou na turma ${classData.name}.`,
                classId: classDoc.id
            });

            addToast("Entrou na turma com sucesso!", "success");
            queryClient.invalidateQueries({ queryKey: ['studentClasses'] });
            return true;
        } catch (error) {
            console.error(error);
            addToast("Erro ao entrar na turma.", "error");
            return false;
        }
    };

    const handleLeaveClass = async (classId: string) => {
        if (!user) return;
        try {
            const classRef = doc(db, "classes", classId);
            const classSnap = await getDoc(classRef);
            if (classSnap.exists()) {
                const data = classSnap.data();
                const updatedStudents = (data.students || []).filter((s: any) => s.id !== user.id);
                const updatedIds = (data.studentIds || []).filter((id: string) => id !== user.id);
                
                await updateDoc(classRef, {
                    students: updatedStudents,
                    studentIds: updatedIds,
                    studentCount: updatedStudents.length
                });
                
                addToast("Você saiu da turma.", "success");
                queryClient.invalidateQueries({ queryKey: ['studentClasses'] });
            }
        } catch (error) {
            console.error(error);
            addToast("Erro ao sair da turma.", "error");
        }
    };

    const handleModuleProgressUpdate = async (moduleId: string, progress: number) => {
        if (!user) return;
        try {
            const ref = doc(db, "users", user.id, "modulesProgress", moduleId);
            await setDoc(ref, { 
                progress, 
                lastUpdated: serverTimestamp(),
                status: progress === 100 ? 'Concluído' : 'Em andamento'
            }, { merge: true });
            queryClient.invalidateQueries({ queryKey: ['studentModulesProgress'] });
            queryClient.invalidateQueries({ queryKey: ['studentProgressMap'] }); 
        } catch (error) {
            console.error(error);
        }
    };
    
    const handleModuleComplete = async (moduleId: string) => {
        if (!user) return;
        const ref = doc(db, "users", user.id, "modulesProgress", moduleId);
        await setDoc(ref, { progress: 100, completedAt: serverTimestamp(), status: 'Concluído' }, { merge: true });
        
        const config = await getGamificationConfig();
        const xp = config['module_complete'] || 50;
        await processGamificationEvent(user.id, 'module_complete', xp);
        addToast(`Módulo concluído! +${xp} XP`, "success");
        queryClient.invalidateQueries({ queryKey: ['studentModulesProgress'] });
        queryClient.invalidateQueries({ queryKey: ['studentProgressMap'] });
    };

    const refreshContent = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['allStudentModules'] }),
            queryClient.invalidateQueries({ queryKey: ['studentProgressMap'] }),
            queryClient.invalidateQueries({ queryKey: ['studentClasses'] })
        ]);
    };

    return {
        studentClasses, 
        inProgressModules: [], 
        searchedModules, 
        searchedQuizzes, 
        userSubmissions, 
        moduleFilters,
        isLoading: isLoadingClasses || isSearchingModules, 
        isSearchingQuizzes, 
        isSearchingModules,
        refreshContent,
        searchModules, searchQuizzes, searchActivities: async () => ({ activities: [], lastDoc: null }),
        handleActivitySubmit, handleJoinClass, handleLeaveClass, handleModuleProgressUpdate, handleModuleComplete,
        setSearchedQuizzes, setSearchedModules
    };
}
