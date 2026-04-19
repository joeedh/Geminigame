interface FetchRetryOptions extends RequestInit {
  retries?: number[];
}

interface ApiErrorBody {
  error?: { message?: string };
}

interface PredictResponse {
  predictions?: { bytesBase64Encoded: string }[];
}

interface GenerateContentPart {
  inlineData?: { data?: string; mimeType?: string };
  text?: string;
}

interface GenerateContentResponse {
  candidates?: { content?: { parts?: GenerateContentPart[] } }[];
}

const DEFAULT_RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000];

export async function apiFetch<T>(url: string, options: FetchRetryOptions): Promise<T> {
  const { retries = DEFAULT_RETRY_DELAYS, ...init } = options;
  let lastError: unknown = null;
  for (let i = 0; i <= retries.length; i++) {
    try {
      const response = await fetch(url, init);
      const data = (await response.json()) as T & ApiErrorBody;
      if (response.ok) return data;
      if (i === retries.length) {
        throw new Error(data.error?.message ?? 'Generation failed.');
      }
      lastError = new Error(data.error?.message ?? 'Generation failed.');
    } catch (e) {
      lastError = e;
      if (i === retries.length) throw e;
    }
    await new Promise((r) => setTimeout(r, retries[i] ?? 1000));
  }
  throw lastError instanceof Error ? lastError : new Error('apiFetch exhausted retries');
}

export async function fetchAIImage(prompt: string, apiKey: string): Promise<HTMLImageElement> {
  const data = await apiFetch<PredictResponse>(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
    {
      method: 'POST',
      body: JSON.stringify({ instances: { prompt }, parameters: { sampleCount: 1 } }),
    },
  );
  const prediction = data.predictions?.[0];
  if (!prediction) throw new Error('Image prediction returned empty result.');
  const img = new Image();
  img.src = `data:image/png;base64,${prediction.bytesBase64Encoded}`;
  await img.decode();
  return img;
}

export async function refineImageWithAI(
  img: HTMLImageElement,
  theme: string,
  apiKey: string,
): Promise<HTMLImageElement> {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = img.width;
  tempCanvas.height = img.height;
  const tCtx = tempCanvas.getContext('2d');
  if (!tCtx) throw new Error('Failed to acquire 2D context for refinement.');
  tCtx.drawImage(img, 0, 0);
  const base64Data = tempCanvas.toDataURL('image/png').split(',')[1];
  const prompt = `Refine this game asset tileset. Enhance detail for ${theme}. Keep 2x2 grid.`;
  const data = await apiFetch<GenerateContentResponse>(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }, { inlineData: { mimeType: 'image/png', data: base64Data } }],
          },
        ],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    },
  );
  const refinedBase64 = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData
    ?.data;
  if (!refinedBase64) throw new Error('Refinement pass failed.');
  const refinedImg = new Image();
  refinedImg.src = `data:image/png;base64,${refinedBase64}`;
  await refinedImg.decode();
  return refinedImg;
}
