module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    // Vercel 里 req.body 有时是对象，有时是字符串
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const payload = {
      model: body.model || "deepseek-chat",
      messages: body.messages || [],
      temperature: body.temperature ?? 0.7,
    };

    const r = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await r.text(); // 先拿原始文本，避免 json parse 崩
    res.status(r.status).setHeader("Content-Type", "application/json").send(text);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
};
