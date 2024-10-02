// app/api/sse/route.ts
import { NextResponse } from "next/server";

let clients: any[] = []; // List of clients

export async function GET(req: Request) {
  // Set headers for SSE
  const res = new NextResponse(
    new ReadableStream({
      start(controller) {
        // Push a message every second
        const interval = setInterval(() => {
          const userCount = clients.length;
          controller.enqueue(`data: ${userCount}\n\n`);
        }, 1000);

        // Clean up when the stream closes
        req.signal.addEventListener("abort", () => {
          clearInterval(interval);
        });
      },
    })
  );

  res.headers.set("Content-Type", "text/event-stream");
  res.headers.set("Cache-Control", "no-cache");
  res.headers.set("Connection", "keep-alive");

  clients.push(res); // Add the response to the list of clients

  // Cleanup on disconnect
  req.signal.addEventListener("abort", () => {
    clients = clients.filter((client) => client !== res);
  });

  return res;
}
