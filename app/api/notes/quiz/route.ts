import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

function buildPrompt(topic: string) {
  return `You are a system design interviewer. Generate a short multiple-choice quiz to test understanding of the topic: "${topic}".

Rules:
- Produce 4 questions, each with exactly 4 options.
- Exactly one option is correct.
- Questions should be conceptual and interview-relevant (not trivia).
- Keep each option concise.
- Provide a one-sentence explanation for the correct answer.

Respond ONLY with valid JSON in this exact shape:
{
  "questions": [
    {
      "question": "string",
      "options": ["string","string","string","string"],
      "answerIndex": 0,
      "explanation": "string"
    }
  ]
}`;
}

function sanitize(raw: any): QuizQuestion[] {
  const list = Array.isArray(raw?.questions) ? raw.questions : [];
  const out: QuizQuestion[] = [];
  for (const q of list) {
    const options = Array.isArray(q?.options)
      ? q.options.map((o: any) => String(o)).slice(0, 4)
      : [];
    if (!q?.question || options.length < 2) continue;
    let answerIndex = Number(q?.answerIndex);
    if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= options.length) {
      answerIndex = 0;
    }
    out.push({
      question: String(q.question),
      options,
      answerIndex,
      explanation: q?.explanation ? String(q.explanation) : "",
    });
  }
  return out.slice(0, 5);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const topic = typeof body.topic === "string" ? body.topic.trim().slice(0, 120) : "";
    if (!topic) {
      return NextResponse.json({ error: "topic is required." }, { status: 400 });
    }

    const prompt = buildPrompt(topic);
    let questions: QuizQuestion[] = [];

    // Primary: Groq (returns a JSON object), fall back to Gemini.
    try {
      const { callGroqChat } = await import("@/lib/ai/groq");
      const raw = await callGroqChat(
        "You generate concise, accurate technical quizzes as strict JSON.",
        [],
        prompt
      );
      questions = sanitize(JSON.parse(raw));
    } catch (groqErr) {
      console.warn("Groq quiz generation failed, trying Gemini:", groqErr);
      const { getModel } = await import("@/lib/ai/gemini");
      const model = getModel("gemini-1.5-flash");
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonStr = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
      questions = sanitize(JSON.parse(jsonStr));
    }

    if (questions.length === 0) {
      throw new Error("Could not generate quiz questions.");
    }

    return NextResponse.json({ success: true, topic, questions });
  } catch (error: any) {
    console.error("Error in /api/notes/quiz POST:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate quiz." },
      { status: 500 }
    );
  }
}
