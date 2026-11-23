// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const MAX_BASE64_CHARS = 8_000_000; // ~6 MB de imagen

// Errores temporales de Gemini: merece la pena reintentar
const ESTADOS_REINTENTABLES = new Set([429, 500, 502, 503, 504]);
const INTENTOS = 2;
const PRESUPUESTO_MS = 55_000; // tiempo máximo TOTAL hablando con Gemini
const TIMEOUT_INTENTO_MS = 25_000; // tiempo máximo de cada llamada

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Solo usuarios con sesión iniciada pueden usar el escáner.
// La clave pública (anon) por sí sola no es un usuario y se rechaza.
async function usuarioAutenticado(req: Request): Promise<boolean> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const { data, error } = await supabase.auth.getUser(token);
  return !error && !!data.user;
}

const PROMPT = `Analiza este ticket de supermercado con precisión.
Extrae el establecimiento, la fecha (YYYY-MM-DD, o cadena vacía si no aparece) y cada línea de artículo comprado.
Reglas:
1. 'nombre_ticket': texto literal impreso en el ticket.
2. 'nombre_normalizado': traduce abreviaturas crípticas a un nombre humano, limpio y genérico (ej. "L.SEMI HACEND 6X1" -> "Leche Semidesnatada Pack 6", "PECH.POLLO FIL." -> "Pechuga de Pollo Fileteada").
3. 'cantidad': número entero de unidades (si es al peso, pon 1).
4. 'precio_unitario': precio por unidad (numérico). Si la línea muestra cantidad e importe total, divide el total entre la cantidad. En productos al peso, el importe de la línea.
5. 'es_descartable': true si es bolsa de plástico, descuento, cupón, IVA, total o cualquier línea no inventariable.
Si la imagen no es un ticket legible, devuelve la lista de items vacía.`;

const responseSchema = {
  type: "OBJECT",
  properties: {
    establecimiento_detectado: { type: "STRING" },
    fecha: { type: "STRING" },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          nombre_ticket: { type: "STRING" },
          nombre_normalizado: { type: "STRING" },
          cantidad: { type: "INTEGER" },
          precio_unitario: { type: "NUMBER" },
          es_descartable: { type: "BOOLEAN" },
        },
        required: ["nombre_ticket", "nombre_normalizado", "cantidad", "precio_unitario", "es_descartable"],
      },
    },
  },
  required: ["establecimiento_detectado", "fecha", "items"],
};

// Llama a Gemini respetando un límite de tiempo (marca de tiempo absoluta).
// Cada intento tiene su propio timeout; un timeout se trata como error 504.
async function llamarGemini(
  modelo: string,
  apiKey: string,
  cuerpo: string,
  limite: number,
): Promise<Response> {
  let res: Response = new Response("sin tiempo", { status: 504 });

  for (let intento = 0; intento < INTENTOS; intento++) {
    const restante = limite - Date.now();
    if (restante < 3000) break;

    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: cuerpo,
          signal: AbortSignal.timeout(Math.min(TIMEOUT_INTENTO_MS, restante)),
        },
      );
    } catch (e) {
      console.warn(`Gemini sin respuesta a tiempo (${modelo}): ${e}`);
      res = new Response("timeout", { status: 504 });
    }

    if (res.ok || !ESTADOS_REINTENTABLES.has(res.status)) return res;
    console.warn(`Gemini ${res.status} con ${modelo} (intento ${intento + 1}/${INTENTOS})`);
    if (intento < INTENTOS - 1) await esperar(1000);
  }
  return res;
}

const mensajeError = (status: number, modelo: string, detalle: string) => {
  if (status === 503) return "Gemini está saturado ahora mismo. Inténtalo de nuevo en unos minutos.";
  if (status === 504) return "Gemini tarda demasiado en responder. Inténtalo de nuevo en unos minutos.";
  if (status === 429) return "Se ha superado el límite de uso de Gemini. Espera un poco e inténtalo de nuevo.";
  return `Gemini (${status}, modelo ${modelo}): ${detalle.slice(0, 200)}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!(await usuarioAutenticado(req))) {
    return json({ error: "Inicia sesión para usar el escáner de tickets." }, 401);
  }

  const inicio = Date.now();

  try {
    const { imageBase64, mimeType = "image/jpeg" } = await req.json();
    if (!imageBase64) return json({ error: "No se proporcionó ninguna imagen." }, 400);

    const cleanBase64 = String(imageBase64).replace(/^data:[\w/+.-]+;base64,/, "");
    if (cleanBase64.length > MAX_BASE64_CHARS) {
      return json({ error: "La imagen es demasiado grande." }, 413);
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "GEMINI_API_KEY no configurada en Supabase Secrets." }, 500);

    const modeloPrincipal = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.8-flash";
    const modeloRespaldo = Deno.env.get("GEMINI_FALLBACK_MODEL") ?? "gemini-3.5-flash-lite";

    const cuerpo = JSON.stringify({
      contents: [
        { parts: [{ text: PROMPT }, { inlineData: { mimeType, data: cleanBase64 } }] },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const limite = inicio + PRESUPUESTO_MS;
    let modeloUsado = modeloPrincipal;
    let geminiRes = await llamarGemini(modeloUsado, apiKey, cuerpo, limite);

    // Si el principal falla por algo temporal y queda tiempo, probar el de respaldo
    if (
      !geminiRes.ok &&
      ESTADOS_REINTENTABLES.has(geminiRes.status) &&
      modeloRespaldo &&
      modeloRespaldo !== modeloPrincipal &&
      limite - Date.now() > 5000
    ) {
      console.warn(`Probando modelo de respaldo: ${modeloRespaldo}`);
      const respaldoRes = await llamarGemini(modeloRespaldo, apiKey, cuerpo, limite);
      if (respaldoRes.ok) {
        geminiRes = respaldoRes;
        modeloUsado = modeloRespaldo;
      }
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error", geminiRes.status, modeloUsado, `${Date.now() - inicio} ms`, errText);
      let detalle = "";
      try { detalle = JSON.parse(errText)?.error?.message ?? ""; } catch { /* ignorar */ }
      return json({ error: mensajeError(geminiRes.status, modeloUsado, detalle) }, 502);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return json({ error: "Gemini no devolvió contenido estructurado." }, 502);

    const parsed = JSON.parse(rawText);
    const items = (Array.isArray(parsed.items) ? parsed.items : []).map((i: any) => ({
      nombre_ticket: String(i.nombre_ticket ?? ""),
      nombre_normalizado: String(i.nombre_normalizado ?? i.nombre_ticket ?? ""),
      cantidad: Math.max(1, Math.round(Number(i.cantidad) || 1)),
      precio_unitario: Number(i.precio_unitario) || 0,
      es_descartable: Boolean(i.es_descartable),
    }));

    console.log(`Ticket leído con ${modeloUsado} en ${Date.now() - inicio} ms (${items.length} líneas)`);

    return json({
      establecimiento_detectado: String(parsed.establecimiento_detectado ?? ""),
      fecha: String(parsed.fecha ?? ""),
      items,
    });
  } catch (error) {
    console.error(error);
    return json({ error: (error as Error).message }, 500);
  }
});