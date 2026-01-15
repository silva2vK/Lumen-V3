
import React, { useState, useMemo, useEffect, useContext, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { TeacherAcademicContext } from '../contexts/TeacherAcademicContext';
import { useStudentAcademic } from '../contexts/StudentAcademicContext';
import { SpinnerIcon } from '../constants/index';
import type { HistoricalEra, Module, Activity } from '../types';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseClient';
import { getSubjectTheme } from '../utils/subjectTheme';
import { scheduleTask } from '../utils/scheduler';

// --- Configuration ---

const ERA_CONFIG: Record<HistoricalEra, { color: string, label: string }> = {
    'Pré-História': { color: '#F59E0B', label: 'PRÉ-HISTÓRIA' },
    'Antiga': { color: '#EAB308', label: 'IDADE ANTIGA' },
    'Média': { color: '#D946EF', label: 'IDADE MÉDIA' },
    'Moderna': { color: '#EF4444', label: 'IDADE MODERNA' },
    'Contemporânea': { color: '#06B6D4', label: 'IDADE CONTEMPORÂNEA' },
};

// Limites aproximados em Séculos (Índice Inteiro: -30 = Séc 30 a.C., 1 = Séc 1 d.C.)
const ERA_BOUNDS: Record<HistoricalEra, { startCen: number, endCen: number }> = {
    'Pré-História': { startCen: -50, endCen: -31 }, 
    'Antiga': { startCen: -30, endCen: 5 },         
    'Média': { startCen: 6, endCen: 15 },           
    'Moderna': { startCen: 16, endCen: 18 },        
    'Contemporânea': { startCen: 19, endCen: 22 },  
};

const DEFAULT_BACKGROUNDS: Record<HistoricalEra, string[]> = {
    'Pré-História': ['https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600&auto=format&fit=crop'],
    'Antiga': ['https://images.unsplash.com/photo-1599739291060-4578e77dac5d?q=80&w=1600&auto=format&fit=crop'],
    'Média': ['https://images.unsplash.com/photo-1605806616949-1e87b487bc2a?q=80&w=1600&auto=format&fit=crop'],
    'Moderna': ['https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1600&auto=format&fit=crop'],
    'Contemporânea': ['https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=1600&auto=format&fit=crop'],
};

const ORDERED_ERAS: HistoricalEra[] = ['Pré-História', 'Antiga', 'Média', 'Moderna', 'Contemporânea'];

const MIN_CENTURY_WIDTH = 400; 
const ITEM_WIDTH_ALLOCATION = 320; 
const PADDING_ERA = 400; 

// --- Helpers ---

const toRoman = (num: number): string => {
    if (num === 0) return '';
    const lookup: Record<string, number> = {C:100,XC:90,L:50,XL:40,X:10,IX:9,V:5,IV:4,I:1};
    let str = '';
    for ( let i in lookup ) {
        while ( num >= lookup[i] ) {
            str += i;
            num -= lookup[i];
        }
    }
    return str;
};

const getCenturyIndex = (year: number) => {
    if (year === 0) return 1; 
    return year > 0 ? Math.ceil(year / 100) : Math.floor(year / 100);
};

const formatCenturyLabelFromIndex = (index: number): string => {
    const absIndex = Math.abs(index);
    const suffix = index < 0 ? ' a.C.' : '';
    return `SÉC. ${toRoman(absIndex)}${suffix}`;
};

// --- Types ---

interface TimelineItem {
    id: string;
    type: 'module' | 'activity';
    title: string;
    year: number;
    era: HistoricalEra;
    data: Module | Activity;
    globalX: number; 
}

interface CenturyBlock {
    key: string; 
    label: string;
    startX: number;
    width: number;
    centuryIndex: number;
    items: TimelineItem[]; 
}

interface EraSectionData {
    era: HistoricalEra;
    startX: number;
    width: number;
    bg: string;
    items: TimelineItem[];
    centuries: CenturyBlock[];
}

// --- Components ---

const RulerTrack: React.FC<{ sections: EraSectionData[] }> = ({ sections }) => {
    return (
        <div className="absolute top-[80%] left-0 right-0 h-40 pointer-events-none z-10 flex">
            {/* The Main Horizontal Line - High Contrast White */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
            
            {sections.map(section => (
                <React.Fragment key={section.era}>
                    {/* Era Label - Moves with the timeline - High Contrast White Background Text */}
                    <div 
                        style={{ left: `${section.startX + 20}px` }}
                        className="absolute -top-32 text-[6rem] font-black text-white/30 uppercase tracking-widest whitespace-nowrap font-epic select-none pointer-events-none"
                    >
                        {ERA_CONFIG[section.era].label}
                    </div>

                    {/* Century Blocks within Era */}
                    {section.centuries.map((cen) => (
                        <div 
                            key={cen.key}
                            style={{ 
                                position: 'absolute', 
                                left: `${cen.startX}px`, 
                                width: `${cen.width}px`,
                                height: '100%' 
                            }}
                            className="border-l border-white/50 flex flex-col justify-start pl-2"
                        >
                            {/* Century Label */}
                            <span className={`text-[10px] font-mono font-bold mt-2 px-1 rounded w-fit ${cen.items.length > 0 ? 'text-white bg-black/60' : 'text-white/80'}`}>
                                {cen.label}
                            </span>

                            {/* Minor Ticks inside Century - Increased Visibility */}
                            <div className="absolute top-0 left-0 right-0 h-2 flex justify-between px-4 pointer-events-none">
                                <div className="w-[1px] h-full bg-white/60"></div>
                                <div className="w-[1px] h-full bg-white/60"></div>
                                <div className="w-[1px] h-full bg-white/60"></div>
                            </div>
                        </div>
                    ))}
                </React.Fragment>
            ))}
        </div>
    );
};

const TimelineNode: React.FC<{
    item: TimelineItem;
    onClick: (item: TimelineItem) => void;
}> = React.memo(({ item, onClick }) => {
    const data = item.data as any;
    const coverImage = data.coverImageUrl || data.imageUrl;
    const theme = getSubjectTheme(data.materia);
    const color = ERA_CONFIG[item.era].color;
    
    const stemHeight = 80 + (item.id.charCodeAt(0) % 4) * 30; 

    return (
        <div 
            className="absolute top-[80%] flex flex-col-reverse items-center group/node"
            style={{ 
                left: `${item.globalX}px`,
                transform: 'translateY(-100%) translateX(-50%)',
                zIndex: 20
            }}
        >
            {/* The Stem - Brighter default state */}
            <div 
                className="w-[1px] bg-gradient-to-t from-white to-transparent group-hover/node:bg-white transition-colors duration-300"
                style={{ height: `${stemHeight}px` }}
            />

            {/* The Dot */}
            <div className={`absolute -bottom-1.5 w-3 h-3 rounded-full bg-[#09090b] border-2 border-white group-hover/node:scale-150 group-hover/node:border-[${color}] transition-all z-20 shadow-[0_0_10px_rgba(255,255,255,0.5)]`}></div>

            {/* Year Label (Small pill) */}
            <div className="mb-2 mt-1 bg-black/80 backdrop-blur border border-white/30 px-2 py-0.5 rounded text-[9px] font-mono text-white group-hover/node:text-brand group-hover/node:border-brand/50 transition-colors">
                {Math.abs(item.year)} {item.year < 0 ? 'a.C.' : ''}
            </div>

            {/* The Card */}
            <div 
                onClick={(e) => { e.stopPropagation(); onClick(item); }}
                className={`
                    w-64 bg-[#09090b] border border-white/20 rounded-xl overflow-hidden cursor-pointer
                    hover:scale-105 hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:border-white/50 hover:z-50
                    transition-all duration-300 relative group-hover/node:-translate-y-2
                `}
            >
                <div className="h-32 w-full relative">
                    {coverImage ? (
                        <img src={coverImage} className="w-full h-full object-cover opacity-80 group-hover/node:opacity-100 transition-opacity" alt="" />
                    ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                            <span className="text-4xl opacity-20">📜</span>
                        </div>
                    )}
                    <div className="absolute top-2 right-2">
                        <span className="text-[8px] font-bold bg-black/80 text-white px-2 py-1 rounded border border-white/10 uppercase">
                            {item.type === 'module' ? 'Módulo' : 'Atividade'}
                        </span>
                    </div>
                </div>

                <div className="p-3 border-t border-white/10 bg-gradient-to-b from-transparent to-white/5">
                    <h4 className="text-sm font-bold text-slate-100 leading-tight line-clamp-2 mb-1 group-hover/node:text-brand">
                        {item.title}
                    </h4>
                    <div className="flex justify-between items-center mt-2">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${theme.bg} ${theme.border} ${theme.text} uppercase`}>
                            {Array.isArray(data.materia) ? data.materia[0] : data.materia || 'Geral'}
                        </span>
                    </div>
                </div>
                
                <div className="h-1 w-full" style={{ backgroundColor: color }}></div>
            </div>
        </div>
    );
});

const InteractiveMap: React.FC = () => {
    const { userRole } = useAuth();
    const { startModule, openActivity } = useNavigation();
    
    const teacherContext = useContext(TeacherAcademicContext);
    const studentContext = useStudentAcademic();

    const [backgrounds, setBackgrounds] = useState<Record<HistoricalEra, string[]>>(DEFAULT_BACKGROUNDS);
    const [publicModules, setPublicModules] = useState<Module[]>([]);
    const [classModules, setClassModules] = useState<Module[]>([]);
    const [isLoadingPublic, setIsLoadingPublic] = useState(false);

    // Calculated Layout State
    const [sections, setSections] = useState<EraSectionData[]>([]);
    const [totalWidth, setTotalWidth] = useState(0);
    const [isCalculating, setIsCalculating] = useState(true);

    // Camera & Zoom
    const [cameraX, setCameraX] = useState(0);
    const [scale, setScale] = useState(1);
    
    const viewportRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const lastX = useRef(0);
    const initialPinchDist = useRef<number | null>(null);
    const initialScaleRef = useRef<number>(1);

    // Determine current era for background transition
    const currentActiveEra = useMemo(() => {
        if (sections.length === 0) return 'Pré-História';
        // Calculate center of viewport
        const viewportCenter = cameraX + (window.innerWidth / 2);
        
        const activeSection = sections.find(s => 
            viewportCenter >= s.startX && viewportCenter < (s.startX + s.width)
        );
        
        return activeSection ? activeSection.era : sections[0].era;
    }, [cameraX, sections]);

    // 1. Load Configs & Data
    useEffect(() => {
        const fetchBackgrounds = async () => {
            try {
                const docRef = doc(db, 'system_settings', 'timeline_backgrounds');
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = snap.data();
                    const mergedBgs = { ...DEFAULT_BACKGROUNDS };
                    Object.keys(DEFAULT_BACKGROUNDS).forEach(k => {
                        const era = k as HistoricalEra;
                        if (data[era] && Array.isArray(data[era]) && data[era].length > 0) {
                            mergedBgs[era] = data[era];
                        }
                    });
                    setBackgrounds(mergedBgs);
                }
            } catch (err) { console.error(err); }
        };
        fetchBackgrounds();
    }, []);

    // Load Modules Logic
    useEffect(() => {
        if (userRole === 'aluno') {
            setIsLoadingPublic(true);
            const q = query(collection(db, "modules"), where("status", "==", "Ativo"), where("visibility", "==", "public"));
            getDocs(q).then(snap => {
                setPublicModules(snap.docs.map(d => ({ id: d.id, ...d.data() } as Module)));
            }).finally(() => setIsLoadingPublic(false));
        } else if (userRole === 'professor' && teacherContext?.modules.length === 0) {
            teacherContext.fetchModulesLibrary();
        }
    }, [userRole, teacherContext]);

    useEffect(() => {
        if (userRole === 'aluno' && studentContext?.studentClasses?.length > 0) {
            const fetchClassModules = async () => {
                const classIds = studentContext.studentClasses.map(c => c.id);
                if (classIds.length === 0) return;
                const chunks = [];
                for (let i = 0; i < classIds.length; i += 10) chunks.push(classIds.slice(i, i + 10));
                let results: Module[] = [];
                for (const chunk of chunks) {
                    try {
                        const q = query(collection(db, "modules"), where("status", "==", "Ativo"), where("classIds", "array-contains-any", chunk));
                        const snap = await getDocs(q);
                        snap.docs.forEach(d => results.push({ id: d.id, ...d.data() } as Module));
                    } catch (e) { console.error(e); }
                }
                setClassModules(results);
            };
            fetchClassModules();
        }
    }, [userRole, studentContext?.studentClasses]);

    // 2. THE CALCULATION CORE
    useEffect(() => {
        let isMounted = true;
        setIsCalculating(true);

        const calculate = async () => {
            await scheduleTask(() => {
                let modules: Module[] = [];

                if (userRole === 'professor' && teacherContext) {
                    modules = teacherContext.modules;
                } else if (userRole === 'aluno' && studentContext) {
                    modules = [...publicModules, ...classModules];
                    modules = Array.from(new Map(modules.map(m => [m.id, m])).values());
                }

                const itemsByEra: Record<HistoricalEra, any[]> = {
                    'Pré-História': [], 'Antiga': [], 'Média': [], 'Moderna': [], 'Contemporânea': []
                };
                
                let minPreHistoryCen = ERA_BOUNDS['Pré-História'].startCen;

                modules.forEach(obj => {
                    let computedEra: HistoricalEra = 'Pré-História';
                    let y = -5000;

                    if (obj.historicalYear !== undefined) {
                        y = obj.historicalYear;
                    } else if (obj.historicalEra) {
                        switch(obj.historicalEra) {
                            case 'Antiga': y = -1000; break;
                            case 'Média': y = 1000; break;
                            case 'Moderna': y = 1600; break;
                            case 'Contemporânea': y = 1900; break;
                        }
                    }

                    if (y <= -3100) computedEra = 'Pré-História';
                    else if (y <= 476) computedEra = 'Antiga';
                    else if (y <= 1453) computedEra = 'Média';
                    else if (y <= 1789) computedEra = 'Moderna';
                    else computedEra = 'Contemporânea';

                    const cenIndex = getCenturyIndex(y);
                    if (computedEra === 'Pré-História' && cenIndex < minPreHistoryCen) {
                        minPreHistoryCen = cenIndex;
                    }

                    itemsByEra[computedEra].push({ 
                        id: obj.id, type: 'module', title: obj.title, year: y, era: computedEra, data: obj,
                        cenIndex 
                    });
                });

                let currentGlobalCursor = 0;
                const calculatedSections: EraSectionData[] = [];

                ORDERED_ERAS.forEach(era => {
                    const eraRawItems = itemsByEra[era];
                    
                    let startCen = ERA_BOUNDS[era].startCen;
                    const endCen = ERA_BOUNDS[era].endCen;
                    
                    if (era === 'Pré-História') {
                        startCen = minPreHistoryCen; 
                    }

                    const centuryGroups: Record<number, TimelineItem[]> = {};
                    eraRawItems.forEach(item => {
                        const idx = item.cenIndex;
                        if (!centuryGroups[idx]) centuryGroups[idx] = [];
                        centuryGroups[idx].push(item);
                    });

                    const sortedCenturies: CenturyBlock[] = [];
                    let eraCursor = currentGlobalCursor + PADDING_ERA;
                    const sectionStart = currentGlobalCursor;
                    const positionedItems: TimelineItem[] = [];

                    for (let c = startCen; c <= endCen; c++) {
                        if (c === 0) continue; 

                        const itemsInCentury = centuryGroups[c] || [];
                        const requiredWidth = Math.max(MIN_CENTURY_WIDTH, itemsInCentury.length * ITEM_WIDTH_ALLOCATION);

                        const block: CenturyBlock = {
                            key: `CEN_${c}`,
                            label: formatCenturyLabelFromIndex(c),
                            startX: eraCursor,
                            width: requiredWidth,
                            centuryIndex: c,
                            items: []
                        };

                        if (itemsInCentury.length > 0) {
                            itemsInCentury.sort((a, b) => a.year - b.year);
                            const spacing = requiredWidth / (itemsInCentury.length + 1);
                            itemsInCentury.forEach((item, idx) => {
                                const itemX = eraCursor + (spacing * (idx + 1));
                                positionedItems.push({ ...item, globalX: itemX });
                            });
                            block.items = itemsInCentury;
                        }

                        sortedCenturies.push(block);
                        eraCursor += requiredWidth;
                    }

                    eraCursor += PADDING_ERA;
                    const eraTotalWidth = eraCursor - sectionStart;

                    calculatedSections.push({
                        era,
                        startX: sectionStart,
                        width: eraTotalWidth,
                        bg: backgrounds[era]?.[0] || '',
                        items: positionedItems,
                        centuries: sortedCenturies
                    });

                    currentGlobalCursor = eraCursor;
                });

                if (isMounted) {
                    setSections(calculatedSections);
                    setTotalWidth(currentGlobalCursor);
                    setIsCalculating(false);
                }
            });
        };

        calculate();
        return () => { isMounted = false; };
    }, [userRole, teacherContext?.modules, studentContext?.studentClasses, publicModules, classModules, backgrounds]);

    // Drag Interaction (Mouse)
    const handleStart = (clientX: number) => {
        setIsDragging(true);
        lastX.current = clientX;
    };
    
    const handleMove = (clientX: number) => {
        if (!isDragging) return;
        const delta = lastX.current - clientX;
        lastX.current = clientX;
        
        setCameraX(x => {
            const logicalViewportWidth = window.innerWidth / scale;
            const maxScroll = Math.max(0, totalWidth - logicalViewportWidth);
            return Math.max(0, Math.min(x + (delta / scale), maxScroll));
        });
    };

    // Touch Handling (Pinch to Zoom)
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            handleStart(e.touches[0].clientX);
        } else if (e.touches.length === 2) {
            setIsDragging(false);
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            initialPinchDist.current = dist;
            initialScaleRef.current = scale;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            handleMove(e.touches[0].clientX);
        } else if (e.touches.length === 2 && initialPinchDist.current) {
            e.preventDefault(); 
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const ratio = dist / initialPinchDist.current;
            const newScale = Math.min(Math.max(initialScaleRef.current * ratio, 0.5), 3); 
            setScale(newScale);
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (e.touches.length < 2) {
            initialPinchDist.current = null;
        }
        if (e.touches.length === 0) {
            setIsDragging(false);
        } else {
            setIsDragging(false);
        }
    };

    const isLoading = isLoadingPublic || isCalculating;

    if (isLoading) return <div className="h-screen flex items-center justify-center bg-[#050505]"><SpinnerIcon className="h-10 w-10 text-brand" /></div>;

    return (
        <div 
            ref={viewportRef}
            className="relative h-[calc(100vh-6rem)] w-full overflow-hidden bg-[#050505] select-none cursor-grab active:cursor-grabbing border border-white/10 rounded-xl touch-none"
            onMouseDown={e => handleStart(e.clientX)}
            onMouseMove={e => handleMove(e.clientX)}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* LAYER 1: FIXED BACKGROUND (Parallax Effect by changing Opacity) */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                {sections.map(section => (
                    <div 
                        key={section.era}
                        className="absolute inset-0 transition-opacity duration-700 ease-in-out bg-cover bg-center bg-no-repeat"
                        style={{
                            backgroundImage: `url(${section.bg})`,
                            opacity: currentActiveEra === section.era ? 1 : 0
                        }}
                    >
                        <div className="absolute inset-0 bg-black/60" />
                        {/* Static Fog Effect at bottom of screen */}
                        <div className="absolute bottom-0 w-full h-1/2 opacity-30" style={{ background: `linear-gradient(to top, ${ERA_CONFIG[section.era].color}, transparent)` }} />
                    </div>
                ))}
            </div>

            {/* LAYER 2: SCROLLABLE CONTENT (Ruler + Items) - Transparent Background */}
            <div 
                className="absolute inset-0 h-full will-change-transform origin-left z-10"
                style={{ 
                    // Scale applies here, so items zoom in/out
                    transform: `scale(${scale}) translateX(${-cameraX}px)`,
                    width: `${totalWidth}px` 
                }}
            >
                <RulerTrack sections={sections} />

                {sections.map(section => (
                    <React.Fragment key={section.era}>
                        {section.items.map(item => (
                            <TimelineNode 
                                key={item.id} 
                                item={item} 
                                onClick={(i) => i.type === 'module' ? startModule(i.data as Module) : openActivity(i.data as Activity)} 
                            />
                        ))}
                    </React.Fragment>
                ))}
            </div>

            {/* HUD: Era Jumper */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur border border-white/10 rounded-full px-4 py-2 flex gap-4 z-50 shadow-2xl overflow-x-auto max-w-[90vw]">
                {sections.map(s => (
                    <button 
                        key={s.era}
                        onClick={() => setCameraX(s.startX)}
                        className={`text-[10px] font-bold uppercase transition-colors flex items-center gap-2 whitespace-nowrap ${currentActiveEra === s.era ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <span className={`w-2 h-2 rounded-full ${currentActiveEra === s.era ? 'scale-125' : ''}`} style={{ backgroundColor: ERA_CONFIG[s.era].color }}></span>
                        {s.era}
                    </button>
                ))}
                {/* Scale Reset Button */}
                {scale !== 1 && (
                    <>
                        <div className="w-px bg-white/20 mx-1"></div>
                        <button onClick={() => setScale(1)} className="text-[10px] font-bold text-brand uppercase whitespace-nowrap">
                            Reset Zoom ({Math.round(scale * 100)}%)
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default InteractiveMap;
