(function () {
  "use strict";

  const LOCAL_BANK_URL = "/questions.json";

  async function loadQuestionBank() {
    try {
      const response = await fetch(
        `${LOCAL_BANK_URL}?t=${Date.now()}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      const questions = Array.isArray(data)
        ? data
        : data.questions;

      if (!Array.isArray(questions)) {
        throw new Error("Invalid question bank format");
      }

      const validQuestions = questions
        .map(normalizeQuestion)
        .filter(Boolean);

      console.log(
        `[LUATCK] Loaded ${validQuestions.length} questions`
      );

      return validQuestions;
    } catch (error) {
      console.error("[LUATCK] Question bank error:", error);
      return [];
    }
  }

  function normalizeQuestion(q, index) {
    if (!q || typeof q !== "object") return null;

    const question = String(q.question || "").trim();
    const options = Array.isArray(q.options)
      ? q.options.map(x => String(x).trim())
      : [];

    const answer = Number(q.answer);

    if (!question || options.length !== 4) return null;
    if (options.some(x => !x)) return null;
    if (!Number.isInteger(answer) || answer < 0 || answer > 3) {
      return null;
    }

    // Chỉ đưa câu đã được kiểm tra vào ngân hàng chính thức.
    if (q.verified !== true) return null;

    return {
      id: q.id || `LUATCK-${index + 1}`,
      question,
      options,
      answer,
      explanation: String(q.explanation || ""),
      source_url: String(q.source_url || ""),
      topic: String(q.topic || ""),
      category: String(q.category || "law"),
      difficulty: String(q.difficulty || "basic")
    };
  }

  window.LUATCK = {
    loadQuestionBank,
    externalExams: []
  };
})();
