export default async function handler(req, res) {
    const apiKey = process.env.GEMINI_API_KEY; // 读取你刚设置的环境变量
    const model = "gemini-1.5-flash"; // 使用快速且免费额度高的 Flash 模型
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // 获取前端传来的消息
    const messages = req.body.messages;
    const systemPrompt = messages.find(m => m.role === 'system')?.content || "";
    const userPrompt = messages.find(m => m.role === 'user')?.content || "";

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `System: ${systemPrompt}\nUser: ${userPrompt}`
                    }]
                }]
            })
        });

        const data = await response.json();
        
        // 解析 Gemini 的返回格式并伪装成 OpenAI 格式，这样你 index.html 的逻辑就不用改了
        const aiReply = data.candidates[0].content.parts[0].text;

        res.status(200).json({
            choices: [{
                message: { content: aiReply }
            }]
        });
    } catch (e) {
        console.error("Gemini Error:", e);
        res.status(500).json({ error: "Gemini 暂时迷路了..." });
    }
}
