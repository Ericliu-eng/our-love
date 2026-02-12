// api/test.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // 1. 检查环境变量是否读取成功
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "环境变量 GEMINI_API_KEY 未找到！" });
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    // 2. 发起一个极其简单的测试请求
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("你好，请回复'API测试成功'");
    const response = await result.response;
    
    // 3. 返回成功结果
    res.status(200).json({ 
      status: "Success",
      message: response.text()
    });
  } catch (error) {
    // 4. 返回详细错误（比如 API Key 无效或地区不支持）
    res.status(500).json({ 
      status: "Error",
      error: error.message 
    });
  }
}
