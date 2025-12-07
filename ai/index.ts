import { getOpenRouterModel } from "@/lib/ai/openrouter";

console.log('Creating Gemini Pro model...');
export const geminiProModel = getOpenRouterModel("google/gemini-3-pro-preview");
console.log('Gemini Pro model created:', !!geminiProModel);

console.log('Creating Gemini Flash model...');
export const geminiFlashModel = getOpenRouterModel("google/gemini-2.0-flash-exp");
console.log('Gemini Flash model created:', !!geminiFlashModel);
