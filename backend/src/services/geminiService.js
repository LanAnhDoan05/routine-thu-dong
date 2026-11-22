const { GoogleGenAI } = require('@google/genai');

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const FALLBACK_MODELS = ['gemini-3.1-flash-lite', 'gemini-3-flash-preview'];
let client;
let configuredApiKey;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  if (!client || configuredApiKey !== apiKey) {
    const timeout = Number(process.env.GEMINI_TIMEOUT_MS) || 15000;
    client = new GoogleGenAI({
      apiKey,
      httpOptions: { timeout },
    });
    configuredApiKey = apiKey;
  }

  return client;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isDailyQuotaExhausted(error) {
  const msg = String(error?.message || '');
  return error?.status === 429 && (
    msg.includes('Quota exceeded') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('free_tier_requests') ||
    msg.includes('per day limit exceeded')
  );
}

function isTransientError(error) {
  const status = Number(error?.status || error?.code);
  return [429, 500, 502, 503, 504].includes(status);
}

async function executeWithRetry(ai, modelName, contents, config) {
  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const startTime = Date.now();
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config,
      });
      const duration = Date.now() - startTime;
      console.info(`[geminiService] Request model=${modelName} succeeded (attempt ${attempt}, ${duration}ms)`);
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      const status = error?.status || error?.code || 'unknown';
      console.warn(`[geminiService] Request model=${modelName} failed with status=${status} (attempt ${attempt}, ${duration}ms)`);

      // If daily quota is exhausted, no point in retrying the same model
      if (isDailyQuotaExhausted(error)) {
        console.warn(`[geminiService] Model ${modelName} daily quota exhausted, aborting retries for this model.`);
        throw error;
      }

      // If transient error and have remaining attempts, backoff and retry once
      if (attempt < maxAttempts && isTransientError(error)) {
        const backoffMs = attempt * 800;
        console.info(`[geminiService] Waiting ${backoffMs}ms before retrying model=${modelName}...`);
        await delay(backoffMs);
      } else {
        throw error;
      }
    }
  }
  return null;
}

async function generateContentResponse({
  contents,
  systemInstruction,
  model,
  temperature = 0.2,
  maxOutputTokens = 800,
  responseMimeType,
  tools,
}) {
  const ai = getClient();
  if (!ai) {
    console.warn('[geminiService] Gemini client not initialized (GEMINI_API_KEY missing).');
    return null;
  }

  const primaryModel = model || process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const candidateModels = [
    primaryModel,
    ...FALLBACK_MODELS.filter((m) => m !== primaryModel),
  ];

  const config = {
    temperature,
    maxOutputTokens,
    ...(systemInstruction ? { systemInstruction } : {}),
    ...(responseMimeType ? { responseMimeType } : {}),
    ...(tools ? { tools } : {}),
  };

  for (let i = 0; i < candidateModels.length; i += 1) {
    const targetModel = candidateModels[i];
    try {
      const response = await executeWithRetry(ai, targetModel, contents, config);
      if (response) return response;
    } catch (error) {
      const status = error?.status || error?.code || 'unknown';
      console.warn(`[geminiService] Model ${targetModel} attempt failed (${status}).`);

      const hasNext = i + 1 < candidateModels.length;
      if (hasNext) {
        console.info(`[geminiService] Falling back to model=${candidateModels[i + 1]}...`);
        await delay(300);
      }
    }
  }

  console.error('[geminiService] All Gemini candidate models failed to return content.');
  return null;
}

async function generateContent(options) {
  const response = await generateContentResponse(options);
  return typeof response?.text === 'string' ? response.text.trim() || null : null;
}

module.exports = {
  DEFAULT_MODEL,
  FALLBACK_MODELS,
  generateContent,
  generateContentResponse,
};
