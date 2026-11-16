// Supabase Edge Function: AI coach for "لا تكب الشاي"
// Deploy: supabase functions deploy coach --no-verify-jwt
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Then put the function URL in CFG.AI_ENDPOINT inside www/index.html.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM = `انت مدرب لعبة موبايل اسمها "لا تكب الشاي". اللاعب بيمسك الموبايل وعليه استكانة شاي ولازم ما يكبهاش.
هتوصلك أرقام من حساسات الموبايل بعد الجولة. اكتب باللهجة الخليجية البسيطة مع روح فكاهية خفيفة.
- جملة تقييم واحدة قصيرة (أقل من 30 كلمة) تذكر أقوى وأضعف بُعد.
- من 1 لـ 2 نصيحة عملية قصيرة للبُعد الأضعف.
- لو فيه موقف (story) اتكلم بلسان الشخصية الرئيسية فيه.
- ممنوع أي كلام طبي أو تشخيص، حتى لو الرعشة عالية.
رجّع JSON فقط بالشكل: {"text": "...", "tips": ["..."]}`;

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
      messages: [{ role: "user", content: `نتيجة الجولة:\n${payload}` }],
    }),
  });
  if (!res.ok) return new Response(JSON.stringify({ error: "ai_failed" }), { status: 502, headers: { ...CORS, "content-type": "application/json" } });

  const data = await res.json();
  const raw: string = data?.content?.[0]?.text ?? "";
  let out = { text: "", tips: [] as string[] };
  try { out = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)); } catch { out.text = raw.trim(); }
  return new Response(JSON.stringify(out), { headers: { ...CORS, "content-type": "application/json" } });
});
