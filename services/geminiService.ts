import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Match, Tip, SportType } from "../types";

// Initialize Gemini Client
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const tipSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    prediction: { type: Type.STRING, description: "The betting tip, e.g., 'Over 2.5 Goals' or 'Lakers -5.5'" },
    confidence: { type: Type.INTEGER, description: "Confidence percentage 0-100" },
    reasoning: { type: Type.STRING, description: "Brief analysis explaining the tip based on stats." },
    odds: { type: Type.NUMBER, description: "Estimated decimal odds for this market." }
  },
  required: ["prediction", "confidence", "reasoning", "odds"],
};

export const generateAnalysis = async (match: Match): Promise<Partial<Tip> | null> => {
  if (!apiKey) {
    console.error("API Key is missing");
    return null;
  }

  try {
    const modelId = "gemini-2.5-flash"; // Efficient for structured data tasks
    
    const prompt = `
      Act as a professional high-stakes sports analyst for the 'Monkey Tips' system.
      Analyze the following match data and generate a high-value betting tip.
      
      Sport: ${match.sport}
      Match: ${match.teamA} vs ${match.teamB}
      League: ${match.league}
      Stats: ${JSON.stringify(match.stats)}
      
      Consider tactical setups, recent form, and specific sport metrics (xG for football, Pace for basketball, etc).
      Return JSON only.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: tipSchema,
        temperature: 0.3, // Lower temperature for more analytical/consistent results
      },
    });

    const text = response.text;
    if (!text) return null;

    const data = JSON.parse(text);

    return {
      prediction: data.prediction,
      confidence: data.confidence,
      reasoning: data.reasoning,
      odds: data.odds,
    };

  } catch (error) {
    console.error("Error generating sports analysis:", error);
    return null;
  }
};

export const generateBulkInsights = async (matches: Match[]): Promise<Tip[]> => {
  const tips: Tip[] = [];
  
  // In a real app, we might parallelize this, but we'll do sequential for simplicity/rate limits
  for (const match of matches) {
    const analysis = await generateAnalysis(match);
    if (analysis) {
      tips.push({
        id: `tip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        matchId: match.id,
        matchTitle: `${match.teamA} x ${match.teamB}`,
        sport: match.sport,
        prediction: analysis.prediction || "N/A",
        confidence: analysis.confidence || 0,
        reasoning: analysis.reasoning || "No analysis available.",
        odds: analysis.odds || 1.5,
        createdAt: new Date().toISOString(),
        isPremium: false
      });
    }
  }
  return tips;
};