import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // console.log(req.json(), "req");
  try {
    const { text, messageId } = await req.json();

    // Set up the fetch request to forward the data to the external API
    const response = await fetch(process.env.TTS_BASE_URL + "tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text,
        reference_id: "random",
        normalize: true,
        format: "wav",
        latency: "balanced",
        max_new_tokens: 2048,
        chunk_length: 200,
<<<<<<< HEAD
        repetition_penalty: 1.5,
=======
        repetition_penalty: 1.5
>>>>>>> 8457324 (update logic stop)
      }),
    });

    return response;
  } catch (error) {
    console.error("Caught error:", error);
    return new NextResponse("Failed to handle the request", { status: 500 });
  }
}
