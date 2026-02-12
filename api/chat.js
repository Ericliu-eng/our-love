export default async function handler(req, res) {
  // ===== 1) CORS =====
  const origin = req.headers.origin || "";

  // 允许的来源：你的 GitHub Pages + 本地 + 任何 vercel.app 预览域名
  const allowList = new Set([
    "https://ericliu-eng.github.io",
    "http://localhost:3000",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
  ]);

  const isVercelPreview =
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin) ||
    /^https:\/\/[a-z0-9-]+-[a-z0-9-]+\.vercel\.app$/i.test(origin);

  const allowOrigin = allowList.has(origin) || isVercelPreview ? origin : "https://ericliu-eng.github.io";

  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  // ===== 2) 读取 Key =====
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });

  // ===== 3) 解析请求体 =====
  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: "Bad JSON", details: String(e) });
  }

  const messages = body?.messages || [];
  const systemPrompt = messages.find((m) => m.role === "system")?.content || "";
  const userPrompt = messages.find((m) => m.role === "user")?.content || "";

  // ===== 4) 调 OpenAI Responses API =====
  try {
    const model = process.env.OPENAI_MODEL || "gpt-4o"; // gpt-4o 官方模型 :contentReference[oaicite:1]{index=1}

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: systemPrompt || "You are a helpful assistant.",
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        // 可选：控制输出长度
        max_output_tokens: 300,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "OpenAI API error",
        details: data,
      });
    }

    // Responses API 的安全取文本（兼容多段输出）
    const reply =
      data?.output?.[0]?.content
        ?.map((c) => (typeof c?.text === "string" ? c.text : ""))
        .filter(Boolean)
        .join("") ||
      data?.output_text ||
      "";

    // 保持你前端不改：伪装成 OpenAI chat.completions 的 choices 格式
    return res.status(200).json({
      choices: [{ message: { content: reply || "(empty reply)" } }],
      raw: data,
    });
  } catch (e) {
    console.error("OpenAI Error:", e);
    return res.status(500).json({ error: "OpenAI 暂时迷路了...", details: String(e) });
  }
}
