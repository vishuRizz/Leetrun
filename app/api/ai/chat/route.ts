import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { getModel } from "@/lib/ai/gemini";
import { retrieveKnowledge, renderKnowledgeBlock } from "@/lib/ai/retrieval";
import { getProactiveGreeting } from "@/lib/ai/proactive";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const message = body?.message;
    const pageContext =
      typeof body?.pageContext === "string" && body.pageContext.trim()
        ? body.pageContext.trim().slice(0, 500)
        : undefined;
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    // 1. Fetch or create AI conversation for this user
    let conversation = await db.aIConversation.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    if (!conversation) {
      conversation = await db.aIConversation.create({
        data: {
          userId: user.id,
          title: "Chat with Mentor",
        },
      });
    }

    // 2. Fetch last 15 messages for history
    const previousMessages = await db.aIMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 15,
    });

    // 3. Retrieve grounding material for this message + build dynamic system
    //    instructions enriched with deep context, retrieved knowledge, and the
    //    page the user is currently viewing.
    let knowledge = "";
    try {
      const chunks = await retrieveKnowledge(message, { k: 5 });
      knowledge = renderKnowledgeBlock(chunks);
    } catch (e) {
      console.warn("Knowledge retrieval failed (continuing without grounding):", e);
    }

    const systemInstruction = await buildSystemPrompt(user.id, {
      pageContext,
      knowledge,
    });

    // 4. Attempt response generation via Groq, falling back to Gemini if it fails
    let aiResponseText = "";
    try {
      console.log("Attempting chat completion using Groq (llama-3.1-8b-instant)...");
      const { callGroqChat } = await import("@/lib/ai/groq");
      const groqHistory = previousMessages.map((msg: { role: string; content: string }) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      }));
      aiResponseText = await callGroqChat(systemInstruction, groqHistory, message);
    } catch (groqError) {
      console.warn("Groq chat completion failed, falling back to Gemini:", groqError);
      
      // Map DB messages to Gemini chat history format
      const formattedHistory = previousMessages.map((msg: { role: string; content: string }) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      // Initialize Gemini model with instructions
      const model = getModel("gemini-1.5-flash"); // Fast & cheap
      
      const chat = model.startChat({
        history: formattedHistory,
        systemInstruction: {
          parts: [{ text: systemInstruction }],
          role: "system"
        }
      });

      const result = await chat.sendMessage(message);
      aiResponseText = result.response.text();
    }

    if (!aiResponseText) {
      throw new Error("Empty response from AI server.");
    }

    // 7. Save user and assistant messages in database transaction
    await db.$transaction([
      db.aIMessage.create({
        data: {
          conversationId: conversation.id,
          role: "user",
          content: message,
        },
      }),
      db.aIMessage.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          content: aiResponseText,
        },
      }),
    ]);

    return NextResponse.json({ success: true, response: aiResponseText });
  } catch (error: any) {
    console.error("Error in /api/ai/chat POST:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process chat conversation." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch companion details
    const companion = await db.aICompanion.findUnique({
      where: { userId: user.id },
    });

    const mentorName = companion?.name || user.user_metadata?.mentorName || "Sensei";

    // Fetch conversation
    const conversation = await db.aIConversation.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    let chatMessages: any[] = [];
    if (conversation) {
      chatMessages = await db.aIMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "asc" },
        take: 30,
      });
    }

    // No history yet → open with a personalized, proactive greeting (recap /
    // streak nudge / interview countdown) instead of a static hello.
    let greeting: string | null = null;
    if (chatMessages.length === 0) {
      try {
        const g = await getProactiveGreeting(user.id, mentorName);
        greeting = JSON.stringify(g);
      } catch (e) {
        console.warn("Proactive greeting failed:", e);
      }
    }

    return NextResponse.json({
      success: true,
      mentorName,
      greeting,
      messages: chatMessages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("Error in /api/ai/chat GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve conversation details." },
      { status: 500 }
    );
  }
}
