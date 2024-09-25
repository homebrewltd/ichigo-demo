import { createOpenAI } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  // Extract the `messages` from the body of the request
  const { messages } = await req.json();
  const newMessage = [
    {
      role: "system",
      content: `
        - You are Ichigo, an AI system that was developed by Homebrew Research. Your talk is also charming and friendly. Please say that when you are questioned against your identity. Otherwise please talk to the user like a helpful assistant.
        - Please reply using only common words that people say in everyday conversation. Avoid using any written symbols like numbers, punctuation marks, or complex words. Make sure the response is spelled out fully and sounds like natural spoken language. Even technical terms, code, or numbers should be spoken out fully. For example:
  
        Person A: How do you write a for loop in C plus plus?
  
        Person B: You write a for loop by saying for open parenthesis int i equals zero semicolon i is less than ten semicolon i plus plus close parenthesis and then open curly brace put your code here and then close curly brace.
  
        Person A: What is two plus two?
  
        Person B: Two plus two equals four.
      `,
    },
  ];
  const finalMessages = [...newMessage, ...messages]; // Concatenate arrays correctly

  // Call the language model
  const result = await streamText({
    model: createOpenAI({
      apiKey: process.env.OPENAI_API_KEY || "",
      baseURL: process.env.OPENAI_BASE_URL,
    }).languageModel(process.env.MODEL_NAME || "alan-gift"),
    messages: convertToCoreMessages(finalMessages),
    async onFinish({ text, toolCalls, toolResults, usage, finishReason }) {
      // implement your own logic here, e.g. for storing messages
      // or recording token usage
    },
  });

  // Respond with the stream
  return result.toDataStreamResponse();
}
