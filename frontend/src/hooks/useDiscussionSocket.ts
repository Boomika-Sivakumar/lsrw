import { useCallback, useEffect, useRef, useState } from "react";
import { getToken } from "../services/auth";

export interface WsMessage {
  type: string;
  [k: string]: unknown;
}

/**
 * WebSocket hook for a discussion room. Reconnects automatically with
 * exponential backoff and exposes connection status.
 */
export function useDiscussionSocket(room: string | null) {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<WsMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const retries = useRef(0);

  useEffect(() => {
    if (!room) return;
    let disposed = false;

    const connect = () => {
      const token = getToken();
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const url = `${protocol}://${window.location.host}/ws/discussion/${room}?token=${token}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        retries.current = 0;
        setConnected(true);
      };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          setMessages((prev) => [...prev.slice(-199), msg]);
        } catch {
          /* ignore malformed */
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (!disposed) {
          const delay = Math.min(1000 * 2 ** retries.current, 10000);
          retries.current += 1;
          setTimeout(connect, delay);
        }
      };
      ws.onerror = () => ws.close();
    };

    connect();
    return () => {
      disposed = true;
      wsRef.current?.close();
    };
  }, [room]);

  const send = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const reset = useCallback(() => setMessages([]), []);

  return { connected, messages, send, reset };
}