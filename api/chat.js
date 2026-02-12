const ALLOWED_ORIGINS = [
  "https://ericliu-eng.github.io",
  "https://our-love-rosy.vercel.app",
];

function isAllowed(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  return /^https:\/\/our-love-[a-z0-9-]+\.vercel\.app$/.test(origin);
}

export default async function handler(req, res) {
  const origin = req.headers.origin;

  // 预检请求也要走同样 CORS 逻辑
  if (isAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  } else if (origin) {
    // 有 origin 但不在白名单：直接拒绝，方便你排错
    return res.status(403).json({ error: "CORS blocked", origin });
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  // ===== Gemini Key =====
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Missing GEMINI_API_KEY" });

  const model = "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const messages = body?.messages || [];

  const prompt = messages
    .map((m) => `${String(m.role || "").toUpperCase()}: ${String(m.content || "")}`)
    .join("\n");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: "Gemini API error", details: data });
    }

    const aiReply =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("") || "";

    return res.status(200).json({
      choices: [{ message: { content: aiReply || "(empty reply)" } }],
      raw: data,
    });
  } catch (e) {
    return res.status(500).json({ error: "Gemini request failed", details: String(e) });
  }
}
