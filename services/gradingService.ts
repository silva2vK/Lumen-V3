import { auth } from '../components/firebaseClient';

export interface StreamingGradingResult {
    finalGrade: number;
    fullFeedback: string;
}

/**
 * Envia a resposta do aluno para avaliação via Gemini 3 Pro (via Proxy).
 * Utiliza a estratégia "Lente Semântica" para feedback estruturado e pedagógico.
 */
export async function streamGradingFeedback(
    question: string,
    answer: string,
    maxPoints: number,
    onChunk: (text: string) => void
): Promise<StreamingGradingResult> {
    
    if (!answer || answer.trim() === "") {
        return { finalGrade: 0, fullFeedback: "Não houve resposta para esta questão." };
    }

    // Prompt Engineering: Lente Semântica
    const prompt = `
    Atue como um Tutor de História Sênior utilizando a **Lente Semântica**.
    
    Analise a resposta do aluno para a questão abaixo com foco em:
    1. Precisão Conceitual (Uso correto de termos históricos).
    2. Estrutura Lógica (Coerência do argumento).
    3. Contextualização (Conexão com o período histórico).

    ---
    Enunciado: "${question}"
    Resposta do Aluno: "${answer}"
    Valor da Questão: ${maxPoints} pontos
    ---

    Instruções de Saída:
    1. Forneça um **Feedback Pedagógico** direto ao aluno (use Markdown para negrito em conceitos chave).
    2. Se a resposta estiver correta, elogie especificamente o acerto. Se estiver errada ou incompleta, explique o conceito correto de forma socrática.
    3. Ao final, estritamente na última linha, atribua a nota no formato: [[GRADE: <numero>]]
    
    Exemplo de saída:
    Você identificou corretamente o conceito de **Mais Valia**, mas esqueceu de mencionar o contexto da Revolução Industrial.
    [[GRADE: 7.5]]
    `;

    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Usuário não autenticado.");
        const token = await user.getIdToken();

        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                // Usando Gemini 3 Pro para raciocínio complexo de avaliação
                model: 'gemini-3-pro-preview',
                contents: [{ parts: [{ text: prompt }] }],
                config: {
                    temperature: 0.2, // Baixa temperatura para avaliação consistente
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Erro na IA: ${response.statusText}`);
        }

        const data = await response.json();
        const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        
        if (fullText) {
            onChunk(fullText);
        }

        let finalGrade = 0;

        // Extração robusta da nota
        const gradeMatch = fullText.match(/\[\[GRADE:\s*([\d\.,]+)\s*\]\]/);
        if (gradeMatch) {
            const gradeString = gradeMatch[1].replace(',', '.');
            finalGrade = parseFloat(gradeString);
        } else {
            console.warn("Could not parse grade from AI response. Defaulting to 0.");
        }

        // Clamp grade
        finalGrade = Math.max(0, Math.min(finalGrade, maxPoints));

        return {
            finalGrade,
            fullFeedback: fullText
        };

    } catch (error) {
        console.error("Error in AI Grading Service:", error);
        throw error;
    }
}