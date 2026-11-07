
/*
 LUATCK V3.1 - QUESTION BANK LOADER

 Nguồn hỗ trợ:
 1. API JSON bạn được quyền sử dụng.
 2. File questions.json trong GitHub.
 3. Không tự sinh câu hỏi.
 4. Không tự đoán đáp án.
*/

(function () {
  "use strict";

  // Nếu có API ngân hàng riêng, điền URL tại đây.
  // API phải cho phép CORS từ website LUATCK.
  const REMOTE_BANK_URL = "";

  // Ngân hàng dự phòng trong repository GitHub.
  const LOCAL_BANK_URL = "/questions.json";

  const EXTERNAL_EXAMS = [
    {
      name: "CKAI - Đề số 1",
      url: "https://quiz.ckai.vn/mon/phap-luat/de/de-01"
    },
    {
      name: "CKAI - Đề số 3",
      url: "https://quiz.ckai.vn/mon/phap-luat/de/de-03"
    },
    {
      name: "CKAI - Đề số 4",
      url: "https://quiz.ckai.vn/mon/phap-luat/de/de-04"
    },
    {
      name: "CKAI - Đề số 8",
      url: "https://quiz.ckai.vn/mon/phap-luat/de/de-08"
    },
    {
      name: "CKAI - Đề số 10",
      url: "https://quiz.ckai.vn/mon/phap-luat/de/de-10"
    },
    {
      name: "CKAI - Đề số 12",
      url: "https://quiz.ckai.vn/mon/phap-luat/de/de-12"
    }
  ];

  function normalizeQuestion(q) {
    if (!q || typeof q !== "object") return null;

    const question = String(q.question || q.q || "").trim();
    const options = q.options || q.a;

    if (!question || !Array.isArray(options) || options.length !== 4) {
      return null;
    }

    const answer = Number(q.answer ?? q.c);

    if (!Number.isInteger(answer) || answer < 0 || answer > 3) {
      return null;
    }

    const sourceUrl = String(q.source_url || "").trim();

    // Chỉ nhận câu đã được xác minh và có nguồn.
    if (q.verified !== true || !sourceUrl) {
      return null;
    }

    try {
      const parsedUrl = new URL(sourceUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return null;
      }
    } catch {
      return null;
    }

    if (!options.every(x => typeof x === "string" && x.trim())) {
      return null;
    }

    return {
      id: String(q.id || ""),
      question,
      options: options.map(x => x.trim()),
      answer,
      explanation: String(q.explanation || ""),
      category: String(q.category || "law"),
      topic: String(q.topic || "Pháp luật chứng khoán"),
      difficulty: q.difficulty === "advanced"
        ? "advanced"
        : "basic",
      source_name: String(q.source_name || ""),
      source_url: sourceUrl,
      law_reference: String(q.law_reference || ""),
      verified: true
    };
  }

  async function fetchBank(url) {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error("Không tải được ngân hàng: HTTP " + response.status);
    }

    const data = await response.json();

    const list = Array.isArray(data)
      ? data
      : data.questions;

    if (!Array.isArray(list)) {
      throw new Error("Dữ liệu ngân hàng không đúng định dạng.");
    }

    return list.map(normalizeQuestion).filter(Boolean);
  }

  async function loadQuestionBank() {
    // Ưu tiên API riêng nếu đã cấu hình.
    if (REMOTE_BANK_URL) {
      try {
        const questions = await fetchBank(REMOTE_BANK_URL);
        if (questions.length) {
          return {
            questions,
            source: "Remote API"
          };
        }
      } catch (error) {
        console.warn("Remote bank:", error.message);
      }
    }

    // Nếu API lỗi, tải file JSON trong GitHub.
    const questions = await fetchBank(LOCAL_BANK_URL);

    return {
      questions,
      source: "GitHub questions.json"
    };
  }

  window.LUATCK = {
    loadQuestionBank,
    externalExams: EXTERNAL_EXAMS
  };
})();
