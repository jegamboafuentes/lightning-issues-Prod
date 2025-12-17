import { GoogleGenerativeAI } from "@google/generative-ai";
import { IssueSuggestion } from "../types";

// Initialize the SDK with the key from Vite's environment
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");

export const parseRepoUrl = (url: string): { owner: string; name: string } | null => {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname !== 'github.com') return null;
    const parts = urlObj.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], name: parts[1] };
  } catch (e) {
    return null;
  }
};

export const generateIssueSuggestions = async (
  repoUrl: string, 
  projectGoals?: string, 
  scanTodos?: boolean
): Promise<IssueSuggestion[]> => {
  const repoInfo = parseRepoUrl(repoUrl);
  if (!repoInfo) {
    throw new Error("Invalid GitHub URL");
  }

  // Model name used for generation
  const modelName = "gemini-1.5-flash"; 
  
  let specificInstructions = "";
  if (projectGoals && projectGoals.trim()) {
    specificInstructions += `\nThe user has specified Project Goals: "${projectGoals}". Ensure at least one suggestion aligns with these.\n`;
  }

  if (scanTodos) {
    specificInstructions += `\nScan for "TODO", "FIXME", or "HACK" comments in the code and prioritize them.\n`;
  }

  const perspectives = [
    "Focus on Code Quality", "Focus on UX & Accessibility", "Focus on Performance",
    "Focus on Security", "Focus on Documentation", "Focus on Edge Cases",
    "Focus on Developer Experience", "Focus on Modernization", "Focus on Community Health", "Focus on Testing"
  ];
  
  const p1 = perspectives[Math.floor(Math.random() * perspectives.length)];
  const p2 = perspectives[Math.floor(Math.random() * perspectives.length)];
  const combinedPerspective = p1 === p2 ? p1 : `${p1} AND ${p2}`;
  const randomSeed = Date.now();

  const prompt = `
    Analyze this repository: ${repoUrl}
    Context ID: ${randomSeed}
    Lens: "${combinedPerspective}"
    
    Provide 3 distinct, specific issues in a valid JSON array format.
    Include "title", "body" (Markdown), "type", and "reasoning".
    ${specificInstructions}
  `;

  try {
    // Correct initialization pattern for @google/generative-ai
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      tools: [{ googleSearch: {} }] as any
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    if (!text) {
      throw new Error("No data received from AI");
    }

    // Robust JSON extraction
    let jsonStr = text.trim();
    const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '');

    return JSON.parse(jsonStr) as IssueSuggestion[];

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to generate suggestions. Check if your API key is valid and the model is available.");
  }
};