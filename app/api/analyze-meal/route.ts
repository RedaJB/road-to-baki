import { NextRequest, NextResponse } from 'next/server';

const GEMINI_SYSTEM_PROMPT = `Tu es un nutritionniste. Regarde la photo du repas, identifie chaque aliment visible et estime sa quantité (assiette standard, couverts et emballages comme repères d'échelle), puis additionne les valeurs nutritionnelles de toute la portion visible.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour ni balises Markdown :
{"nom_plat": "Nom court du plat en français", "calories_kcal": 0, "proteines_g": 0, "glucides_g": 0, "lipides_g": 0}
Si la photo ne montre pas de nourriture, renvoie nom_plat "" et toutes les valeurs à 0.`;

export interface AnalyzeMealResponse {
  nom_plat: string;
  calories_kcal: number;
  proteines_g: number;
  glucides_g: number;
  lipides_g: number;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB decoded
const REQUEST_TIMEOUT_MS = 25_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 12;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type RateLimitEntry = { count: number; resetAt: number };
const rateLimitStore = new Map<string, RateLimitEntry>();

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  const realIp = request.headers.get('x-real-ip');
  return realIp || 'unknown';
}

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const existing = rateLimitStore.get(clientId);
  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  existing.count += 1;
  rateLimitStore.set(clientId, existing);
  return existing.count > RATE_LIMIT_MAX_REQUESTS;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY non configurée. Ajoute-la dans .env.local' },
      { status: 503 }
    );
  }

  let body: { imageBase64?: string; mimeType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 });
  }

  const imageBase64 = body.imageBase64?.replace(/^data:image\/\w+;base64,/, '') ?? '';
  const mimeType = body.mimeType || 'image/jpeg';
  if (!imageBase64) {
    return NextResponse.json({ error: 'imageBase64 requis' }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json({ error: 'Format image non supporte' }, { status: 400 });
  }

  const approxBytes = Math.floor((imageBase64.length * 3) / 4);
  if (approxBytes > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'Image trop volumineuse (max 5MB)' }, { status: 413 });
  }

  const clientId = getClientIp(request);
  if (isRateLimited(clientId)) {
    return NextResponse.json({ error: 'Trop de requetes, reessaie plus tard' }, { status: 429 });
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const payload = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: imageBase64,
            },
          },
          {
            text: GEMINI_SYSTEM_PROMPT,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      // gemini-2.x flash réfléchit par défaut : inutile ici, et ça mangerait les tokens de sortie
      // gemini-3+ : réflexion courte, la réponse arrive bien plus vite
      ...(/^gemini-2\.\d+-flash/.test(model) ? { thinkingConfig: { thinkingBudget: 0 } } : /^gemini-[3-9]/.test(model) ? { thinkingConfig: { thinkingLevel: 'low' } } : {}),
    },
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      console.error('[analyze-meal] Gemini', res.status, detail?.error?.status, detail?.error?.message);
      return NextResponse.json({ error: 'Service d analyse indisponible' }, { status: 502 });
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json(
        { error: 'Réponse Gemini vide ou invalide' },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(text.trim().replace(/^```(?:json)?|```$/g, '')) as AnalyzeMealResponse;
    const result: AnalyzeMealResponse = {
      nom_plat: String(parsed.nom_plat ?? '').slice(0, 200),
      calories_kcal: Math.max(0, Number(parsed.calories_kcal) || 0),
      proteines_g: Math.max(0, Number(parsed.proteines_g) || 0),
      glucides_g: Math.max(0, Number(parsed.glucides_g) || 0),
      lipides_g: Math.max(0, Number(parsed.lipides_g) || 0),
    };
    return NextResponse.json(result);
  } catch (e) {
    const isTimeout = e instanceof Error && e.name === 'AbortError';
    return NextResponse.json(
      { error: isTimeout ? 'Le service a mis trop de temps a repondre' : 'Analyse impossible' },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
