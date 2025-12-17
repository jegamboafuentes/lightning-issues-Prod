import { GoogleGenerativeAI } from "@google/generative-ai"; // Fixed import
import { IssueSuggestion, IssueType } from "../types";

// Fixed constructor pattern
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

  const modelName = "gemini-1.5-flash"; // Fixed version typo
  
  let specificInstructions = "";
  if (projectGoals && projectGoals.trim()) {
    specificInstructions += `\nThe user has specified the following Project Goals: "${projectGoals}". Please ensure at least one suggested issue aligns directly with these goals.\n`;
  }

  if (scanTodos) {
    specificInstructions += `\nCRITICAL INSTRUCTION: The user wants to scan for existing TODOs. Use Google Search to specifically look for "TODO", "FIXME" or "HACK" comments in the repository code (e.g. search query 'site:github.com/${repoInfo.owner}/${repoInfo.name} "TODO"'). If you find relevant TODOs, prioritize creating an issue to resolve them.\n`;
  }

  const perspectives = [
    "Focus strictly on Code Quality", "Focus on UX & Accessibility", "Focus on Performance", 
    "Focus on Security", "Focus on Documentation", "Focus on Edge Cases", 
    "Focus on DevEx", "Focus on Modernization", "Focus on Community Health", "Focus on Testing"
  ];
  
  const p1 = perspectives[Math.floor(Math.random() * perspectives.length)];
  const p2 = perspectives[Math.floor(Math.random() * perspectives.length)];
  const combinedPerspective = p1 === p2 ? p1 : `${p1} AND ${p2}`;
  const randomSeed = Date.now();

  const prompt = `Analyze this repository: ${repoUrl} through the lens of "${combinedPerspective}". 
  (Context ID: ${randomSeed}). Provide 3 specific issue suggestions in valid JSON format. ${specificInstructions}`;

  try {
    // Fixed API calling pattern
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      tools: [{ googleSearch: {} }] as any
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    if (!text) throw new Error("No data received from AI");

    let jsonStr = text.trim();
    const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (jsonMatch) jsonStr = jsonMatch[0];
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '');

    return JSON.parse(jsonStr) as IssueSuggestion[];

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to generate suggestions");
  }
};