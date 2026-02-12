// 允许的固定域名
const ALLOWED_ORIGINS = [
  "https://ericliu-eng.github.io",   // GitHub Pages
  "https://our-love-rosy.vercel.app" // 你的 Vercel 主站
];

// 允许所有 Vercel preview: https://our-love-xxxx.vercel.app
function isAllowed(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;

  return /^https:\/\/our-love-[a-z0-9-]+\.vercel\.app$/.test(origin);
}

export default async function handler(req, res) {
  // CORS（建议加，避免某些情况下浏览器预检/跨域问题）
  res.setHeader("Access-Control-Allow-Origin", "https://ericliu-eng.github.io");
  res.setHeader("Vary", "Origin");
  const origin = req.headers.origin;

  // ===== CORS =====
  if (isAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  // 预检请求
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // 只允许 POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // ===== Gemini Key =====
const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
  if (!apiKey) {
    return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
  }

const model = "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // 兼容：有时 req.body 是字符串
  // 兼容 body 是字符串
const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

const messages = body?.messages || [];
  const systemPrompt = messages.find((m) => m.role === "system")?.content || "";
  const userPrompt = messages.find((m) => m.role === "user")?.content || "";

  // ===== 拼接上下文 =====
  const prompt = messages
    .map((m) => `${String(m.role || "").toUpperCase()}: ${String(m.content || "")}`)
    .join("\n");

try {
const response = await fetch(url, {
@@ -30,35 +62,41 @@ export default async function handler(req, res) {
contents: [
{
role: "user",
            parts: [{ text: `System: ${systemPrompt}\nUser: ${userPrompt}` }],
            parts: [{ text: prompt }],
},
],
}),
});

const data = await response.json();

    // ⭐ 关键：Gemini 若返回错误（401/400/429等），直接把错误返回给前端
    // ===== Gemini 报错直接透传 =====
if (!response.ok) {
return res.status(response.status).json({
error: "Gemini API error",
        details: data, // 前端能看到真实原因
        details: data,
});
}

    // ⭐ 关键：安全取值，永不读 undefined[0]
    // ===== 安全读取回复 =====
const aiReply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("") ||
      "";
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .filter(Boolean)
        .join("") || "";

    // 仍然伪装成 OpenAI 格式，保持你 index.html 不用改
    // ===== 返回前端（兼容 OpenAI 结构）=====
return res.status(200).json({
choices: [{ message: { content: aiReply || "(empty reply)" } }],
raw: data,
});

} catch (e) {
console.error("Gemini Error:", e);
    return res.status(500).json({ error: "Gemini 暂时迷路了...", details: String(e) });

    return res.status(500).json({
      error: "Gemini request failed",
      details: String(e),
    });
}
}
