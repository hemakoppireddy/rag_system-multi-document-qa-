import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config.js';

let openaiClient = null;
let geminiClient = null;

function getOpenAIClient() {
  if (!openaiClient && config.openaiApiKey) {
    openaiClient = new OpenAI({ apiKey: config.openaiApiKey });
  }
  return openaiClient;
}

function getGeminiClient() {
  if (!geminiClient && config.geminiApiKey) {
    geminiClient = new GoogleGenerativeAI(config.geminiApiKey);
  }
  return geminiClient;
}

export const FALLBACK_MESSAGE = 'I could not find an answer in the provided documents.';

export const SYSTEM_PROMPT = `You are an intelligent document assistant. You will be provided with context chunks from uploaded documents. Answer the user's question using ONLY the provided context. If the answer cannot be found in the context, you must reply exactly with: '${FALLBACK_MESSAGE}' Do not attempt to guess or use outside knowledge. For every claim you make, append a citation in the format [Filename, Page X].`;

/**
 * Formats retrieved context chunks into a structured prompt block.
 * @param {Array<{ metadata: object }>} chunks
 * @returns {string}
 */
export function formatContextBlock(chunks) {
  if (!chunks || chunks.length === 0) {
    return 'No relevant context available.';
  }

  const sections = chunks.map((c, idx) => {
    const meta = c.metadata || {};
    const filename = meta.filename || meta.document_name || 'Document';
    const pageNumber = meta.page_number || meta.pageNumber || 1;
    const text = meta.text || c.text || '';
    return `[Context Chunk ${idx + 1}]\nSource: ${filename} (Page ${pageNumber})\nText: ${text.trim()}`;
  });

  return `--- CONTEXT START ---\n${sections.join('\n\n')}\n--- CONTEXT END ---`;
}

/**
 * Parses citation tags like [filename.pdf, Page 14] or matches context chunks into structured citation objects.
 * @param {string} text - Generated answer text
 * @param {Array<{ metadata: object }>} contextChunks - Retrieved context chunks
 * @returns {Array<{ document_name: string, page_number: number }>}
 */
export function extractCitations(text, contextChunks = []) {
  const citationsMap = new Map();

  // 1. Regex parse explicitly formatted citations e.g. [employee_handbook.pdf, Page 14] or [doc.pdf, p. 2]
  const citationRegex = /\[([a-zA-Z0-9_\-\.\s]+?),\s*(?:Page|p\.?)\s*(\d+)\]/gi;
  let match;
  while ((match = citationRegex.exec(text)) !== null) {
    const docName = match[1].trim();
    const pageNum = parseInt(match[2], 10);
    const key = `${docName}-${pageNum}`;
    if (!citationsMap.has(key)) {
      citationsMap.set(key, {
        document_name: docName,
        page_number: pageNum,
      });
    }
  }

  // 2. If no inline citations were captured or if answer is not fallback, map to retrieved context chunks
  if (citationsMap.size === 0 && text !== FALLBACK_MESSAGE && contextChunks.length > 0) {
    for (const chunk of contextChunks) {
      const meta = chunk.metadata || {};
      const docName = meta.filename || meta.document_name;
      const pageNum = meta.page_number || meta.pageNumber || 1;
      if (docName) {
        const key = `${docName}-${pageNum}`;
        if (!citationsMap.has(key)) {
          citationsMap.set(key, {
            document_name: docName,
            page_number: pageNum,
          });
        }
      }
    }
  }

  return Array.from(citationsMap.values());
}

/**
 * Local deterministic generation engine (for offline testing and development).
 */
export function generateLocalResponse(query, contextChunks, history = []) {
  if (!contextChunks || contextChunks.length === 0) {
    return {
      answer: FALLBACK_MESSAGE,
      citations: [],
    };
  }

  const queryTerms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !['what', 'when', 'where', 'which', 'how', 'does', 'they', 'them', 'their', 'the', 'and', 'for'].includes(t));

  const matchingChunks = [];

  for (const chunk of contextChunks) {
    const text = (chunk.metadata?.text || chunk.text || '').toLowerCase();
    const matches = queryTerms.filter((term) => text.includes(term));
    if (matches.length > 0) {
      matchingChunks.push({ chunk, score: matches.length });
    }
  }

  if (matchingChunks.length === 0) {
    return {
      answer: FALLBACK_MESSAGE,
      citations: [],
    };
  }

  matchingChunks.sort((a, b) => b.score - a.score);
  const bestChunks = matchingChunks.slice(0, 3).map((m) => m.chunk);

  const sentences = [];
  const citations = [];

  for (const c of bestChunks) {
    const meta = c.metadata || {};
    const filename = meta.filename || 'document.pdf';
    const pageNumber = meta.page_number || 1;
    const text = meta.text || '';
    
    // Find relevant sentence
    const sents = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 10);
    for (const sent of sents) {
      const sentLower = sent.toLowerCase();
      const hasTerm = queryTerms.some((t) => sentLower.includes(t));
      if (hasTerm && !sentences.some(s => s.text === sent.trim())) {
        sentences.push({
          text: sent.trim(),
          citation: `[${filename}, Page ${pageNumber}]`,
        });
        const citKey = `${filename}-${pageNumber}`;
        if (!citations.some((cit) => cit.document_name === filename && cit.page_number === pageNumber)) {
          citations.push({
            document_name: filename,
            page_number: pageNumber,
          });
        }
      }
    }
  }

  if (sentences.length === 0) {
    return {
      answer: FALLBACK_MESSAGE,
      citations: [],
    };
  }

  const answer = sentences.map((s) => `${s.text} ${s.citation}`).join(' ');

  return {
    answer,
    citations,
  };
}

/**
 * Generates an answer from an LLM based strictly on the provided context and history.
 * @param {Object} options
 * @param {string} options.query - User question
 * @param {Array<{ metadata: object }>} options.contextChunks - Retrieved Top-K chunks
 * @param {Array<{ role: string, content: string }>} [options.history] - Prior chat turns
 * @param {string} [options.provider] - 'openai' | 'gemini' | 'local'
 * @returns {Promise<{ answer: string, citations: Array<{ document_name: string, page_number: number }> }>}
 */
export async function generateResponse({ query, contextChunks = [], history = [], provider = null }) {
  // If zero chunks provided (due to similarity threshold filtering), return graceful failure immediately
  if (!contextChunks || contextChunks.length === 0) {
    return {
      answer: FALLBACK_MESSAGE,
      citations: [],
    };
  }

  const activeProvider = provider || (config.openaiApiKey ? 'openai' : config.geminiApiKey ? 'gemini' : 'local');

  if (activeProvider === 'local') {
    return generateLocalResponse(query, contextChunks, history);
  }

  const formattedContext = formatContextBlock(contextChunks);

  if (activeProvider === 'openai') {
    try {
      const openai = getOpenAIClient();
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
      ];

      // Inject prior conversation history turns
      if (Array.isArray(history) && history.length > 0) {
        for (const msg of history) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            messages.push({
              role: msg.role,
              content: msg.content,
            });
          }
        }
      }

      // Inject current turn with context block
      messages.push({
        role: 'user',
        content: `CONTEXT INFORMATION:\n${formattedContext}\n\nUSER QUESTION: ${query}\n\nRemember: Answer ONLY from the context and append citations [Filename, Page X] for every fact. If not present in context, reply exactly with: '${FALLBACK_MESSAGE}'`,
      });

      const completion = await openai.chat.completions.create({
        model: config.llmModel || 'gpt-4o-mini',
        messages,
        temperature: 0.0, // Strict deterministic output
      });

      const answer = completion.choices[0]?.message?.content?.trim() || FALLBACK_MESSAGE;
      const citations = answer === FALLBACK_MESSAGE ? [] : extractCitations(answer, contextChunks);

      return {
        answer,
        citations,
      };
    } catch (err) {
      console.warn('OpenAI Chat Completion failed, falling back to local engine:', err.message);
      return generateLocalResponse(query, contextChunks, history);
    }
  }

  if (activeProvider === 'gemini') {
    try {
      const genAI = getGeminiClient();
      const model = genAI.getGenerativeModel({
        model: config.llmModel || 'gemini-2.5-flash',
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: {
          temperature: 0.0,
        },
      });

      const promptParts = [];
      if (Array.isArray(history) && history.length > 0) {
        promptParts.push('PREVIOUS CONVERSATION:');
        for (const msg of history) {
          promptParts.push(`${msg.role.toUpperCase()}: ${msg.content}`);
        }
        promptParts.push('\n');
      }

      promptParts.push(`CONTEXT INFORMATION:\n${formattedContext}\n\nUSER QUESTION: ${query}`);

      const result = await model.generateContent(promptParts.join('\n'));
      const answer = result.response.text()?.trim() || FALLBACK_MESSAGE;
      const citations = answer === FALLBACK_MESSAGE ? [] : extractCitations(answer, contextChunks);

      return {
        answer,
        citations,
      };
    } catch (err) {
      console.warn('Gemini Generation failed, falling back to local engine:', err.message);
      return generateLocalResponse(query, contextChunks, history);
    }
  }

  return generateLocalResponse(query, contextChunks, history);
}

export default {
  FALLBACK_MESSAGE,
  SYSTEM_PROMPT,
  formatContextBlock,
  extractCitations,
  generateLocalResponse,
  generateResponse,
};
