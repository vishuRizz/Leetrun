import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";

export const genAI = new GoogleGenerativeAI(apiKey);

export function getModel(modelName: string = "gemini-2.5-flash") {
  return genAI.getGenerativeModel({ model: modelName });
}
