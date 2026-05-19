import OpenAI from 'openai'

export const openrouter = new OpenAI({
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
  apiKey: process.env.GEMINI_API_KEY,
})

export const QUERY_MODEL = 'gemini-3.1-flash-lite'
