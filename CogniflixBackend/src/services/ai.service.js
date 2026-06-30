import { GoogleGenAI } from '@google/genai';
import db from '../config/db.js';

let ai = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } else {
    console.warn("GEMINI_API_KEY is not set. AI recommendations will be disabled.");
  }
} catch (error) {
  console.error("Failed to initialize GoogleGenAI:", error);
}

export async function getAiRecommendations(candidates, userContext, topK) {
  if (!ai) return candidates.slice(0, topK); // Fallback

  try {
    const candidateList = candidates.map(c => ({
      id: c.id,
      title: c.title,
      genre: c.genre,
      description: c.description
    }));

    const prompt = `
      You are an advanced AI recommendation engine for a premium streaming platform.
      
      User Context:
      - Mood: ${userContext.mood || 'Any'}
      - Language: ${userContext.language || 'Any'}
      - Preferred Region: ${userContext.region || 'Any'}
      
      Below is a list of candidate movies and web series available in our database. 
      Select exactly ${Math.min(topK, candidateList.length)} items that best match the user's context.
      Return ONLY a JSON array of the selected item IDs. Do not include markdown formatting or any other text.
      
      Candidates:
      ${JSON.stringify(candidateList)}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text();
    let selectedIds = [];
    try {
      selectedIds = JSON.parse(text);
      if (!Array.isArray(selectedIds)) selectedIds = [];
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON", text);
      return candidates.slice(0, topK);
    }

    const recommendedItems = [];
    for (const id of selectedIds) {
      const item = candidates.find(c => String(c.id) === String(id));
      if (item) recommendedItems.push(item);
    }
    
    // Fill the rest if AI returned fewer than requested
    if (recommendedItems.length < topK) {
      for (const c of candidates) {
        if (!recommendedItems.find(r => r.id === c.id)) {
          recommendedItems.push(c);
          if (recommendedItems.length >= topK) break;
        }
      }
    }

    return recommendedItems;
  } catch (error) {
    console.error("AI Recommendation Error:", error);
    return candidates.slice(0, topK);
  }
}
