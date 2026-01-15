
import React, { useState, useRef, useEffect } from 'react';
import { Modal } from './Modal';

interface LegalModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'terms' | 'privacy';
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, initialTab = 'terms' }) => {
    const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab);
    const [hasReadBottom, setHasReadBottom] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
            setHasReadBottom(false);
        }
    }, [isOpen, initialTab]);

    // Check scroll position
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        // Tolerance of 5px
        if (scrollHeight - scrollTop <= clientHeight + 5) {
            setHasReadBottom(true);
        }
    };

    const handleAccept = () => {
        if (hasReadBottom) {
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Informações Legais" size="lg">
            <div className="flex flex-col h-[70vh] md:h-[600px]">
                {/* Tabs */}
                <div className="flex border-b border-white/10 mb-4">
                    <button
                        onClick={() => { setActiveTab('terms'); setHasReadBottom(false); }}
                        className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${
                            activeTab === 'terms' 
                            ? 'text-brand border-b-2 border-brand bg-white/5' 
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        Termos de Uso
                    </button>
                    <button
                        onClick={() => { setActiveTab('privacy'); setHasReadBottom(false); }}
                        className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${
                            activeTab === 'privacy' 
                            ? 'text-brand border-b-2 border-brand bg-white/5' 
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        Política de Privacidade
                    </button>
                </div>

                {/* Content Area with Scroll Detection */}
                <div 
                    ref={contentRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-[#09090b] border border-white/10 rounded-lg text-slate-300 text-sm leading-relaxed"
                >
                    {activeTab === 'terms' ? (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white">1. Aceitação dos Termos</h3>
                            <p>Ao acessar e usar a plataforma Lumen Education, você aceita e concorda em estar vinculado aos termos e provisões deste acordo.</p>
                            
                            <h3 className="text-lg font-bold text-white">2. Uso Educacional</h3>
                            <p>Esta plataforma destina-se exclusivamente a fins educacionais. O conteúdo disponibilizado, incluindo módulos, quizzes e atividades, é propriedade intelectual da escola ou de seus licenciadores.</p>
                            
                            <h3 className="text-lg font-bold text-white">3. Conduta do Usuário</h3>
                            <p>Você concorda em usar o site apenas para fins legais e de uma maneira que não infrinja os direitos de, restrinja ou iniba o uso e aproveitamento do site por qualquer terceiro.</p>
                            
                            <h3 className="text-lg font-bold text-white">4. Integridade Acadêmica</h3>
                            <p>Tentativas de burlar sistemas de avaliação, compartilhar respostas ou acessar áreas restritas (como consoles de administração) resultarão em medidas disciplinares.</p>
                            
                            <h3 className="text-lg font-bold text-white">5. Modificações</h3>
                            <p>Reservamo-nos o direito de modificar estes termos a qualquer momento. O uso continuado da plataforma significará sua aceitação de quaisquer ajustes a estes termos.</p>
                            
                            <div className="h-20" /> {/* Spacer to force scroll */}
                            <p className="text-xs text-slate-500 text-center italic">--- Fim do Documento ---</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white">1. Coleta de Dados</h3>
                            <p>Coletamos informações fornecidas diretamente por você, como nome, email, série escolar e dados de desempenho acadêmico (notas, progresso).</p>
                            
                            <h3 className="text-lg font-bold text-white">2. Uso das Informações</h3>
                            <p>Utilizamos seus dados para fornecer, manter e melhorar nossos serviços educacionais, incluindo a personalização de conteúdo via IA e geração de relatórios para professores.</p>
                            
                            <h3 className="text-lg font-bold text-white">3. Armazenamento Local (Cookies)</h3>
                            <p>Utilizamos LocalStorage e Cookies para manter sua sessão ativa, salvar preferências de tema e garantir a funcionalidade offline da aplicação.</p>
                            
                            <h3 className="text-lg font-bold text-white">4. Compartilhamento</h3>
                            <p>Seus dados acadêmicos são compartilhados apenas com a instituição de ensino (professores, direção e secretaria) e responsáveis legais vinculados.</p>
                            
                            <h3 className="text-lg font-bold text-white">5. Segurança</h3>
                            <p>Implementamos medidas de segurança para proteger suas informações contra acesso não autorizado, alteração ou destruição.</p>
                            
                            <div className="h-20" /> {/* Spacer to force scroll */}
                            <p className="text-xs text-slate-500 text-center italic">--- Fim do Documento ---</p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="pt-4 mt-2 flex justify-between items-center border-t border-white/10">
                    <p className="text-xs text-slate-500">
                        {hasReadBottom ? "Obrigado por ler." : "Por favor, leia até o final para concordar."}
                    </p>
                    <div className="flex gap-2">
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 text-slate-400 hover:text-white font-bold text-sm transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleAccept}
                            disabled={!hasReadBottom}
                            className={`
                                px-6 py-2 rounded-lg font-bold text-black text-sm uppercase tracking-wide transition-all
                                ${hasReadBottom 
                                    ? 'bg-brand hover:bg-brand/90 hover:shadow-[0_0_15px_rgba(var(--brand-rgb),0.4)] cursor-pointer' 
                                    : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'}
                            `}
                        >
                            Concordar
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
