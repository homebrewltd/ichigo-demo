// app/api/sse/route.ts

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

let clients: Array<ReadableStreamDefaultController<Uint8Array>> = []; // Store clients

export async function GET(req: NextRequest) {
  // Create a new ReadableStream for the SSE
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Add the controller to the clients array
      clients.push(controller);

      // Function to send updates
      const sendUpdate = () => {
        const userCount = clients.length; // Current number of connected clients
        // Create a data message in the format expected by SSE
        const message = `data: ${userCount}\n\n`;
        controller.enqueue(new TextEncoder().encode(message)); // Enqueue message as Uint8Array
      };

      // Send updates every second
      const interval = setInterval(sendUpdate, 1000);

      // Cleanup on disconnect
      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        clients = clients.filter((client) => client !== controller); // Remove client on disconnect
      });
    },
  });

  // Set headers for the SSE response
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  return new NextResponse(stream, { headers }); // Return the stream response
}
