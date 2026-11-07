
(function () {
  "use strict";

  const LOCAL_BANK_URL = "/questions.json";

  const EXTERNAL_EXAMS = [
    {
      name: "CKAI - Đề luyện thi Pháp luật chứng khoán 01",
      url: "https://quiz.ckai.vn/mon/phap-luat/de/de-01"
    }
  ];

  function normalizeQuestion(q, index) {
    if (!q || typeof q !== "object") return null;

    const question = String(q.question || "").trim();

    const options = Array.isArray(q.options)
      ? q.options.map(x => String(x || "").trim())
      : [];

    const answer = Number(q.answer);

    if (!question || options.length !== 4) return null;
    if (options.some(x => !x)) return null;

    if (
      !Number.isInteger(answer) ||
      answer < 0 ||
      answer > 3
    ) return null;

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

  async function loadQuestionBank() {
    const response = await fetch(
      LOCAL_BANK_URL + "?t=" + Date.now(),
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(
        "Không tải được questions.json: HTTP " + response.status
      );
    }

    let data;

    try {
      data = await response.json();
    } catch (error) {
      throw new Error("questions.json không đúng định dạng JSON");
    }

    const rawQuestions = Array.isArray(data)
      ? data
      : data.questions;

    if (!Array.isArray(rawQuestions)) {
      throw new Error(
        "Không tìm thấy danh sách questions trong JSON"
      );
    }

    const questions = rawQuestions
      .map(normalizeQuestion)
      .filter(Boolean);

    console.log("[LUATCK] Tổng câu trong file:", rawQuestions.length);
    console.log("[LUATCK] Câu đã xác minh:", questions.length);

    return {
      questions: questions,
      source: LOCAL_BANK_URL
    };
  }

  window.LUATCK = {
    loadQuestionBank: loadQuestionBank,
    externalExams: EXTERNAL_EXAMS
  };

})();
