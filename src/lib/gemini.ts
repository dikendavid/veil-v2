import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function verifyProfileTone(bio: string) {
  if (!bio) return { isProfessional: false, score: 0, suggestion: 'Empty bio' };
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        As a elite concierge for VEIL, a discreet dating app for high-value Nigerian professionals (30+).
        Analyze the following bio for professional tone, discretion, and high-status signal.
        
        Bio: "${bio}"
        
        Return a JSON response with:
        - isProfessional: boolean
        - score: number (1-10)
        - suggestion: string (brief suggestion to make it more professional or discreet)
        
        BE STRICT. VEIL is for the top 1%. Reject slang, overt sexual references, or low-effort text.
      `,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || '{}';
    return JSON.parse(text);
  } catch (error) {
    console.error('Gemini Error:', error);
    return { isProfessional: true, score: 5, suggestion: 'Verification system offline.' };
  }
}
