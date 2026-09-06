import { FullSystemState } from '../types/telemetry';

type MessageCallback = (state: FullSystemState) => void;
type StatusCallback = (connected: boolean) => void;

class TelemetryWebSocketService {
  private socket: WebSocket | null = null;
  private messageCallbacks: Set<MessageCallback> = new Set();
  private statusCallbacks: Set<StatusCallback> = new Set();
  private reconnectTimeout: any = null;
  private isConnected = false;

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/telemetry`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.notifyStatus(true);
      };

      this.socket.onmessage = (event) => {
        try {
          const state: FullSystemState = JSON.parse(event.data);
          this.notifyMessage(state);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.notifyStatus(false);
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        this.isConnected = false;
        this.notifyStatus(false);
      };
    } catch (err) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, 2000);
  }

  subscribe(callback: MessageCallback) {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  subscribeStatus(callback: StatusCallback) {
    this.statusCallbacks.add(callback);
    callback(this.isConnected);
    return () => this.statusCallbacks.delete(callback);
  }

  private notifyMessage(state: FullSystemState) {
    this.messageCallbacks.forEach((cb) => cb(state));
  }

  private notifyStatus(connected: boolean) {
    this.statusCallbacks.forEach((cb) => cb(connected));
  }
}

export const wsService = new TelemetryWebSocketService();
