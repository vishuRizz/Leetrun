import { NextResponse } from "next/server";
import textToSpeech from "@google-cloud/text-to-speech";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text } = await request.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required." }, { status: 400 });
    }

    // Initialize the GCP TTS client
    // By providing credentials directly, we bypass the need for a keyfile
    const client = new textToSpeech.TextToSpeechClient({
      credentials: {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      projectId: process.env.GCP_PROJECT_ID,
    });

    const requestObj = {
      input: { text },
      // Select the language and SSML voice gender (optional)
      voice: { languageCode: "en-US", name: "en-US-Journey-F" }, // "en-US-Journey-F" is a high quality female voice, or we can use standard
      // select the type of audio encoding
      audioConfig: { audioEncoding: "MP3" as const },
    };

    const [response] = await client.synthesizeSpeech(requestObj);
    const audioContent = response.audioContent;

    if (!audioContent) {
      throw new Error("Failed to generate audio from GCP");
    }

    // Return the audio buffer to the client
    return new NextResponse(audioContent as any, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error: any) {
    console.error("Error in /api/ai/tts POST:", error);
    return NextResponse.json(
      { error: error.message || "Failed to synthesize speech." },
      { status: 500 }
    );
  }
}
