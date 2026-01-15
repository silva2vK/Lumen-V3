
import React, { useState, useCallback, useEffect } from 'react';
import { 
    collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, 
    serverTimestamp, increment, setDoc, writeBatch, Timestamp, getDoc, arrayRemove
} from 'firebase/firestore';
import { db } from '../../components/firebaseClient';
import type { Module, Activity, TeacherClass, Unidade, StudentGradeSummaryDoc } from '../../types';
import { createNotification } from '../../utils/createNotification';
import { recalculateStudentGradeSummary } from '../../utils/gradingUtils';
import { getGamificationConfig } from '../../utils/gamificationConfig';
import { processGamificationEvent } from '../../utils/gamificationEngine';

// Helper to remove undefined keys from objects recursively before sending to Firestore
const cleanPayload = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(v => cleanPayload(v));
    }

    if (obj instanceof Date) return obj;

    // Preserve Firestore Sentinels/Timestamps if they slip in (best effort)
    if (obj.constructor && obj.constructor.name === 'FieldValue') return obj;
    if (typeof obj.toMillis === 'function') return obj; // Timestamp

    const newObj: any = {};
    Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (value !== undefined) {
            newObj[key] = cleanPayload(value);
        }
    });
    return newObj;
};

export function useTeacherContent(
    user: any, 
    addToast: (msg: string, type: any) => void,
    setTeacherClasses: React.Dispatch<React.SetStateAction<TeacherClass[]>>,
    teacherClasses: TeacherClass[]
) {
    const [modules, setModules] = useState<Module[]>([]);
    const [draftActivities, setDraftActivities] = useState<Activity[]>([]);
    const [draftModules, setDraftModules] = useState<Module[]>([]);
    const [isLoadingContent, setIsLoadingContent] = useState(true);
    const [isSubmittingContent, setIsSubmittingContent] = useState(false);
    const [modulesLibraryLoaded, setModulesLibraryLoaded] = useState(false);

    const fetchTeacherContent = useCallback(async (forceRefresh = false) => {
        if (!user) return;
        setIsLoadingContent(true);

        const fetchDraftActivities = async () => {
            try {
                const qDrafts = query(
                    collection(db, "activities"),
                    where("creatorId", "==", user.id),
                    where("status", "==", "Rascunho")
                );
                let snapDrafts;
                if (!forceRefresh) try { snapDrafts = await getDocs(qDrafts); } catch {}
                if (!snapDrafts || snapDrafts.empty) snapDrafts = await getDocs(qDrafts);

                const drafts = snapDrafts.docs.map(d => ({ 
                    id: d.id, ...d.data(), 
                    createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate().toISOString() : d.data().createdAt
                } as Activity));
                setDraftActivities(drafts);
            } catch (error: any) {
                console.warn("Falha parcial ao carregar rascunhos de atividades:", error);
            }
        };

        const fetchDraftModules = async () => {
            try {
                const qDraftModules = query(
                    collection(db, "modules"),
                    where("creatorId", "==", user.id),
                    where("status", "==", "Rascunho")
                );
                let snapDraftModules;
                if (!forceRefresh) try { snapDraftModules = await getDocs(qDraftModules); } catch {}
                if (!snapDraftModules || snapDraftModules.empty) snapDraftModules = await getDocs(qDraftModules);

                const draftsMod = snapDraftModules.docs.map(d => ({
                    id: d.id, ...d.data(),
                    date: d.data().date?.toDate ? d.data().date.toDate().toISOString() : d.data().date
                } as Module));
                setDraftModules(draftsMod);
            } catch (error: any) {
                console.warn("Falha parcial ao carregar rascunhos de módulos:", error);
            }
        };

        await Promise.allSettled([fetchDraftActivities(), fetchDraftModules()]);
        setIsLoadingContent(false);

    }, [user, addToast]);

    useEffect(() => {
        if (user) {
            fetchTeacherContent();
        }
    }, [user, fetchTeacherContent]);

    const fetchModulesLibrary = useCallback(async () => {
        if (modulesLibraryLoaded || !user) return;
        try {
            const snapModules = await getDocs(query(collection(db, "modules"), where("status", "==", "Ativo")));
            const fetchedModules = snapModules.docs.map(d => ({ id: d.id, ...d.data() } as Module));
            
            const visibleModules = fetchedModules.filter(m => 
                m.visibility === 'public' || m.creatorId === user.id
            );
            setModules(visibleModules);
            setModulesLibraryLoaded(true);
        } catch (error) {
            console.error("Error loading modules library:", error);
            setModules([]);
        }
    }, [modulesLibraryLoaded, user]);

    // --- Actions ---

    const handleSaveActivity = useCallback(async (activity: Omit<Activity, 'id'>, isDraft: boolean = false) => {
        if (!user) return false;
        try {
            const status = isDraft ? "Rascunho" : "Pendente";
            // Clean user input first
            const cleanedActivity = cleanPayload(activity);
            
            const payload = { 
                ...cleanedActivity, 
                creatorId: user.id,
                creatorName: user.name,
                status, 
                pendingSubmissionCount: 0, 
                submissionCount: 0, 
                createdAt: serverTimestamp() 
            };

            const docRef = await addDoc(collection(db, "activities"), payload);
            
            if (isDraft) {
                const newDraft = { id: docRef.id, ...cleanedActivity, status, pendingSubmissionCount: 0, submissionCount: 0, submissions: [], createdAt: new Date().toISOString() } as Activity;
                setDraftActivities(prev => [newDraft, ...prev]);
                addToast("Atividade salva como rascunho!", "success");
                return true;
            }

            if (activity.classId) {
                const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 30);
                await addDoc(collection(db, "broadcasts"), {
                    classId: activity.classId, type: 'activity_post', title: 'Nova Atividade',
                    summary: `O professor ${user.name} postou uma nova atividade: "${activity.title}"`,
                    authorName: user.name, timestamp: serverTimestamp(), expiresAt: Timestamp.fromDate(expiresAt),
                    deepLink: { page: 'activities' }
                });
            }
            addToast("Atividade publicada com sucesso!", "success");
            fetchTeacherContent(true);
            return true;
        } catch (error) { console.error(error); addToast("Erro ao criar atividade.", "error"); return false; }
    }, [user, addToast, fetchTeacherContent]);

    const handleUpdateActivity = useCallback(async (activityId: string, activityData: Partial<Activity>, isDraft: boolean = false) => {
        if (!user) return false;
        try {
            const activityRef = doc(db, "activities", activityId);
            
            // LOGIC FOR PUBLISHING A DRAFT (TEMPLATE BEHAVIOR)
            if (!isDraft) {
                const snap = await getDoc(activityRef);
                if (snap.exists() && snap.data().status === 'Rascunho') {
                    // 1. Update the original draft with the new content (keep it as Draft and Unlinked)
                    const cleanedData = cleanPayload(activityData);
                    const draftUpdatePayload = { 
                        ...cleanedData, 
                        status: 'Rascunho',
                        classId: null, // Drafts should not be linked to specific classes
                        className: null
                    };
                    await updateDoc(activityRef, draftUpdatePayload);
                    setDraftActivities(prev => prev.map(a => a.id === activityId ? { ...a, ...draftUpdatePayload } : a));

                    // 2. Create the NEW Published Copy
                    const publishedPayload = { 
                        ...snap.data(), // old data
                        ...cleanedData, // new edits
                        creatorId: user.id,
                        creatorName: user.name,
                        status: 'Pendente', 
                        submissionCount: 0,
                        pendingSubmissionCount: 0,
                        createdAt: serverTimestamp(),
                        originalDraftId: activityId 
                    };
                    delete publishedPayload.id; // remove id
                    
                    // Clean final payload just in case snap.data had undefineds (unlikely from DB but safe)
                    const finalPublishedPayload = cleanPayload(publishedPayload);

                    await addDoc(collection(db, "activities"), finalPublishedPayload);

                    // 3. Broadcast
                    if (activityData.classId) {
                        const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 30);
                        await addDoc(collection(db, "broadcasts"), {
                            classId: activityData.classId, type: 'activity_post', title: 'Nova Atividade',
                            summary: `O professor ${user.name} postou uma nova atividade: "${activityData.title}"`,
                            authorName: user.name, timestamp: serverTimestamp(), expiresAt: Timestamp.fromDate(expiresAt),
                            deepLink: { page: 'activities' }
                        });
                    }

                    addToast("Atividade publicada! (Rascunho mantido)", "success");
                    return true;
                }
            }

            // STANDARD UPDATE (Draft -> Draft OR Published -> Published edit)
            const status = isDraft ? "Rascunho" : "Pendente";
            const cleanedData = cleanPayload(activityData);
            const payload = { ...cleanedData, status, ...(isDraft ? {} : { createdAt: serverTimestamp() }) };
            
            await updateDoc(activityRef, payload);

            if (isDraft) {
                setDraftActivities(prev => prev.map(a => a.id === activityId ? { ...a, ...cleanedData, status } : a));
                addToast("Rascunho atualizado!", "success");
                return true;
            }

            if (activityData.classId) {
                setDraftActivities(prev => prev.filter(a => a.id !== activityId));
            }
            addToast("Atividade atualizada com sucesso!", "success");
            fetchTeacherContent(true);
            return true;
        } catch (error) { console.error(error); addToast("Erro ao atualizar atividade.", "error"); return false; }
    }, [user, addToast, fetchTeacherContent]);

    const handlePublishDraft = useCallback(async (activityId: string, updateData: { classId: string, className: string, dueDate: string, points: number }) => {
        if (!user) return false;
        try {
            const draftRef = doc(db, "activities", activityId);
            const draftSnap = await getDoc(draftRef);
            
            if (!draftSnap.exists()) {
                addToast("Rascunho não encontrado.", "error");
                return false;
            }

            const draftData = draftSnap.data();
            const { id, ...rest } = draftData as any;

            const newActivityPayload = cleanPayload({
                ...rest,
                classId: updateData.classId,
                className: updateData.className,
                dueDate: updateData.dueDate,
                points: updateData.points,
                status: 'Pendente',
                submissionCount: 0,
                pendingSubmissionCount: 0,
                createdAt: serverTimestamp(),
                originalDraftId: activityId 
            });

            await addDoc(collection(db, "activities"), newActivityPayload);

            const expiresAt = new Date(); 
            expiresAt.setDate(expiresAt.getDate() + 30);
            
            await addDoc(collection(db, "broadcasts"), {
                classId: updateData.classId, 
                type: 'activity_post', 
                title: 'Nova Atividade',
                summary: `O professor ${user.name} postou uma nova atividade: "${newActivityPayload.title}"`,
                authorName: user.name, 
                timestamp: serverTimestamp(), 
                expiresAt: Timestamp.fromDate(expiresAt),
                deepLink: { page: 'activities' }
            });

            addToast("Atividade publicada com sucesso! (Rascunho mantido)", "success");
            fetchTeacherContent(true);
            return true;

        } catch (error: any) {
            console.error("Error publishing draft:", error);
            addToast(`Erro ao publicar: ${error.message}`, "error");
            return false;
        }
    }, [user, addToast, fetchTeacherContent]);

    const handleDeleteActivity = useCallback(async (activityId: string) => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, "activities", activityId));
            setDraftActivities(prev => prev.filter(a => a.id !== activityId));
            
            setTeacherClasses(prev => prev.map(c => ({
                ...c,
                activities: c.activities.filter(a => a.id !== activityId)
            })));
            addToast("Atividade excluída.", "success");
        } catch (error: any) { console.error(error); addToast("Erro ao excluir atividade.", "error"); }
    }, [user, addToast, setTeacherClasses]);

    const handleDeleteModule = useCallback(async (classId: string, moduleId: string) => {
        if (!user) return;
        try {
            // CENÁRIO 1: Remover de uma turma específica (Despublicar)
            if (classId && classId !== 'draft' && classId.length > 5) {
                const moduleRef = doc(db, "modules", moduleId);
                
                await updateDoc(moduleRef, {
                    classIds: arrayRemove(classId)
                });

                setModules(prev => prev.map(m => {
                    if (m.id === moduleId) {
                        const newClassIds = (m.classIds || []).filter(id => id !== classId);
                        return { ...m, classIds: newClassIds };
                    }
                    return m;
                }));

                setTeacherClasses(prev => prev.map(cls => {
                    if (cls.id === classId) {
                        return {
                            ...cls,
                            modules: (cls.modules || []).filter(m => m.id !== moduleId),
                            moduleCount: Math.max((cls.moduleCount || 1) - 1, 0)
                        };
                    }
                    return cls;
                }));

                addToast("Módulo removido da turma.", "success");
            } 
            // CENÁRIO 2: Exclusão Permanente (Deletar do Banco)
            else {
                await deleteDoc(doc(db, "modules", moduleId));
                await deleteDoc(doc(db, "module_contents", moduleId));

                setModules(prev => prev.filter(m => m.id !== moduleId));
                setDraftModules(prev => prev.filter(m => m.id !== moduleId));
                
                setTeacherClasses(prev => prev.map(cls => ({
                    ...cls,
                    modules: (cls.modules || []).filter(m => m.id !== moduleId),
                    moduleCount: (cls.modules || []).some(m => m.id === moduleId) ? Math.max((cls.moduleCount || 1) - 1, 0) : cls.moduleCount
                })));
                addToast("Módulo excluído permanentemente!", "success");
            }
        } catch (error: any) { 
            console.error(error); 
            addToast("Erro ao excluir/remover módulo.", "error"); 
        }
    }, [user, addToast, setTeacherClasses]);

    const handleSaveModule = useCallback(async (module: Omit<Module, 'id'>, isDraft: boolean = false) => {
        if (!user) return false;
        try {
            const { pages, ...metadata } = module;
            const status = isDraft ? "Rascunho" : "Ativo";
            
            // Clean metadata before saving
            const cleanedMetadata = cleanPayload(metadata);
            // Clean content pages as well
            const cleanedPages = cleanPayload(pages);

            const payload = { 
                ...cleanedMetadata, 
                status, 
                createdAt: serverTimestamp(),
                pageCount: cleanedPages ? cleanedPages.length : 0
            };

            const docRef = await addDoc(collection(db, "modules"), payload);
            await setDoc(doc(db, "module_contents", docRef.id), { pages: cleanedPages });

            if (isDraft) {
                const newDraft = { id: docRef.id, ...cleanedMetadata, status } as Module;
                setDraftModules(prev => [newDraft, ...prev]);
                addToast("Módulo salvo como rascunho!", "success");
                setModulesLibraryLoaded(false);
                return true;
            }

            if (metadata.visibility === 'specific_class' && metadata.classIds && metadata.classIds.length > 0) {
                const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 30);
                const batch = writeBatch(db);
                metadata.classIds.forEach(classId => {
                    const broadcastRef = doc(collection(db, "broadcasts"));
                    batch.set(broadcastRef, {
                        classId, type: 'module_post', title: 'Novo Módulo',
                        summary: `O professor ${user.name} publicou um novo módulo: "${metadata.title}"`,
                        authorName: user.name, timestamp: serverTimestamp(), expiresAt: Timestamp.fromDate(expiresAt),
                        deepLink: { page: 'modules', id: docRef.id }
                    });
                });
                await batch.commit();
            }
            addToast("Módulo criado!", "success");
            setModulesLibraryLoaded(false);
            return true;
        } catch (error) { console.error(error); addToast("Erro ao salvar.", "error"); return false; }
    }, [user, addToast]);

    const handleUpdateModule = useCallback(async (module: Module, isDraft: boolean = false) => {
        try {
            const { id, pages, ...data } = module;
            const status = isDraft ? "Rascunho" : "Ativo";
            
            const cleanedData = cleanPayload(data);
            const cleanedPages = pages ? cleanPayload(pages) : undefined;

            const updatePayload: any = { 
                ...cleanedData, 
                status, 
                ...(isDraft ? {} : { createdAt: serverTimestamp() }) 
            };
            
            if (cleanedPages) {
                updatePayload.pageCount = cleanedPages.length;
            }

            await updateDoc(doc(db, "modules", id), updatePayload);
            if (cleanedPages) await setDoc(doc(db, "module_contents", id), { pages: cleanedPages }, { merge: true });

            if (isDraft) {
                setDraftModules(prev => prev.map(m => m.id === id ? { ...m, ...cleanedData, status } : m));
                addToast("Rascunho atualizado!", "success");
            } else {
                addToast("Módulo atualizado e publicado!", "success");
                setDraftModules(prev => prev.filter(m => m.id !== id));
                setModules(prev => prev.map(m => m.id === id ? module : m));
            }
        } catch (error) { console.error(error); addToast("Erro ao atualizar.", "error"); }
    }, [addToast]);

    const handlePublishModuleDraft = useCallback(async (moduleId: string, classIds: string[]) => {
        if (!user) return false;
        try {
            const draftRef = doc(db, "modules", moduleId);
            const draftSnap = await getDoc(draftRef);
            if (!draftSnap.exists()) return false;
            
            const draftData = draftSnap.data();

            const contentRef = doc(db, "module_contents", moduleId);
            const contentSnap = await getDoc(contentRef);
            const pages = contentSnap.exists() ? contentSnap.data().pages : [];

            const { id, ...metadata } = draftData as any;
            
            const cleanedMetadata = cleanPayload(metadata);
            const cleanedPages = cleanPayload(pages);

            const newModulePayload = {
                ...cleanedMetadata,
                status: "Ativo",
                visibility: 'specific_class',
                classIds: classIds, 
                createdAt: serverTimestamp(),
                originalDraftId: moduleId, 
                pageCount: cleanedPages ? cleanedPages.length : 0
            };

            const newModuleRef = await addDoc(collection(db, "modules"), newModulePayload);

            await setDoc(doc(db, "module_contents", newModuleRef.id), { pages: cleanedPages });

            const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 30);
            const batch = writeBatch(db);
            
            classIds.forEach(classId => {
                const broadcastRef = doc(collection(db, "broadcasts"));
                batch.set(broadcastRef, {
                    classId, type: 'module_post', title: 'Novo Módulo',
                    summary: `O professor ${user.name} publicou um novo módulo: "${metadata.title}"`,
                    authorName: user.name, timestamp: serverTimestamp(), expiresAt: Timestamp.fromDate(expiresAt),
                    deepLink: { page: 'modules', id: newModuleRef.id }
                });
            });
            await batch.commit();

            addToast("Módulo publicado com sucesso! (Rascunho mantido)", "success");
            
            setModulesLibraryLoaded(false);
            fetchModulesLibrary();
            
            return true;
        } catch (error: any) { 
            console.error("Error publishing module:", error); 
            addToast(`Erro ao publicar módulo: ${error.message}`, "error"); 
            return false; 
        }
    }, [user, addToast, fetchModulesLibrary]);

    return {
        modules, draftActivities, draftModules,
        isLoadingContent, isSubmittingContent,
        fetchTeacherContent, fetchModulesLibrary,
        handleSaveActivity, handleUpdateActivity, handleDeleteActivity,
        handleDeleteModule, handleSaveModule, handleUpdateModule, handlePublishModuleDraft,
        handlePublishDraft
    };
}
