
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Chỉ hỗ trợ POST." });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Chưa cấu hình GEMINI_API_KEY trên Vercel."
    });
  }

  try {
    let body = req.body || {};

    if (typeof body === "string") {
      body = JSON.parse(body);
    }

    const count = Math.min(
      Math.max(parseInt(body.count, 10) || 8, 1),
      8
    );

    const categories = {
      all: "Tất cả chủ đề",
      general: "Kiến thức chung về chứng khoán",
      market: "Thị trường chứng khoán",
      company: "Công ty đại chúng và quản trị công ty",
      disclosure: "Công bố thông tin",
      conduct: "Hành vi vi phạm và đạo đức nghề nghiệp"
    };

    const category = categories[body.category] || categories.all;

    const difficulty = ["basic", "advanced"].includes(body.difficulty)
      ? body.difficulty
      : "mixed";

    const difficultyText = {
      basic: "Cơ bản, kiểm tra kiến thức nền tảng",
      advanced: "Nâng cao, có tình huống vận dụng",
      mixed: "Kết hợp cơ bản, thông hiểu và vận dụng"
    }[difficulty];

    const prompt = `
Bạn là chuyên gia biên soạn câu hỏi ôn tập kiến thức chứng khoán Việt Nam.

Hãy tạo đúng ${count} câu hỏi trắc nghiệm bằng tiếng Việt.

CHỦ ĐỀ: ${category}
ĐỘ KHÓ: ${difficultyText}

YÊU CẦU:
1. Mỗi câu có đúng 4 lựa chọn A, B, C, D.
2. Chỉ có một đáp án đúng.
3. Nội dung rõ ràng, không đánh đố bằng câu chữ mơ hồ.
4. Có câu hỏi về Luật Chứng khoán Việt Nam, thị trường chứng khoán, công ty đại chúng, công bố thông tin, đạo đức và hành vi bị cấm.
5. Không tự bịa số điều, khoản, mức phạt, thời hạn hoặc ngưỡng sở hữu.
6. Nếu không chắc điều khoản pháp luật cụ thể, chỉ ghi tên văn bản tham khảo và yêu cầu người học đối chiếu văn bản hiện hành.
7. Không khẳng định câu hỏi là câu hỏi thi chính thức hoặc câu hỏi đã xuất hiện trong đề thi thật.
8. Tránh lặp lại cùng một ý hỏi trong một lần tạo.
9. Trả lời bằng JSON hợp lệ, không dùng Markdown, không thêm lời dẫn.
10. Giá trị c là chỉ số đáp án đúng: 0, 1, 2 hoặc 3.
11. cat chỉ được là một trong các giá trị: general, market, company, disclosure, conduct.
12. level chỉ được là basic hoặc advanced.

ĐỊNH DẠNG JSON BẮT BUỘC:
{
  "questions": [
    {
      "q": "Nội dung câu hỏi",
      "a": ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],
      "c": 0,
      "e": "Giải thích vì sao đáp án đúng.",
      "cat": "general",
      "level": "basic",
      "law": "Tên văn bản hoặc nguồn kiến thức tham khảo"
    }
  ]
}

Chỉ trả về JSON.
`;

    const model = "gemini-3.1-flash-lite";
    const endpoint =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      model +
      ":generateContent?key=" +
      encodeURIComponent(apiKey);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    let response;

    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7,
            maxOutputTokens: 5000
          }
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    const result = await response.json();

    if (!response.ok) {
      const message =
        result?.error?.message || "Gemini API trả về lỗi.";

      return res.status(response.status === 429 ? 429 : 502).json({
        error: message
      });
    }

    const text =
      result?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("") || "";

    if (!text) {
      return res.status(502).json({
        error: "Gemini không trả về nội dung câu hỏi."
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch {
      const cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "");

      parsed = JSON.parse(cleaned);
    }

    const allowedCategories = [
      "general",
      "market",
      "company",
      "disclosure",
      "conduct"
    ];

    const questions = (parsed.questions || [])
      .filter(q =>
        q &&
        typeof q.q === "string" &&
        Array.isArray(q.a) &&
        q.a.length === 4 &&
        q.a.every(x => typeof x === "string") &&
        Number.isInteger(q.c) &&
        q.c >= 0 &&
        q.c <= 3
      )
      .slice(0, count)
      .map(q => ({
        q: q.q.slice(0, 1000),
        a: q.a.map(x => x.slice(0, 500)),
        c: q.c,
        e: String(q.e || "Hãy đối chiếu văn bản pháp luật hiện hành.")
          .slice(0, 1500),
        cat: allowedCategories.includes(q.cat) ? q.cat : "general",
        level: q.level === "advanced" ? "advanced" : "basic",
        law: String(q.law || "Cần đối chiếu văn bản pháp luật hiện hành.")
          .slice(0, 300),
        source: "AI"
      }));

    if (questions.length === 0) {
      return res.status(502).json({
        error: "AI không tạo được câu hỏi đúng định dạng."
      });
    }

    return res.status(200).json({
      success: true,
      model,
      count: questions.length,
      questions
    });

  } catch (error) {
    console.error("Generate API error:", error);

    return res.status(500).json({
      error: error.name === "AbortError"
        ? "Gemini phản hồi quá thời gian. Vui lòng thử lại."
        : "Không thể tạo câu hỏi AI. Vui lòng thử lại."
    });
  }
};
