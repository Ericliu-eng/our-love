// api/chat.js
const ALLOWED_ORIGINS = [
  "https://ericliu-eng.github.io",
  "https://our-love-rosy.vercel.app"
];

function isAllowed(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  return /^https:\/\/our-love-[a-z0-9-]+\.vercel\.app$/.test(origin);
}

export default async function handler(req, res) {
  const origin = req.headers.origin;

  // --- CORS 核心配置 ---
  if (isAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    // 降级处理，允许你的主域名
    res.setHeader("Access-Control-Allow-Origin", "https://ericliu-eng.github.io");
  }
  
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // 处理浏览器的预检请求 (OPTIONS)
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // 只允许 POST 请求
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // --- Gemini API 调用 ---
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "服务器未配置 API Key" });
  }

  const model = "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    // 解析 Body (处理字符串或对象)
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const messages = body?.messages || [];

    // 将对话历史转换为 Gemini 接受的格式
    // 简单的做法是拼接成一段 Text
    const promptText = messages
      .map(m => `${m.role === 'system' ? 'Instructions' : m.role.toUpperCase()}: ${m.content}`)
      .join("\n");

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: promptText }]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: "Gemini API Error", details: data });
    }

    // 安全提取 AI 回复内容
    const aiReply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "AI 暂时没有回应";

    // 返回 OpenAI 兼容格式，方便前端处理
    return res.status(200).json({
      choices: [{
        message: { content: aiReply }
      }]
    });

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}
