import OpenAI from 'openai';

export const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export function estimateTokens(str) {
  if (!str) return 0;
  return Math.ceil(str.length / 4); // груба оцінка (≈4 символи/токен)
}
