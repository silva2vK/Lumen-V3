
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Activity, HotspotItem } from '../../types';
import { Card } from '../common/Card';

interface Props {
    activity: Activity;
    onComplete: (data: any) => void;
}

export const VisualSourceAnalysis: React.FC<Props> = ({ activity, onComplete }) => {
    const data = activity.visualSourceData;
    const [activeHotspot, setActiveHotspot] = useState<HotspotItem | null>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsFullScreen(false);
                setActiveHotspot(null);
            }
        };
        if (isFullScreen || activeHotspot) {
            window.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isFullScreen, activeHotspot]);

    if (!data) return <div className="text-red-500">Dados da atividade corrompidos.</div>;

    const handleHotspotClick = (spot: HotspotItem, e: React.MouseEvent) => {
        e.stopPropagation(); 
        setActiveHotspot(spot);
    };

    return (
        <div className="space-y-6 animate-fade-in relative z-20">
            {/* Otimização: Removido backdrop-blur, usado cor sólida com transparência */}
            <div className="flex justify-between items-center bg-black/90 p-4 border-l-4 border-red-800">
                <h3 className="text-stone-200 font-bold uppercase tracking-widest text-sm">Análise de Fonte</h3>
                <span className="text-red-500 font-mono text-xs animate-pulse">● LIVE FEED</span>
            </div>

            <div className="relative w-full overflow-hidden border border-stone-800 group shadow-2xl bg-black">
                <img 
                    src={data.imageUrl} 
                    alt="Fonte Histórica" 
                    className="w-full h-auto object-contain cursor-zoom-in transition-transform duration-500"
                    onDoubleClick={() => setIsFullScreen(true)}
                    title="Duplo clique para ampliar"
                />
                
                {data.hotspots.map((spot, index) => (
                    <div
                        key={spot.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                    >
                        {/* Marker Visual - Red Pulse */}
                        <button
                            onClick={(e) => handleHotspotClick(spot, e)}
                            className="relative flex items-center justify-center transition-all duration-300 group hover:scale-110 z-10"
                            aria-label={`Ver detalhe: ${spot.label}`}
                        >
                            <div className="absolute w-8 h-8 rounded-full border border-red-600/80 animate-ping opacity-60"></div>
                            <div className="w-4 h-4 rounded-full border-2 border-white bg-red-600 shadow-md hover:bg-red-500"></div>
                        </button>
                    </div>
                ))}
            </div>
            
            <Card className="bg-black/80 border-stone-800">
                <div className="flex items-start gap-3">
                    <span className="text-lg text-stone-500">👁️</span>
                    <p className="text-xs text-stone-400 font-mono mt-1">
                        Examine a imagem acima. Clique nos marcadores vermelhos para abrir as observações detalhadas.
                    </p>
                </div>
            </Card>

            {/* Modal de Detalhes (Otimizado: bg-black/90 sem blur) */}
            {activeHotspot && createPortal(
                <div 
                    className="fixed inset-0 z-[10000] bg-black/90 flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setActiveHotspot(null)}
                >
                    <div 
                        className="relative w-full max-w-lg bg-[#1a1a1a] border-2 border-stone-700 p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header do Modal */}
                        <div className="flex justify-between items-start mb-6 border-b border-red-900/30 pb-4">
                            <div>
                                <p className="text-[10px] text-red-600 font-bold uppercase tracking-[0.2em] mb-1">Observação do Professor</p>
                                <h3 className="text-2xl text-stone-200 font-serif font-bold leading-tight">
                                    {activeHotspot.label}
                                </h3>
                            </div>
                            <button 
                                onClick={() => setActiveHotspot(null)}
                                className="text-stone-500 hover:text-white transition-colors p-2 text-xl"
                                aria-label="Fechar"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Conteúdo */}
                        <div className="prose prose-invert prose-sm max-w-none">
                            <p className="text-stone-300 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                                {activeHotspot.feedback}
                            </p>
                        </div>

                        {/* Footer Decorativo */}
                        <div className="mt-8 flex justify-end">
                            <button 
                                onClick={() => setActiveHotspot(null)}
                                className="px-6 py-2 border border-stone-600 text-stone-400 text-xs font-bold uppercase hover:bg-stone-800 hover:text-white transition-colors"
                            >
                                Fechar Registro
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal Fullscreen Imagem */}
            {isFullScreen && createPortal(
                <div 
                    className="fixed inset-0 z-[9999] bg-black flex items-center justify-center cursor-zoom-out animate-fade-in"
                    onClick={() => setIsFullScreen(false)}
                >
                    <div className="relative w-full h-full p-4 flex items-center justify-center">
                        <img 
                            src={data.imageUrl} 
                            alt="Fonte Histórica Ampliada" 
                            className="max-w-full max-h-full object-contain shadow-2xl select-none"
                        />
                        <button 
                            className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors"
                            onClick={() => setIsFullScreen(false)}
                        >
                            FECHAR [ESC]
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
