
import { GoogleGenAI } from "@google/genai";
import type { Student, CampaignSegment } from '../types';

// Try multiple env variable names to support different bundlers/setups.
const API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.API_KEY ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env
    ? (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.GEMINI_API_KEY
    : undefined);

if (!API_KEY) {
  // This is a fallback for development and will show in the UI.
  // In a real production environment, the key should be securely provided.
  console.warn("API_KEY environment variable not set. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const generateMotivationalMessage = async (student: Student): Promise<string> => {
  if (!API_KEY) {
    return "La funcionalidad de IA está deshabilitada. Por favor, configure la clave de API.";
  }

  const prompt = `
    Eres un Sensei de artes marciales muy inspirador y moderno. 
    Tu tarea es generar un mensaje corto (2-3 frases), personalizado y motivador para uno de tus alumnos.
    El mensaje debe ser entregado como una notificación push.
    
    Aquí están los datos del alumno:
    - Nombre: ${student.name}
    - Disciplina: ${student.discipline}
    - Cinturón Actual: ${student.belt}
    - Estado de Pago: ${student.paymentStatus}
    - Tiempo en el dojo: Se unió el ${new Date(student.joinDate).toLocaleDateString()}

    Considera su perfil para personalizar el mensaje. Por ejemplo:
    - Si su pago está pendiente o vencido, anímale a volver a clase y menciona sutilmente que se ponga al día.
    - Si es un alumno avanzado, habla de liderazgo y de ser un ejemplo.
    - Si es más nuevo, elógia su progreso y constancia.

  El tono debe ser enérgico, positivo y un poco "tech", en línea con la identidad de la Academia Nacional de Artes Marciales.
    Usa emojis apropiados como 🥋, 🔥, 💪, ✨.

    Genera solo el texto del mensaje, sin saludos adicionales como "Hola Sensei".
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Hubo un error al generar el mensaje. Inténtalo de nuevo.";
  }
};

interface CampaignPromptContext {
  segment: CampaignSegment;
  customPrompt?: string;
}

const buildCampaignPrompt = (segment: CampaignSegment, customPrompt?: string) => {
  const base = `Eres el Sensei digital de la Academia Nacional de Artes Marciales. Genera un mensaje breve (2-3 frases) para toda una campaña dirigida al segmento "${segment}". Debe ser motivador, claro, con tono energizante y moderno. Usa emojis contextuales y termina con un llamado a la acción.`;

  const segmentGuidance: Record<CampaignSegment, string> = {
    'Todos': 'Mensaje general de entusiasmo, invitando a todos a mantener la constancia y asistir a la próxima sesión destacada.',
    'Riesgo Alto': 'Enfatiza apoyo personalizado, ofrece acompañamiento y destaca los beneficios de regresar ya mismo. Empatiza con sus dificultades.',
    'Pagos Pendientes': 'Recuerda amable pero directamente la importancia de ponerse al día para seguir avanzando. Ofrece ayuda para regularizar el pago.',
    'Nuevos Ingresos': 'Da la bienvenida, refuerza que están en el camino correcto y ofrece tips para la primera semana.',
    'Avanzados': 'Invita a liderar, a inspirar a los más nuevos y a participar en retos especiales para cinturones avanzados.',
  };

  const extra = customPrompt ? `Información extra del sensei: ${customPrompt}` : '';
  return `${base}\n\nContexto adicional: ${segmentGuidance[segment]}\n${extra}\n\nGenera solo el texto. No incluyas saludos tipo "Hola" y manténlo en primera persona plural.`;
};

export const generateCampaignMessage = async ({ segment, customPrompt }: CampaignPromptContext): Promise<string> => {
  if (!API_KEY) {
    return "La funcionalidad de IA está deshabilitada. Por favor, configure la clave de API.";
  }

  const prompt = buildCampaignPrompt(segment, customPrompt);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    console.error('Error generating campaign message:', error);
    return 'No se pudo generar el mensaje de campaña. Inténtalo más tarde.';
  }
};

export const generateStudentInsightMessage = async (student: Student): Promise<string> => {
  if (!API_KEY) {
    return "La funcionalidad de IA está deshabilitada. Por favor, configure la clave de API.";
  }

  const prompt = `
    Analiza el siguiente perfil de estudiante y genera un insight breve y accionable (2-3 oraciones) 
    que ayude al instructor a mejorar la retención y compromiso del alumno.

    Datos del estudiante:
    - Nombre: ${student.name}
    - Disciplina: ${student.discipline}
    - Cinturón: ${student.belt}
    - Nivel de Riesgo: ${student.riskLevel}
    - Estado de Pago: ${student.paymentStatus}
    - Fecha de ingreso: ${new Date(student.joinDate).toLocaleDateString()}

    Considera:
    - Si el riesgo es alto, sugiere acciones concretas para retención
    - Si hay pagos pendientes, recomienda estrategias de regularización
    - Para cinturones avanzados, enfócate en liderazgo y mentoría
    - Para principiantes, sugiere formas de fortalecer el compromiso

    Formato deseado:
    - Primera oración: Observación principal sobre el estado actual
    - Segunda oración: Recomendación específica y accionable
    - (Opcional) Tercera oración: Beneficio esperado de la acción

    El tono debe ser profesional pero cercano, orientado a resultados.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Hubo un error al generar el insight. Inténtalo de nuevo.";
  }
};
