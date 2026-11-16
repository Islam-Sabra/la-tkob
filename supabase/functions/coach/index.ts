// Supabase Edge Function: AI coach for "Don't Spill the Tea"
// Deploy: supabase functions deploy coach --no-verify-jwt
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Then put the function URL in CFG.AI_ENDPOINT inside www/index.html.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM = `You are the coach in a mobile game called "Don't Spill the Tea". The player holds a phone with a full tea glass on screen and must not spill it.
You receive phone-sensor metrics from one round. Write in short, playful English.
- One assessment sentence (under 30 words) naming the strongest and weakest dimension.
- 1-2 short practical tips for the weakest dimension.
- If a story is present, speak as that story's main character.
- No medical claims or diagnosis, even if tremor is high.
Return JSON only: {"text": "...", "tips": ["..."]}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  let body: unknown;
  try { body = await req.json(); } catch { return new Response("Bad JSON", { status: 400, headers: CORS }); }
  const payload = JSON.stringify(body).slice(0, 4000); // keep the prompt small

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-5-5",
      max_tokens: 300,
      system: SYSTEM,
      messages: [{ role: "user", content: `Round result:\n${payload}` }],
    }),
  });
  if (!res.ok) return new Response(JSON.stringify({ error: "ai_failed" }), { status: 502, headers: { ...CORS, "content-type": "application/json" } });

  const data = await res.json();
  const raw: string = data?.content?.[0]?.text ?? "";
  let out = { text: "", tips: [] as string[] };
  try { out = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)); } catch { out.text = raw.trim(); }
  return new Response(JSON.stringify(out), { headers: { ...CORS, "content-type": "application/json" } });
});
