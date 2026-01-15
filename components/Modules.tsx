
import React, { useState, useEffect } from 'react';
import { useStudentAcademic } from '../contexts/StudentAcademicContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { usePublicLibrary } from '../hooks/usePublicLibrary'; // New Hook
import { SpinnerIcon, SUBJECTS_LIST, SCHOOL_YEARS } from '../constants/index';
import type { Module } from '../types';
import { Modal } from './common/Modal'; 
import { CustomSelect } from './common/FormHelpers';

// --- PRESENTATIONAL COMPONENTS (UI ONLY) ---

const ModuleCard: React.FC<{ module: Module; onClick: () => void }> = ({ module, onClick }) => {
    const isCompleted = module.progress === 100;
    const progress = module.progress || 0;

    return (
        <div 
            onClick={onClick}
            className="group relative bg-[#0d1117] border border-white/10 rounded-2xl overflow-hidden cursor-pointer hover:border-brand/50 transition-all duration-300 flex flex-col h-full shadow-lg hover:shadow-[0_0_30px_rgba(0,0,0,0.3)]"
        >
            <div className="relative h-40 overflow-hidden">
                {module.coverImageUrl ? (
                    <img 
                        src={module.coverImageUrl} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100" 
                        alt={module.title} 
                    />
                ) : (
                    <div className="w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 bg-slate-800" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-transparent to-transparent" />
                
                {/* Badge de Status */}
                <div className="absolute top-3 right-3">
                    {isCompleted ? (
                        <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded text-[10px] font-bold uppercase backdrop-blur-md flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Concluído
                        </span>
                    ) : progress > 0 ? (
                        <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded text-[10px] font-bold uppercase backdrop-blur-md">
                            {progress}%
                        </span>
                    ) : (
                        <span className="bg-slate-500/20 text-slate-300 border border-slate-500/30 px-2 py-1 rounded text-[10px] font-bold uppercase backdrop-blur-md">
                            Novo
                        </span>
                    )}
                </div>
            </div>

            <div className="p-5 flex-1 flex flex-col">
                <div className="flex gap-2 mb-3">
                    <span className="text-[10px] font-mono text-brand uppercase tracking-wider border border-brand/20 px-1.5 py-0.5 rounded bg-brand/5">
                        {Array.isArray(module.materia) ? module.materia[0] : module.materia || 'Geral'}
                    </span>
                    {module.series && (
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider border border-slate-700 px-1.5 py-0.5 rounded bg-slate-800">
                            {Array.isArray(module.series) ? module.series[0] : module.series}
                        </span>
                    )}
                </div>
                <h3 className="text-lg font-bold text-white leading-tight mb-2 group-hover:text-brand transition-colors line-clamp-2">
                    {module.title}
                </h3>
                <p className="text-sm text-slate-400 line-clamp-2 mb-4 flex-1">
                    {module.description}
                </p>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                    <span className="text-xs text-slate-500 font-mono">
                        {module.pageCount !== undefined ? module.pageCount : (module.pages?.length || 0)} PÁGINAS
                    </span>
                    <span className="text-brand text-xs font-bold uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                        Acessar &rarr;
                    </span>
                </div>
            </div>
            
            {/* Progress Bar Bottom */}
            <div className="h-1 w-full bg-slate-800">
                <div 
                    className={`h-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-brand'}`} 
                    style={{ width: `${progress}%` }} 
                />
            </div>
        </div>
    );
};

// --- FILTERS MODAL ---
interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (filters: any) => void;
    currentFilters: any;
    showMyLibrary: boolean;
}

const ModuleFiltersModal: React.FC<FilterModalProps> = ({ isOpen, onClose, onApply, currentFilters, showMyLibrary }) => {
    const [localFilters, setLocalFilters] = useState(currentFilters);

    useEffect(() => {
        if (isOpen) setLocalFilters(currentFilters);
    }, [isOpen, currentFilters]);

    const handleChange = (key: string, value: string) => {
        setLocalFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = () => {
        onApply(localFilters);
        onClose();
    };

    const statusOptions = [
        { label: "Todos", value: "all" },
        { label: "Não Iniciado", value: "not_started" },
        { label: "Em Andamento", value: "in_progress" },
        { label: "Concluído", value: "completed" },
    ];

    const subjectOptions = [
        { label: "Todas as Matérias", value: "all" },
        ...SUBJECTS_LIST.map(s => ({ label: s, value: s }))
    ];

    const seriesOptions = [
        { label: "Todas as Séries", value: "all" },
        ...SCHOOL_YEARS.map(s => ({ label: s, value: s }))
    ];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Filtrar Conteúdo">
            <div className="space-y-6 py-2">
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Escopo da Busca</label>
                        <div className={`grid gap-2 bg-black/40 p-1 rounded-xl border border-white/5 ${showMyLibrary ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {showMyLibrary && (
                                <button
                                    onClick={() => handleChange('scope', 'my_modules')}
                                    className={`py-3 rounded-lg text-sm font-bold transition-all ${localFilters.scope === 'my_modules' ? 'bg-[#161b22] text-white shadow-md border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Minha Biblioteca
                                </button>
                            )}
                            <button
                                onClick={() => handleChange('scope', 'public')}
                                className={`py-3 rounded-lg text-sm font-bold transition-all ${localFilters.scope === 'public' ? 'bg-[#161b22] text-blue-400 shadow-md border border-blue-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Biblioteca Pública
                            </button>
                        </div>
                    </div>

                    <CustomSelect 
                        label="Status de Progresso"
                        value={localFilters.status}
                        onChange={(val) => handleChange('status', val)}
                        options={statusOptions}
                    />

                    <CustomSelect 
                        label="Matéria"
                        value={localFilters.materia}
                        onChange={(val) => handleChange('materia', val)}
                        options={subjectOptions}
                    />

                    <CustomSelect 
                        label="Série"
                        value={localFilters.serie}
                        onChange={(val) => handleChange('serie', val)}
                        options={seriesOptions}
                    />
                </div>

                <div className="pt-6 border-t border-white/10 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm font-bold">Cancelar</button>
                    <button 
                        onClick={handleSubmit}
                        className="px-6 py-2 bg-brand text-black font-bold rounded-lg hover:bg-brand/90 transition-colors shadow-lg shadow-brand/20 flex items-center gap-2"
                    >
                        <span>Aplicar Filtros</span>
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// --- GENERIC PRESENTATIONAL COMPONENT ---

interface ModulesViewProps {
    modules: Module[];
    isLoading: boolean;
    filters: any;
    onSearch: (filters: any) => void;
    onModuleClick: (module: Module) => void;
    showMyLibraryOption: boolean;
    title: string;
}

const ModulesView: React.FC<ModulesViewProps> = ({ 
    modules, isLoading, filters, onSearch, onModuleClick, showMyLibraryOption, title 
}) => {
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(filters.queryText || '');

    const handleSearchText = () => {
        onSearch({ ...filters, queryText: searchTerm });
    };

    const handleApplyFilters = (newFilters: any) => {
        onSearch({ ...newFilters, queryText: searchTerm });
    };

    const activeFiltersCount = [
        filters.materia !== 'all',
        filters.serie !== 'all',
        filters.status !== 'all'
    ].filter(Boolean).length;

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-3xl font-thin text-white tracking-tight">
                        {title}
                    </h1>
                    <p className="text-slate-400 mt-2 text-sm max-w-xl">
                        Acesse conteúdos didáticos, materiais de apoio e trilhas de aprendizagem.
                    </p>
                </div>
                
                {/* Search & Filter Bar */}
                <div className="flex w-full md:w-auto gap-2">
                    <div className="relative flex-grow md:w-64">
                        <input 
                            type="text" 
                            placeholder="Buscar por título..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchText()}
                            className="w-full bg-[#0d1117] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all placeholder:text-slate-600"
                        />
                        <svg className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <button 
                        onClick={() => setIsFilterModalOpen(true)}
                        className={`px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all border ${activeFiltersCount > 0 ? 'bg-white/10 border-brand text-brand' : 'bg-[#0d1117] border-white/10 text-slate-400 hover:text-white hover:border-white/30'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                        </svg>
                        <span className="hidden sm:inline">Filtros</span>
                        {activeFiltersCount > 0 && (
                            <span className="bg-brand text-black text-[10px] w-5 h-5 flex items-center justify-center rounded-full ml-1">
                                {activeFiltersCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="min-h-[300px]">
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <SpinnerIcon className="h-12 w-12 text-brand" />
                    </div>
                ) : modules.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {modules.map(module => (
                            <ModuleCard 
                                key={module.id} 
                                module={module} 
                                onClick={() => onModuleClick(module)} 
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-white/5 rounded-3xl bg-black/20 backdrop-blur-sm">
                        <div className="p-4 bg-white/5 rounded-full mb-3 text-slate-500 text-4xl">📚</div>
                        <p className="text-slate-400 font-bold text-sm">Nenhum módulo encontrado.</p>
                        <p className="text-slate-600 text-xs mt-1 max-w-md">
                            Tente ajustar os filtros ou buscar por outro termo. {showMyLibraryOption ? "Verifique se você está na aba correta." : "Verifique se há módulos públicos disponíveis."}
                        </p>
                        <button 
                            onClick={() => setIsFilterModalOpen(true)}
                            className="mt-4 text-brand text-xs font-bold uppercase tracking-wider hover:underline"
                        >
                            Ajustar Filtros
                        </button>
                    </div>
                )}
            </div>

            <ModuleFiltersModal 
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                onApply={handleApplyFilters}
                currentFilters={filters}
                showMyLibrary={showMyLibraryOption}
            />
        </div>
    );
};

// --- MAIN CONTAINER (LOGIC SWITCHER) ---

const Modules: React.FC = () => {
    const { userRole } = useAuth();
    const { startModule } = useNavigation();
    
    // 1. Hook for Students & Teachers (Advanced filtering: "My Library" support)
    // O Hook useStudentContent já contém lógica para professores filtrarem seus módulos criados.
    const academicData = useStudentAcademic();
    
    // 2. Hook for Public/Admins/Others (Clean Public Library Browser)
    const publicData = usePublicLibrary();

    // Professores E Alunos podem usar o contexto avançado
    const canUseAdvancedLibrary = userRole === 'aluno' || userRole === 'professor';

    const {
        searchedModules: modules,
        isLoading,
        moduleFilters: filters,
        searchModules: onSearch
    } = canUseAdvancedLibrary ? academicData : publicData;

    
    const pageTitle = canUseAdvancedLibrary ? 
        <>Biblioteca de <span className="font-bold text-brand">Módulos</span></> : 
        <>Biblioteca <span className="font-bold text-blue-400">Pública</span></>;

    return (
        <ModulesView
            modules={modules}
            isLoading={isLoading}
            filters={filters}
            onSearch={onSearch}
            onModuleClick={startModule}
            showMyLibraryOption={canUseAdvancedLibrary}
            title={pageTitle as any}
        />
    );
};

export default Modules;
