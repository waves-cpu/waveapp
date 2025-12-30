// This is a simple server-side channel to broadcast events between different API routes.
// It uses BroadcastChannel, which is available in modern Node.js environments and serverless functions on some platforms.
// This allows, for example, the POST /api/sales/online route to notify the GET /api/stream route that new data is available.

let channel: BroadcastChannel;

try {
  channel = new BroadcastChannel('sse-global-channel');
} catch (error) {
  console.error("BroadcastChannel is not supported in this environment.", error);
  // In environments without BroadcastChannel, this will be a no-op.
  // A more robust solution for production might involve Redis Pub/Sub or a similar service.
}

export const sseChannel = {
  postMessage: (message: any) => {
    if (channel) {
      channel.postMessage(message);
    }
  },
  addEventListener: (type: string, listener: (event: MessageEvent) => void) => {
    if (channel) {
      channel.addEventListener(type, listener);
    }
  },
  removeEventListener: (type: string, listener: (event: MessageEvent) => void) => {
    if (channel) {
      channel.removeEventListener(type, listener);
    }
  },
  close: () => {
    if (channel) {
      channel.close();
    }
  }
};
