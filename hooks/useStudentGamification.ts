
import { useState, useEffect, useCallback } from 'react';
import type { Achievement, UserStats, UserAchievementsDoc } from '../types';
import { fetchGlobalAchievements, fetchUserAchievementsDoc } from '../utils/achievements';
import { doc, getDoc, serverTimestamp, increment, setDoc } from 'firebase/firestore';
import { db } from '../components/firebaseClient';
import { useToast } from '../contexts/ToastContext';
// Removida importação do processGamificationEvent pois não processamos mais no client do aluno

export function useStudentGamification(user: any) {
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [userStats, setUserStats] = useState<UserStats>({ xp: 0, level: 1, xpForNextLevel: 100, levelName: 'Iniciante' });
    const { addToast } = useToast();

    const loadGamificationData = useCallback(async () => {
        if (!user) return;
        
        const [globalAchievements, userAchievementsDoc] = await Promise.all([
            fetchGlobalAchievements(),
            fetchUserAchievementsDoc(user.id)
        ]);

        const mergedAchievements = globalAchievements.map(ach => {
            const userUnlockData = userAchievementsDoc.unlocked[ach.id];
            return {
                ...ach,
                unlocked: !!userUnlockData,
                date: userUnlockData ? new Date(userUnlockData.date).toLocaleDateString('pt-BR') : ''
            } as Achievement;
        });
        setAchievements(mergedAchievements);

        const fetchedStats: UserStats = {
            xp: userAchievementsDoc.xp,
            level: userAchievementsDoc.level,
            xpForNextLevel: 100,
            levelName: userAchievementsDoc.level < 5 ? 'Iniciante' : 'Estudante'
        };
        setUserStats(fetchedStats);
    }, [user]);

    // Trigger load on mount
    useEffect(() => {
        if (user) {
            loadGamificationData();
        }
    }, [user, loadGamificationData]);

    const handleQuizCompleteLogic = async (quizId: string, title: string, score: number, total: number, answers?: Record<string, string>) => {
        if (!user) return 0;

        try {
            const resultRef = doc(db, 'users', user.id, 'quiz_results', quizId);
            
            // SECURITY: Não calculamos XP aqui. Apenas salvamos o estado "Pendente".
            // O servidor/Professor validará as respostas e atribuirá o XP posteriormente.
            const resultData = {
                quizId,
                title,
                status: 'Aguardando Correção',
                totalQuestions: total,
                answers: answers || {},
                submittedAt: serverTimestamp(),
                // Não enviamos 'score' nem 'xpEarned' aqui para não violar as regras de segurança
            };

            await setDoc(resultRef, resultData, { merge: true });

            // Feedback visual apenas de envio
            addToast(`Quiz enviado! Aguarde a correção para receber seu XP.`, 'info');

            return 0; // Retorna 0 XP localmente

        } catch (error) {
            console.error("Erro ao salvar quiz:", error);
            addToast("Erro ao enviar respostas. Tente novamente.", "error");
            return 0;
        }
    };

    return {
        achievements,
        userStats,
        loadGamificationData,
        handleQuizCompleteLogic,
        setUserStats
    };
}
