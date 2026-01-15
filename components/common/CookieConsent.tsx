
import React, { useState, useEffect } from 'react';
import { LegalModal } from './LegalModal';

export const CookieConsent: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);

    useEffect(() => {
        const accepted = localStorage.getItem('cookie_accepted');
        if (!accepted) {
            setIsVisible(true);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookie_accepted', 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <>
            <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 animate-slide-in">
                <div className="max-w-5xl mx-auto bg-[#09090b]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
                    <div className="p-6 md:flex md:items-center md:justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">🍪</span>
                                <h3 className="text-lg font-bold text-white">Controle de Dados</h3>
                            </div>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Utilizamos cookies e armazenamento local para melhorar sua experiência, manter sua sessão segura e salvar suas preferências de tema. 
                                Ao continuar, você concorda com nossa <button onClick={() => setIsLegalModalOpen(true)} className="text-brand hover:underline font-bold">Política de Privacidade</button>.
                            </p>
                            
                            {showDetails && (
                                <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs animate-fade-in">
                                    <div className="bg-white/5 p-3 rounded border border-white/5">
                                        <p className="font-bold text-white mb-1">Essenciais</p>
                                        <ul className="text-slate-400 list-disc pl-4 space-y-1">
                                            <li>Token de Autenticação (Firebase)</li>
                                            <li>Preferências de Acessibilidade</li>
                                        </ul>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded border border-white/5">
                                        <p className="font-bold text-white mb-1">Performance</p>
                                        <ul className="text-slate-400 list-disc pl-4 space-y-1">
                                            <li>Cache de Módulos (Offline)</li>
                                            <li>Configuração de Tema</li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 md:mt-0 flex flex-col sm:flex-row gap-3 flex-shrink-0">
                            <button 
                                onClick={() => setShowDetails(!showDetails)}
                                className="px-4 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm font-bold hover:bg-white/5 transition-colors"
                            >
                                {showDetails ? 'Ocultar Detalhes' : 'Ver Detalhes'}
                            </button>
                            <button 
                                onClick={handleAccept}
                                className="px-6 py-2.5 rounded-lg bg-brand text-black text-sm font-bold uppercase tracking-wide hover:bg-brand/90 hover:shadow-[0_0_15px_rgba(var(--brand-rgb),0.4)] transition-all"
                            >
                                Concordar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <LegalModal 
                isOpen={isLegalModalOpen} 
                onClose={() => setIsLegalModalOpen(false)} 
                initialTab="privacy"
            />
        </>
    );
};
