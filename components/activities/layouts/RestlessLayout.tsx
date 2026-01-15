
import React, { useEffect, useRef } from 'react';
import type { ActivityLayoutProps } from '../../../types';

// Efeitos otimizados para GPU
const SilentHillStyles = () => (
    <style>{`
        :root {
            --scroll-y: 0px;
        }
        @keyframes fog-move {
            0% { transform: translate3d(-5%, 0, 0); opacity: 0.4; }
            50% { transform: translate3d(5%, -2%, 0); opacity: 0.6; }
            100% { transform: translate3d(-5%, 0, 0); opacity: 0.4; }
        }
        @keyframes noise {
            0%, 100% { background-position: 0 0; }
            10% { background-position: -5% -10%; }
            20% { background-position: -15% 5%; }
            30% { background-position: 7% -25%; }
            40% { background-position: 20% 25%; }
            50% { background-position: -25% 10%; }
            60% { background-position: 15% 5%; }
            70% { background-position: 0% 15%; }
            80% { background-position: 25% 35%; }
            90% { background-position: -10% 10%; }
        }
        .font-sh-title {
            font-family: 'Cinzel', serif;
            letter-spacing: 0.05em;
        }
        .font-sh-body {
            font-family: 'Special Elite', monospace;
        }
        .sh-noise {
            /* Usando background repeat simples é mais leve que SVG complexo */
            background-image: url("https://grainy-gradients.vercel.app/noise.svg");
            background-repeat: repeat;
            animation: noise 1s steps(8) infinite; /* Reduzido steps para aliviar CPU */
            pointer-events: none;
            opacity: 0.08; /* Reduzido opacity para evitar blend mode pesado */
        }
        /* Camada de Névoa Otimizada */
        .sh-fog-layer {
            background: url('https://raw.githubusercontent.com/danielkellyio/fog-effect/master/fog1.png') repeat-x;
            background-size: 200% 100%;
            /* Performance Hacks */
            will-change: transform; 
            backface-visibility: hidden;
            transform: translateZ(0);
            animation: fog-move 60s linear infinite alternate;
        }
        .sh-checkbox:checked + div {
            background-color: #991b1b;
            border-color: #7f1d1d;
        }
        .sh-paper {
            background-color: #d6d3d1;
            /* Combinação de gradiente e textura em uma única camada */
            background-image: 
                linear-gradient(rgba(255,255,255,0.8), rgba(214,211,209,0.9)),
                url("https://www.transparenttextures.com/patterns/aged-paper.png");
            box-shadow: 0 0 50px rgba(0,0,0,0.8);
        }
        .sh-enter-key {
            background: linear-gradient(to bottom, #2a0a0a, #1a0505);
            border-top: 1px solid #5c1c1c;
            border-left: 1px solid #5c1c1c;
            border-right: 1px solid #000;
            border-bottom: 4px solid #000;
            border-radius: 4px;
            box-shadow: 0 5px 10px rgba(0,0,0,0.5);
            text-shadow: 0 0 5px rgba(255,0,0,0.5);
            transition: transform 0.1s ease;
        }
        .sh-enter-key:active {
            transform: translateY(3px);
            border-bottom-width: 1px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.5);
        }
        .sh-enter-key:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
            border-bottom-width: 4px;
        }
    `}</style>
);

export const RestlessLayout: React.FC<ActivityLayoutProps> = ({ 
    activity, items, answers, handleAnswerChange, 
    handleSubmit, isSubmitting, onBack, renderComplexContent, isSubmitted, submission 
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // OTIMIZAÇÃO CPU: Atualiza variável CSS diretamente sem re-renderizar o React
    useEffect(() => {
        let ticking = false;
        
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    if (containerRef.current) {
                        // Atualiza apenas a variável CSS, o browser cuida do resto na GPU
                        containerRef.current.style.setProperty('--scroll-y', `${window.scrollY}px`);
                    }
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div ref={containerRef} className="min-h-screen bg-[#0a0a0a] text-stone-300 relative overflow-hidden font-sh-body selection:bg-red-900 selection:text-white">
            <SilentHillStyles />

            {/* --- LAYERS OTIMIZADAS --- */}
            
            {/* 1. Base Texture - Estática */}
            <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')] opacity-20 pointer-events-none mix-blend-overlay z-0 translate-z-0"></div>
            
            {/* 2. Fog Layers - Movidas via GPU (CSS Var) */}
            <div 
                className="fixed inset-0 pointer-events-none z-0 opacity-40 sh-fog-layer" 
                style={{ transform: 'translate3d(0, calc(var(--scroll-y) * 0.1), 0)' }}
            ></div>
            <div 
                className="fixed inset-0 pointer-events-none z-0 opacity-30 sh-fog-layer" 
                style={{ 
                    animationDuration: '40s', 
                    animationDirection: 'reverse', 
                    transform: 'translate3d(0, calc(var(--scroll-y) * 0.05), 0) scale(1.2)' 
                }}
            ></div>

            {/* 3. Vignette & Noise combinados visualmente (menos nodes no DOM) */}
            <div className="fixed inset-0 pointer-events-none z-10 bg-[radial-gradient(circle_at_center,transparent_10%,rgba(0,0,0,0.85)_90%,#000_100%)]"></div>
            <div className="fixed inset-0 sh-noise z-20 mix-blend-overlay"></div>

            {/* --- CONTEÚDO PRINCIPAL --- */}
            <div className="relative z-30 max-w-4xl mx-auto pt-16 pb-32 px-6">
                
                {/* Header Diegético */}
                <div className="flex justify-between items-end mb-8 border-b border-red-900/30 pb-4">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.4em] text-red-700 opacity-80 mb-2 font-bold animate-pulse">
                            Restless Dreams // Arquivo Encontrado
                        </p>
                        <h1 className="text-4xl md:text-5xl text-stone-100 font-sh-title uppercase tracking-widest text-shadow-sm">
                            {activity.title}
                        </h1>
                    </div>
                    <button 
                        onClick={onBack} 
                        className="group flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-red-500 transition-colors"
                    >
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">&lt;</span>
                        Sair da Névoa
                    </button>
                </div>

                {isSubmitted ? (
                    /* TELA DE RESULTADO - OTIMIZADA (Sem blur pesado) */
                    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center relative border border-red-900/30 bg-black/90 p-12 shadow-2xl">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20"></div>
                        <h2 className="text-5xl text-red-600 font-sh-title mb-6 tracking-[0.2em] uppercase">Registrado</h2>
                        <p className="text-stone-400 max-w-md mx-auto text-lg italic mb-8">
                            "Não há como voltar atrás agora. Suas escolhas foram gravadas na pedra."
                        </p>
                        
                        {submission?.feedback && (
                            <div className="w-full max-w-lg border-l-2 border-red-800 pl-6 py-2 text-left bg-red-900/10">
                                <p className="text-xs text-red-500 uppercase tracking-widest mb-2 font-bold">Observação do Supervisor:</p>
                                <p className="text-stone-300 font-sh-body leading-relaxed">
                                    "{submission.feedback}"
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    /* "MEMO" DO JOGO (PAPER STYLE) */
                    <div className="sh-paper relative transform rotate-[-0.5deg] p-8 md:p-12 text-stone-800 shadow-2xl">
                        {/* Manchas de "sujeira/idade" estáticas */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-stone-900/5 blur-2xl rounded-full pointer-events-none"></div>
                        <div className="absolute bottom-10 left-10 w-48 h-48 bg-yellow-900/5 blur-3xl rounded-full pointer-events-none"></div>

                        <div className="relative z-10">
                            <p className="text-lg font-medium italic border-l-2 border-stone-400 pl-4 mb-10 opacity-90">
                                "{activity.description}"
                            </p>

                            <div className="mb-12 relative z-20">
                                {renderComplexContent()}
                            </div>

                            <div className="space-y-12">
                                {items.map((item, idx) => (
                                    <div key={item.id} className="relative">
                                        <div className="flex items-baseline gap-3 mb-4">
                                            <span className="text-2xl font-sh-title text-red-900/80 font-bold">{idx + 1}.</span>
                                            <p className="text-lg font-bold text-stone-900 leading-snug">{item.question}</p>
                                        </div>

                                        {item.type === 'text' ? (
                                            <div className="relative mt-4">
                                                {/* CAMPO DE RESPOSTA (High Contrast) */}
                                                <div className="bg-[#f2e8d5] p-4 border-2 border-stone-600 shadow-[inset_0_0_20px_rgba(0,0,0,0.1)] relative transform rotate-[0.5deg]">
                                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-6 bg-red-900/20 rotate-[-2deg]"></div>
                                                    
                                                    <label className="text-[10px] text-stone-600 font-bold uppercase tracking-widest mb-2 block border-b border-stone-400/50 pb-1">
                                                        ANÁLISE DO ALUNO
                                                    </label>
                                                    <textarea
                                                        rows={6}
                                                        className="w-full bg-transparent border-none text-[#1a1a1a] text-lg leading-relaxed placeholder:text-stone-500 outline-none resize-y font-mono font-medium"
                                                        placeholder="Digite sua análise aqui..."
                                                        value={answers[item.id] || ''}
                                                        onChange={e => handleAnswerChange(item.id, e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-3 pl-2">
                                                {item.options?.map(opt => {
                                                    const isChecked = answers[item.id] === opt.id;
                                                    return (
                                                        <label 
                                                            key={opt.id} 
                                                            className={`flex items-start gap-4 p-3 cursor-pointer group transition-all ${isChecked ? 'bg-stone-900/5' : 'hover:bg-stone-900/5'}`}
                                                        >
                                                            <div className="relative flex-shrink-0 mt-1">
                                                                <input 
                                                                    type="radio" 
                                                                    name={`q-${item.id}`} 
                                                                    className="peer sr-only sh-checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => handleAnswerChange(item.id, opt.id)}
                                                                />
                                                                <div className="w-5 h-5 border-2 border-stone-600 peer-focus:ring-2 peer-focus:ring-red-500/50 transition-all rounded-sm flex items-center justify-center">
                                                                    {isChecked && (
                                                                        <div className="w-full h-full bg-red-900 opacity-80" style={{ clipPath: 'polygon(10% 10%, 90% 90%, 90% 10%, 10% 90%)' }}></div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <span className={`text-base ${isChecked ? 'font-bold text-red-900' : 'text-stone-800 group-hover:text-stone-900'}`}>
                                                                {opt.text}
                                                            </span>
                                                        </label>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* ENTER KEY BUTTON */}
                            <div className="mt-16 border-t-2 border-stone-400 pt-8 flex justify-end">
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="sh-enter-key relative px-8 py-4 w-full md:w-auto flex items-center justify-between gap-6 group overflow-hidden"
                                >
                                    <div className="flex flex-col items-start">
                                        <span className="text-red-500 text-xs font-bold uppercase tracking-[0.2em] mb-1">
                                            Confirmação
                                        </span>
                                        <span className="text-stone-300 text-xl font-sh-title font-bold tracking-widest group-hover:text-white transition-colors">
                                            {isSubmitting ? 'ENVIANDO...' : 'ENVIAR'}
                                        </span>
                                    </div>
                                    <div className="text-red-600 text-4xl group-hover:translate-x-1 transition-transform font-bold">
                                        ↵
                                    </div>
                                    <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none opacity-50"></div>
                                </button>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
