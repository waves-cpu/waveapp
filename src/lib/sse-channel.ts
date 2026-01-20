// This is a simple server-side channel to broadcast events between different API routes.
// It uses BroadcastChannel, which is available in modern Node.js environments and serverless functions on some platforms.
// This allows, for example, the POST /api/sales/online route to notify the GET /api/stream route that new data is available.

type BCEventType = keyof BroadcastChannelEventMap;

let channel: BroadcastChannel | null = null;

try {
  channel = new BroadcastChannel('sse-global-channel');
} catch (error) {
  console.error("BroadcastChannel is not supported in this environment.", error);
  // In environments without BroadcastChannel, this will be a no-op.
  // A more robust solution for production might involve Redis Pub/Sub or a similar service.
}

export const sseChannel = {
  postMessage: (message: any) => {
    channel?.postMessage(message);
  },
  
  addEventListener: <K extends BCEventType>(
    type: K, 
    listener: (this: BroadcastChannel, ev: BroadcastChannelEventMap[K]) => any
  ) => {
    channel?.addEventListener(type, listener);
  },

  removeEventListener: <K extends BCEventType>(
    type: K, 
    listener: (this: BroadcastChannel, ev: BroadcastChannelEventMap[K]) => any
  ) => {
    channel?.removeEventListener(type, listener);
  },

  close: () => {
    channel?.close();
    channel = null;
  }
};
