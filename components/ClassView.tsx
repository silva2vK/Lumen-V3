
import React, { useState, useMemo, useEffect } from 'react';
import { useTeacherClassContext } from '../contexts/TeacherClassContext';
import { useTeacherAcademicContext } from '../contexts/TeacherAcademicContext';
import { useNavigation } from '../contexts/NavigationContext';
import { Card } from './common/Card';
import { ICONS, SpinnerIcon } from '../constants/index';
import type { AttendanceSession, AttendanceRecord, AttendanceStatus, Turno, Student, Module, Activity } from '../types';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseClient';
import { useToast } from '../contexts/ToastContext';

const AttendanceStudentItem: React.FC<{ 
    record: AttendanceRecord; 
    canEdit: boolean; 
    isUpdating: boolean; 
    onUpdateStatus: (status: AttendanceStatus) => void;
    avatarUrl?: string;
}> = ({ record, canEdit, isUpdating, onUpdateStatus, avatarUrl }) => {
    const statusColor = {
        presente: 'bg-green-500',
        ausente: 'bg-red-500',
        pendente: 'bg-slate-500'
    };

    return (
        <div className="flex items-center justify-between p-3 rounded-lg bg-[#0d1117] border border-white/10 hover:border-white/20 transition-colors">
            <div className="flex items-center gap-3">
                {avatarUrl ? (
                    <img src={avatarUrl} alt={record.studentName} className="w-8 h-8 rounded-full object-cover border border-white/10 bg-slate-800" />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white">
                        {record.studentName.charAt(0)}
                    </div>
                )}
                <span className="text-slate-200 font-medium">{record.studentName}</span>
            </div>
            <div className="flex gap-2">
                {canEdit ? (
                    <>
                        <button 
                            disabled={isUpdating}
                            onClick={() => onUpdateStatus('presente')}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all ${record.status === 'presente' ? 'bg-green-600 text-white shadow-sm' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                        >
                            P
                        </button>
                        <button 
                            disabled={isUpdating}
                            onClick={() => onUpdateStatus('ausente')}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all ${record.status === 'ausente' ? 'bg-red-600 text-white shadow-sm' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                        >
                            A
                        </button>
                    </>
                ) : (
                    <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold text-white ${statusColor[record.status]}`}>
                        {record.status}
                    </span>
                )}
            </div>
        </div>
    );
};

const AttendanceSessionView: React.FC<{ 
    session: AttendanceSession; 
    onUpdateStatus: (sessionId: string, recordId: string, status: AttendanceStatus) => Promise<void>;
    canEdit: boolean;
    students: Student[];
}> = ({ session, onUpdateStatus: handleUpdate, canEdit, students }) => {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const avatarMap = useMemo(() => {
        const map: Record<string, string> = {};
        students.forEach(s => {
            if (s.avatarUrl) map[s.id] = s.avatarUrl;
        });
        return map;
    }, [students]);

    useEffect(() => {
        const fetchRecords = async () => {
            setLoading(true);
            try {
                const q = collection(db, "attendance_sessions", session.id, "records");
                const snap = await getDocs(q);
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
                setRecords(data.sort((a, b) => a.studentName.localeCompare(b.studentName)));
            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        fetchRecords();
    }, [session.id]);

    const stats = useMemo(() => ({
        present: records.filter(r => r.status === 'presente').length,
        absent: records.filter(r => r.status === 'ausente').length,
        pending: records.filter(r => r.status === 'pendente').length
    }), [records]);

    const onUpdateStatus = async (recordId: string, status: AttendanceStatus) => {
        setUpdatingId(recordId);
        await handleUpdate(session.id, recordId, status);
        setRecords(prev => prev.map(r => r.id === recordId ? { ...r, status } : r));
        setUpdatingId(null);
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#0d1117] p-3 rounded-lg border border-green-500/20 text-center">
                    <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Presentes</p>
                    <p className="text-2xl font-bold text-white">{stats.present}</p>
                </div>
                <div className="bg-[#0d1117] p-3 rounded-lg border border-red-500/20 text-center">
                    <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Ausentes</p>
                    <p className="text-2xl font-bold text-white">{stats.absent}</p>
                </div>
                 <div className="bg-[#0d1117] p-3 rounded-lg border border-white/10 text-center">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Pendentes</p>
                    <p className="text-2xl font-bold text-white">{stats.pending}</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10"><SpinnerIcon className="h-8 w-8 text-brand mx-auto" /></div>
            ) : records.length === 0 ? (
                <div className="text-center py-10 border border-white/10 rounded-lg">
                    <p className="text-slate-500 text-sm">Nenhum aluno nesta lista.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                    {records.map(record => (
                        <AttendanceStudentItem
                            key={record.id}
                            record={record}
                            canEdit={canEdit}
                            isUpdating={updatingId === record.id}
                            onUpdateStatus={(status) => onUpdateStatus(record.id, status)}
                            avatarUrl={avatarMap[record.studentId]}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const SessionList: React.FC<{ sessions: AttendanceSession[], onSelectSession: (session: AttendanceSession) => void }> = ({ sessions, onSelectSession }) => {
    const groupedSessions = useMemo(() => {
        const grouped: Record<string, AttendanceSession[]> = {};
        sessions.forEach(session => {
            if (!grouped[session.date]) grouped[session.date] = [];
            grouped[session.date].push(session);
        });
        return grouped;
    }, [sessions]);
    
    const sortedDates = useMemo(() => Object.keys(groupedSessions).sort((a, b) => b.localeCompare(a)), [groupedSessions]);

    if (sessions.length === 0) {
        return (
             <div className="text-center py-12 border border-white/10 rounded-xl bg-white/5">
                <p className="text-slate-500">Nenhum registro de chamada.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2 mt-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {sortedDates.map((date) => (
                <div key={date} className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-500 sticky top-0 bg-[#0d1117] py-1 border-b border-white/5">{new Date(date).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}</h4>
                    {groupedSessions[date].map(session => (
                        <button
                            key={session.id}
                            onClick={() => onSelectSession(session)}
                            className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 flex justify-between items-center transition-all group"
                        >
                            <span className="text-sm font-mono text-slate-300">{session.horario}º Horário ({session.turno})</span>
                            <span className="text-xs text-brand opacity-0 group-hover:opacity-100 transition-opacity">Abrir &rarr;</span>
                        </button>
                    ))}
                </div>
            ))}
        </div>
    );
};

const ClassModulesList: React.FC<{ classId: string; loading: boolean }> = ({ classId, loading }) => {
    const { modules, handleDeleteModule } = useTeacherAcademicContext();
    const { startEditingModule } = useNavigation();

    const classModules = useMemo(() => {
        return modules.filter(m => m.classIds?.includes(classId));
    }, [modules, classId]);

    const handleDelete = (moduleId: string) => {
        if(window.confirm("Tem certeza que deseja excluir este módulo desta turma?")) {
            handleDeleteModule(classId, moduleId);
        }
    };

    if (loading && classModules.length === 0) {
        return <div className="text-center py-20"><SpinnerIcon className="h-8 w-8 mx-auto text-brand" /></div>;
    }

    if (classModules.length === 0) {
        return (
            <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-xl">
                <p className="text-slate-500">Nenhum módulo publicado para esta turma.</p>
                <p className="text-xs text-slate-600 mt-2">Vá em "Meus Rascunhos" ou crie um novo módulo para publicar aqui.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classModules.map(module => (
                <div key={module.id} className="group relative bg-[#0d1117] border border-white/10 rounded-xl overflow-hidden shadow-lg transition-all hover:border-white/30">
                    <div className="h-32 relative bg-slate-900">
                        {module.coverImageUrl ? (
                            <img src={module.coverImageUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-white/5 text-slate-700">
                                {ICONS.modules}
                            </div>
                        )}
                        <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded text-[10px] font-bold text-white border border-white/10">
                            {module.status}
                        </div>
                    </div>
                    <div className="p-4">
                        <h3 className="text-white font-bold truncate mb-1">{module.title}</h3>
                        <p className="text-xs text-slate-500 line-clamp-2 mb-4">{module.description || 'Sem descrição.'}</p>
                        
                        <div className="flex justify-end gap-2 border-t border-white/5 pt-3">
                            <button 
                                onClick={() => startEditingModule(module)}
                                className="px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition-colors"
                            >
                                Editar
                            </button>
                            <button 
                                onClick={() => handleDelete(module.id)}
                                className="px-3 py-1.5 bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg text-xs font-bold hover:bg-red-600 hover:text-white transition-colors"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

// NEW: Activities List Component
const ClassActivitiesList: React.FC<{ classId: string; className: string; }> = ({ classId, className }) => {
    const { teacherClasses } = useTeacherClassContext();
    const { startGrading } = useNavigation();
    
    // Find current class to get preloaded activities
    const currentClass = teacherClasses.find(c => c.id === classId);
    const activities = currentClass?.activities || [];

    if (!activities || activities.length === 0) {
        return (
            <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-xl">
                <p className="text-slate-500">Nenhuma atividade publicada para esta turma.</p>
                <p className="text-xs text-slate-600 mt-2">Use o "Banco de Questões" para criar ou distribuir atividades.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map(activity => (
                <div key={activity.id} className="group bg-[#0d1117] border border-white/10 rounded-xl p-5 hover:border-brand/50 transition-all shadow-lg flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-bold uppercase px-2 py-1 rounded border text-blue-400 bg-blue-900/30 border-blue-500/50">
                            {activity.type}
                        </span>
                        <span className="text-xs font-mono text-slate-500 bg-black/40 px-2 py-1 rounded">
                            {activity.points} XP
                        </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-brand transition-colors line-clamp-2">
                        {activity.title}
                    </h3>
                    
                    <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-center">
                        <div className="text-xs text-slate-500">
                            <span className="block font-bold text-white">{activity.pendingSubmissionCount || 0}</span>
                            Pendentes
                        </div>
                        <button 
                            onClick={() => startGrading(activity)}
                            className="text-xs font-bold text-black bg-brand px-3 py-1.5 rounded-lg hover:bg-white transition-colors"
                        >
                            Corrigir
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

const ClassView: React.FC = () => {
    const { activeClass, exitClass } = useNavigation();
    const { fetchClassDetails, attendanceSessionsByClass, handleCreateAttendanceSession, handleUpdateAttendanceStatus, handleArchiveClass } = useTeacherClassContext();
    const { fetchModulesLibrary, isLoadingContent } = useTeacherAcademicContext();
    const { addToast } = useToast();

    const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'content'>('overview');
    const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
    
    // New Attendance Form
    const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
    const [newTurno, setNewTurno] = useState<Turno>('matutino');
    const [newHorario, setNewHorario] = useState(1);
    const [isCreating, setIsCreating] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);

    useEffect(() => {
        if (activeClass?.id) fetchClassDetails(activeClass.id);
    }, [activeClass?.id, fetchClassDetails]);

    // Dispara o fetch de módulos quando a aba de conteúdo é aberta para garantir dados frescos
    useEffect(() => {
        if (activeTab === 'content') {
            fetchModulesLibrary();
        }
    }, [activeTab, fetchModulesLibrary]);

    if (!activeClass) return null;

    const sessions = attendanceSessionsByClass[activeClass.id] || [];

    const handleCreateSession = async () => {
        setIsCreating(true);
        try {
            await handleCreateAttendanceSession(activeClass.id, newDate, newTurno, newHorario);
        } finally {
            setIsCreating(false);
        }
    };

    const onArchive = async () => {
        const confirmText = `Tem certeza que deseja concluir a turma "${activeClass.name}"?\n\nEla será movida para a aba "Concluídas" e não aparecerá mais na lista principal.`;
        if (window.confirm(confirmText)) {
            setIsArchiving(true);
            try {
                await handleArchiveClass(activeClass.id);
                // exitClass é chamado após o sucesso para voltar ao dashboard
                exitClass();
            } catch (error: any) {
                console.error("Erro ao arquivar:", error);
                addToast("Erro ao arquivar turma. Tente novamente.", "error");
                setIsArchiving(false);
            }
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-4">
                <div>
                    <button onClick={exitClass} className="text-xs font-bold text-slate-500 hover:text-white uppercase mb-1 tracking-wider">&larr; Voltar</button>
                    <h1 className="text-3xl font-bold text-white">{activeClass.name}</h1>
                    <p className="text-slate-400 text-sm font-mono">{activeClass.code}</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex bg-[#0d1117] p-1 rounded-lg border border-white/10">
                        <button onClick={() => { setActiveTab('overview'); setSelectedSession(null); }} className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'overview' ? 'bg-white text-black shadow-sm' : 'text-slate-400 hover:text-white'}`}>Visão Geral</button>
                        <button onClick={() => { setActiveTab('attendance'); setSelectedSession(null); }} className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'attendance' ? 'bg-white text-black shadow-sm' : 'text-slate-400 hover:text-white'}`}>Frequência</button>
                        <button onClick={() => { setActiveTab('content'); setSelectedSession(null); }} className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'content' ? 'bg-white text-black shadow-sm' : 'text-slate-400 hover:text-white'}`}>Conteúdo</button>
                    </div>
                    <button 
                        onClick={onArchive} 
                        disabled={isArchiving}
                        className="px-4 py-2 bg-red-900/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-900/40 transition-colors uppercase tracking-wider disabled:opacity-50 ml-2 flex items-center"
                    >
                        {isArchiving && <SpinnerIcon className="h-3 w-3 mr-2" />}
                        {isArchiving ? 'Arquivando...' : 'Concluir Turma'}
                    </button>
                </div>
            </div>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <h3 className="text-lg font-bold text-white mb-4">Estudantes</h3>
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            {activeClass.students?.length > 0 ? (
                                activeClass.students.map(student => (
                                    <div key={student.id} className="flex items-center gap-3 p-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                        {student.avatarUrl ? (
                                            <img src={student.avatarUrl} alt={student.name} className="w-8 h-8 rounded-full object-cover border border-white/10 bg-slate-800" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white">{student.name.charAt(0)}</div>
                                        )}
                                        <span className="text-sm text-slate-300">{student.name}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-slate-500 text-sm p-4 text-center">Nenhum aluno matriculado.</p>
                            )}
                        </div>
                    </Card>
                    <div className="space-y-6">
                        <Card>
                            <h3 className="text-lg font-bold text-white mb-4">Métricas Rápidas</h3>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="bg-[#0d1117] p-4 rounded-lg border border-white/10">
                                    <p className="text-2xl font-bold text-white">{activeClass.studentCount || 0}</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Alunos</p>
                                </div>
                                <div className="bg-[#0d1117] p-4 rounded-lg border border-white/10">
                                    <p className="text-2xl font-bold text-white">{sessions.length}</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Chamadas</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {activeTab === 'content' && (
                <div className="animate-fade-in space-y-12">
                    {/* Modules Section */}
                    <div>
                        <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="text-blue-500">{ICONS.modules}</span> Módulos Publicados
                            </h3>
                        </div>
                        <ClassModulesList classId={activeClass.id} loading={isLoadingContent} />
                    </div>

                    {/* Activities Section */}
                    <div>
                        <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="text-purple-500">{ICONS.activities}</span> Atividades Distribuídas
                            </h3>
                        </div>
                        <ClassActivitiesList classId={activeClass.id} className={activeClass.name} />
                    </div>
                </div>
            )}

            {activeTab === 'attendance' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Nova Chamada</h3>
                            <div className="space-y-3">
                                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full p-2 bg-[#0d1117] border border-slate-700 rounded text-white text-sm" />
                                <div className="flex gap-2">
                                    <select value={newTurno} onChange={e => setNewTurno(e.target.value as Turno)} className="flex-1 p-2 bg-[#0d1117] border border-slate-700 rounded text-white text-sm">
                                        <option value="matutino">Matutino</option>
                                        <option value="vespertino">Vespertino</option>
                                        <option value="noturno">Noturno</option>
                                    </select>
                                    <input type="number" min="1" max="6" value={newHorario} onChange={e => setNewHorario(Number(e.target.value))} className="w-16 p-2 bg-[#0d1117] border border-slate-700 rounded text-white text-sm" />
                                </div>
                                <button 
                                    onClick={handleCreateSession} 
                                    disabled={isCreating}
                                    className="w-full py-2 bg-brand text-black font-bold rounded hover:bg-brand/90 transition-colors text-sm disabled:opacity-50"
                                >
                                    {isCreating ? 'Criando...' : 'Iniciar Chamada'}
                                </button>
                            </div>
                        </Card>
                        
                        <Card className="flex-1 overflow-hidden flex flex-col">
                            <h3 className="text-sm font-bold text-slate-400 uppercase mb-2">Histórico</h3>
                            <SessionList sessions={sessions} onSelectSession={setSelectedSession} />
                        </Card>
                    </div>

                    <div className="lg:col-span-2">
                        {selectedSession ? (
                            <Card className="h-full">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Registro de Presença</h3>
                                        <p className="text-slate-400 text-sm font-mono">{new Date(selectedSession.date).toLocaleDateString()} • {selectedSession.horario}º Horário</p>
                                    </div>
                                    <button onClick={() => setSelectedSession(null)} className="text-xs text-slate-500 hover:text-white">Fechar</button>
                                </div>
                                <AttendanceSessionView 
                                    session={selectedSession} 
                                    onUpdateStatus={handleUpdateAttendanceStatus}
                                    canEdit={true} 
                                    students={activeClass.students || []}
                                />
                            </Card>
                        ) : (
                            <div className="h-full flex items-center justify-center border-2 border-dashed border-white/10 rounded-2xl p-10 text-center">
                                <div>
                                    <div className="text-4xl mb-4 opacity-50">📅</div>
                                    <p className="text-slate-400 font-bold">Selecione uma chamada</p>
                                    <p className="text-slate-600 text-sm mt-1">Escolha uma data ao lado ou inicie uma nova.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassView;
