
import React, { useState, useEffect, useRef } from 'react';
import { useTeacherAcademicContext } from '../contexts/TeacherAcademicContext';
import { useTeacherClassContext } from '../contexts/TeacherClassContext';
import { useNavigation } from '../contexts/NavigationContext';
import { Card } from './common/Card';
import { Modal } from './common/Modal'; // Import Modal
import { ICONS, SpinnerIcon, SUBJECTS_LIST } from '../constants/index';
import { InputField, CustomSelect } from './common/FormHelpers';
import type { Activity, Unidade, HotspotItem, ConnectionPair, TreeData, DraggableColumnItem } from '../types';

type InteractiveType = 'VisualSourceAnalysis' | 'ConceptConnection' | 'AdvanceOrganizer' | 'ProgressiveTree' | 'IntegrativeDragDrop';

const CreateInteractiveActivity: React.FC = () => {
    const { handleSaveActivity, handleUpdateActivity, isSubmittingContent } = useTeacherAcademicContext();
    const { teacherClasses } = useTeacherClassContext();
    const { editingActivity, exitEditingActivity } = useNavigation();

    // Basic Meta
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [points, setPoints] = useState(10);
    const [materia, setMateria] = useState<string>(SUBJECTS_LIST[0]);
    const [unidade, setUnidade] = useState<Unidade>('1ª Unidade');
    const [classId, setClassId] = useState('');
    const [dueDate, setDueDate] = useState('');
    
    // Type Selection
    const [selectedType, setSelectedType] = useState<InteractiveType>('VisualSourceAnalysis');

    // Modals State
    const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
    const [isClassModalOpen, setIsClassModalOpen] = useState(false);

    // Specific Data States
    // Visual Analysis
    const [visualImageUrl, setVisualImageUrl] = useState('');
    const [hotspots, setHotspots] = useState<HotspotItem[]>([]);
    const imageRef = useRef<HTMLDivElement>(null);
    
    // Concept Connection
    const [leftItems, setLeftItems] = useState<{id: string, text: string}[]>([]);
    const [rightItems, setRightItems] = useState<{id: string, text: string}[]>([]);
    const [pairs, setPairs] = useState<ConnectionPair[]>([]);

    // Advance Organizer
    const [organizerMedia, setOrganizerMedia] = useState('');
    const [organizerAnalogy, setOrganizerAnalogy] = useState('');
    const [organizerConcept, setOrganizerConcept] = useState('');
    const [organizerLinkedModule, setOrganizerLinkedModule] = useState('');

    // Progressive Tree
    const [treeRoot, setTreeRoot] = useState<TreeData>({ id: 'root', label: 'Conceito Central', content: '', children: [] });

    // Integrative Drag Drop
    const [colA, setColA] = useState('Coluna A');
    const [colB, setColB] = useState('Coluna B');
    const [dragItems, setDragItems] = useState<DraggableColumnItem[]>([]);

    // Init Edit
    useEffect(() => {
        if (editingActivity) {
            setTitle(editingActivity.title);
            setDescription(editingActivity.description);
            setPoints(editingActivity.points);
            setMateria(editingActivity.materia || SUBJECTS_LIST[0]);
            setUnidade(editingActivity.unidade as Unidade || '1ª Unidade');
            setClassId(editingActivity.classId || '');
            setDueDate(editingActivity.dueDate || '');
            
            if (editingActivity.type && ['VisualSourceAnalysis', 'ConceptConnection', 'AdvanceOrganizer', 'ProgressiveTree', 'IntegrativeDragDrop'].includes(editingActivity.type)) {
                setSelectedType(editingActivity.type as InteractiveType);
                
                if (editingActivity.visualSourceData) {
                    setVisualImageUrl(editingActivity.visualSourceData.imageUrl);
                    setHotspots(editingActivity.visualSourceData.hotspots);
                }
                if (editingActivity.conceptConnectionData) {
                    setLeftItems(editingActivity.conceptConnectionData.leftColumn);
                    setRightItems(editingActivity.conceptConnectionData.rightColumn);
                    setPairs(editingActivity.conceptConnectionData.pairs);
                }
                if (editingActivity.advanceOrganizerData) {
                    setOrganizerMedia(editingActivity.advanceOrganizerData.mediaUrl || '');
                    setOrganizerAnalogy(editingActivity.advanceOrganizerData.analogyText);
                    setOrganizerConcept(editingActivity.advanceOrganizerData.targetConcept);
                    setOrganizerLinkedModule(editingActivity.advanceOrganizerData.linkedModuleId || '');
                }
                if (editingActivity.progressiveTreeData) {
                    setTreeRoot(editingActivity.progressiveTreeData.root);
                }
                if (editingActivity.integrativeData) {
                    setColA(editingActivity.integrativeData.columnA);
                    setColB(editingActivity.integrativeData.columnB);
                    setDragItems(editingActivity.integrativeData.items);
                }
            }
        }
    }, [editingActivity]);

    // Handlers
    const addHotspot = () => setHotspots([...hotspots, { id: Date.now().toString(), x: 50, y: 50, label: 'Novo Ponto', feedback: '' }]);
    
    const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!visualImageUrl) return;
        const rect = e.currentTarget.getBoundingClientRect();
        
        // Calculate percentages
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        // Limit to 0-100 and fix decimals
        const safeX = Math.max(0, Math.min(100, Number(x.toFixed(1))));
        const safeY = Math.max(0, Math.min(100, Number(y.toFixed(1))));

        setHotspots(prev => [...prev, {
            id: Date.now().toString(),
            x: safeX,
            y: safeY,
            label: `Ponto ${prev.length + 1}`,
            feedback: ''
        }]);
    };

    const updateHotspot = (idx: number, data: Partial<HotspotItem>) => setHotspots(prev => prev.map((h, i) => i === idx ? { ...h, ...data } : h));
    const removeHotspot = (idx: number) => setHotspots(prev => prev.filter((_, i) => i !== idx));

    const addDragItem = () => setDragItems([...dragItems, { id: Date.now().toString(), content: 'Novo Item', correctColumnId: 'A' }]);
    const updateDragItem = (idx: number, data: Partial<DraggableColumnItem>) => setDragItems(prev => prev.map((it, i) => i === idx ? { ...it, ...data } : it));
    const removeDragItem = (idx: number) => setDragItems(prev => prev.filter((_, i) => i !== idx));

    const handleSave = async (isDraft: boolean) => {
        if (!title.trim()) { alert("Título é obrigatório"); return; }

        const activityData: any = {
            title, description, points, materia, unidade, classId: classId || null, dueDate,
            type: selectedType
        };

        if (classId) {
            const cls = teacherClasses.find(c => c.id === classId);
            if (cls) activityData.className = cls.name;
        }

        // Attach specific data
        switch (selectedType) {
            case 'VisualSourceAnalysis':
                activityData.visualSourceData = { imageUrl: visualImageUrl, hotspots };
                break;
            case 'ConceptConnection':
                activityData.conceptConnectionData = { leftColumn: leftItems, rightColumn: rightItems, pairs };
                break;
            case 'AdvanceOrganizer':
                activityData.advanceOrganizerData = { mediaUrl: organizerMedia, analogyText: organizerAnalogy, targetConcept: organizerConcept, linkedModuleId: organizerLinkedModule };
                break;
            case 'ProgressiveTree':
                activityData.progressiveTreeData = { root: treeRoot };
                break;
            case 'IntegrativeDragDrop':
                activityData.integrativeData = { columnA: colA, columnB: colB, items: dragItems };
                break;
        }

        let success = false;
        if (editingActivity) {
            success = await handleUpdateActivity(editingActivity.id, activityData, isDraft);
        } else {
            success = await handleSaveActivity(activityData, isDraft);
        }

        if (success) exitEditingActivity();
    };

    // Options mapping for CustomSelect (Others)
    const typeOptions = [
        { label: "Análise de Fonte Visual (Hotspots)", value: "VisualSourceAnalysis" },
        { label: "Reconciliação Integrativa (Drag & Drop)", value: "IntegrativeDragDrop" },
        { label: "Organizador Prévio (Ponte Cognitiva)", value: "AdvanceOrganizer" },
        { label: "Conexão de Conceitos (Em Breve)", value: "ConceptConnection" },
        { label: "Árvore Progressiva (Em Breve)", value: "ProgressiveTree" },
    ];

    // Helpers for Display
    const selectedClassName = classId 
        ? teacherClasses.find(c => c.id === classId)?.name || "Turma Desconhecida" 
        : "Apenas Repositório";

    return (
        <div className="max-w-4xl mx-auto pb-20 animate-fade-in space-y-6">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <h1 className="text-2xl font-bold text-white">Laboratório Interativo (Ausubel)</h1>
                <button onClick={exitEditingActivity} className="text-sm text-slate-400 hover:text-white">Cancelar</button>
            </div>

            <Card>
                <div className="space-y-4">
                    <InputField label="Tipo de Dinâmica" required>
                        <CustomSelect 
                            value={selectedType} 
                            onChange={(val) => setSelectedType(val as InteractiveType)} 
                            options={typeOptions} 
                        />
                    </InputField>

                    <InputField label="Título" required>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 bg-[#0d1117] border border-slate-700 rounded text-white" />
                    </InputField>
                    <InputField label="Descrição / Instruções">
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full p-2 bg-[#0d1117] border border-slate-700 rounded text-white" />
                    </InputField>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InputField label="Matéria">
                            <button 
                                onClick={() => setIsSubjectModalOpen(true)}
                                className="w-full p-2 bg-[#0d1117] border border-slate-700 rounded text-white text-left flex justify-between items-center hover:bg-[#161b22] transition-colors"
                            >
                                <span className="truncate">{materia}</span>
                                <span className="text-xs text-slate-500">▼</span>
                            </button>
                        </InputField>
                        <InputField label="Pontos">
                            <input type="number" value={points} onChange={e => setPoints(Number(e.target.value))} className="w-full p-2 bg-[#0d1117] border border-slate-700 rounded text-white" />
                        </InputField>
                        <InputField label="Turma (Opcional)">
                            <button 
                                onClick={() => setIsClassModalOpen(true)}
                                className="w-full p-2 bg-[#0d1117] border border-slate-700 rounded text-white text-left flex justify-between items-center hover:bg-[#161b22] transition-colors"
                            >
                                <span className="truncate">{selectedClassName}</span>
                                <span className="text-xs text-slate-500">▼</span>
                            </button>
                        </InputField>
                    </div>
                </div>
            </Card>

            {/* --- DYNAMIC FORM AREA --- */}
            
            {selectedType === 'VisualSourceAnalysis' && (
                <Card>
                    <h3 className="text-lg font-bold text-white mb-4">Configuração de Imagem e Hotspots</h3>
                    <div className="space-y-4">
                        <InputField label="URL da Imagem">
                            <input type="text" value={visualImageUrl} onChange={e => setVisualImageUrl(e.target.value)} className="w-full p-2 bg-[#0d1117] border border-slate-700 rounded text-white" placeholder="https://..." />
                        </InputField>
                        
                        {visualImageUrl && (
                            <div className="space-y-2">
                                <p className="text-xs text-brand uppercase font-bold tracking-wider">Pré-visualização Interativa (Clique para adicionar pontos)</p>
                                <div 
                                    className="relative w-full rounded-lg overflow-hidden border border-brand/30 cursor-crosshair group"
                                    onClick={handleImageClick}
                                    ref={imageRef}
                                >
                                    <img src={visualImageUrl} alt="Preview" className="w-full h-auto object-contain bg-black/50" />
                                    {/* Overlay Helper */}
                                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 pointer-events-none flex items-center justify-center transition-opacity">
                                        <span className="bg-black/80 text-white text-xs px-2 py-1 rounded">Clique para marcar</span>
                                    </div>
                                    
                                    {/* Render Existing Hotspots */}
                                    {hotspots.map((h, i) => (
                                        <div 
                                            key={h.id}
                                            className="absolute w-6 h-6 -ml-3 -mt-3 bg-brand text-black rounded-full flex items-center justify-center font-bold text-xs shadow-lg border-2 border-white pointer-events-none"
                                            style={{ left: `${h.x}%`, top: `${h.y}%` }}
                                        >
                                            {i + 1}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="border border-slate-700 rounded p-4 bg-[#0d1117]">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-slate-400">Lista de Pontos ({hotspots.length})</span>
                                <button onClick={addHotspot} className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded font-bold hover:bg-slate-700">+ Manual</button>
                            </div>
                            {hotspots.length === 0 ? (
                                <p className="text-slate-500 text-xs text-center py-4">Nenhum ponto adicionado. Clique na imagem acima.</p>
                            ) : (
                                hotspots.map((h, i) => (
                                    <div key={i} className="flex flex-col sm:flex-row gap-2 mb-3 p-3 bg-white/5 rounded border border-white/5">
                                        <div className="flex items-center gap-2 mb-2 sm:mb-0">
                                            <span className="w-5 h-5 bg-brand text-black rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">{i + 1}</span>
                                            <div className="flex flex-col">
                                                <div className="flex gap-1">
                                                    <input type="number" value={h.x} onChange={e => updateHotspot(i, { x: Number(e.target.value) })} className="w-12 p-1 bg-black border border-slate-700 text-white text-xs text-center" title="Posição X (%)" />
                                                    <input type="number" value={h.y} onChange={e => updateHotspot(i, { y: Number(e.target.value) })} className="w-12 p-1 bg-black border border-slate-700 text-white text-xs text-center" title="Posição Y (%)" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex-1 flex flex-col gap-2">
                                            <input type="text" value={h.label} onChange={e => updateHotspot(i, { label: e.target.value })} className="w-full p-1 bg-black border border-slate-700 text-white text-sm focus:border-brand outline-none" placeholder="Rótulo (O que é isso?)" />
                                            <input type="text" value={h.feedback} onChange={e => updateHotspot(i, { feedback: e.target.value })} className="w-full p-1 bg-black border border-slate-700 text-slate-300 text-xs focus:border-brand outline-none" placeholder="Feedback/Explicação ao encontrar" />
                                        </div>
                                        <button onClick={() => removeHotspot(i)} className="text-red-500 hover:bg-red-500/10 p-2 rounded self-start">×</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </Card>
            )}

            {selectedType === 'IntegrativeDragDrop' && (
                <Card>
                    <h3 className="text-lg font-bold text-white mb-4">Configuração de Classificação</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <InputField label="Nome Coluna A">
                                <input type="text" value={colA} onChange={e => setColA(e.target.value)} className="w-full p-2 bg-[#0d1117] border border-slate-700 rounded text-white" />
                            </InputField>
                            <InputField label="Nome Coluna B">
                                <input type="text" value={colB} onChange={e => setColB(e.target.value)} className="w-full p-2 bg-[#0d1117] border border-slate-700 rounded text-white" />
                            </InputField>
                        </div>

                        <div className="border border-slate-700 rounded p-4 bg-[#0d1117]">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-slate-400">Itens ({dragItems.length})</span>
                                <button onClick={addDragItem} className="text-xs bg-brand text-black px-2 py-1 rounded font-bold">+ Adicionar Item</button>
                            </div>
                            {dragItems.map((item, i) => (
                                <div key={i} className="flex gap-2 mb-2 items-center">
                                    <input type="text" value={item.content} onChange={e => updateDragItem(i, { content: e.target.value })} className="flex-1 p-1 bg-black border border-slate-700 text-white text-xs" placeholder="Conteúdo do Item" />
                                    <select value={item.correctColumnId} onChange={e => updateDragItem(i, { correctColumnId: e.target.value })} className="p-1 bg-black border border-slate-700 text-white text-xs">
                                        <option value="A">Coluna A</option>
                                        <option value="B">Coluna B</option>
                                        <option value="Intersection">Interseção (Ambos)</option>
                                    </select>
                                    <button onClick={() => removeDragItem(i)} className="text-red-500">×</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            )}

            {selectedType === 'AdvanceOrganizer' && (
                <Card>
                    <h3 className="text-lg font-bold text-white mb-4">Configuração do Organizador Prévio</h3>
                    <div className="space-y-4">
                        <InputField label="Texto da Analogia / Ponte">
                            <textarea value={organizerAnalogy} onChange={e => setOrganizerAnalogy(e.target.value)} rows={4} className="w-full p-2 bg-[#0d1117] border border-slate-700 rounded text-white" placeholder="Explique o novo conceito usando algo familiar..." />
                        </InputField>
                        <InputField label="Conceito Alvo (Novo Aprendizado)">
                            <input type="text" value={organizerConcept} onChange={e => setOrganizerConcept(e.target.value)} className="w-full p-2 bg-[#0d1117] border border-slate-700 rounded text-white" />
                        </InputField>
                        <InputField label="URL de Vídeo/Mídia (Opcional)">
                            <input type="text" value={organizerMedia} onChange={e => setOrganizerMedia(e.target.value)} className="w-full p-2 bg-[#0d1117] border border-slate-700 rounded text-white" placeholder="YouTube URL..." />
                        </InputField>
                    </div>
                </Card>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                <button onClick={() => handleSave(true)} disabled={isSubmittingContent} className="px-6 py-3 bg-slate-800 text-slate-300 font-bold rounded-lg hover:bg-slate-700 disabled:opacity-50">Salvar Rascunho</button>
                <button onClick={() => handleSave(false)} disabled={isSubmittingContent} className="px-6 py-3 bg-brand text-black font-bold rounded-lg hover:bg-brand/90 disabled:opacity-50 flex items-center gap-2">
                    {isSubmittingContent ? <SpinnerIcon className="h-5 w-5 text-black" /> : null}
                    Publicar
                </button>
            </div>

            {/* --- MODALS FOR SELECTION --- */}
            
            <Modal isOpen={isSubjectModalOpen} onClose={() => setIsSubjectModalOpen(false)} title="Selecione a Matéria">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
                    {SUBJECTS_LIST.map((subj) => (
                        <button
                            key={subj}
                            onClick={() => { setMateria(subj); setIsSubjectModalOpen(false); }}
                            className={`p-3 text-left rounded-lg border transition-all ${
                                materia === subj 
                                    ? 'bg-brand/20 border-brand text-brand font-bold' 
                                    : 'bg-[#161b22] border-slate-700 text-slate-300 hover:bg-[#21262d] hover:border-slate-500'
                            }`}
                        >
                            {subj}
                        </button>
                    ))}
                </div>
            </Modal>

            <Modal isOpen={isClassModalOpen} onClose={() => setIsClassModalOpen(false)} title="Selecione a Turma">
                <div className="flex flex-col gap-2 p-2">
                    <button
                        onClick={() => { setClassId(''); setIsClassModalOpen(false); }}
                        className={`p-4 text-left rounded-lg border transition-all ${
                            classId === '' 
                                ? 'bg-brand/20 border-brand text-brand font-bold' 
                                : 'bg-[#161b22] border-slate-700 text-slate-300 hover:bg-[#21262d] hover:border-slate-500'
                        }`}
                    >
                        <div className="font-bold">Apenas Repositório</div>
                        <div className="text-xs opacity-70">Salvar sem publicar para uma turma específica agora.</div>
                    </button>
                    
                    <div className="h-px bg-white/10 my-2"></div>

                    {teacherClasses.length === 0 ? (
                        <p className="text-center text-slate-500 py-4">Nenhuma turma encontrada.</p>
                    ) : (
                        teacherClasses.map((cls) => (
                            <button
                                key={cls.id}
                                onClick={() => { setClassId(cls.id); setIsClassModalOpen(false); }}
                                className={`p-3 text-left rounded-lg border transition-all ${
                                    classId === cls.id 
                                        ? 'bg-brand/20 border-brand text-brand font-bold' 
                                        : 'bg-[#161b22] border-slate-700 text-slate-300 hover:bg-[#21262d] hover:border-slate-500'
                                }`}
                            >
                                {cls.name}
                            </button>
                        ))
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default CreateInteractiveActivity;
