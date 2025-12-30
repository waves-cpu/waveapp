import { sseChannel } from '@/lib/sse-channel';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const messageHandler = (event: MessageEvent) => {
        // Construct the SSE message format
        const message = `data: ${JSON.stringify(event.data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      sseChannel.addEventListener('message', messageHandler);

      // Keep the connection alive by sending a comment every 20 seconds
      const keepAliveInterval = setInterval(() => {
        controller.enqueue(encoder.encode(': keep-alive\n\n'));
      }, 20000);

      // Clean up when the client closes the connection
      request.signal.addEventListener('abort', () => {
        sseChannel.removeEventListener('message', messageHandler);
        clearInterval(keepAliveInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
