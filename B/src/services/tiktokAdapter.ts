import { ConnectionConfig, ConnectionStatus, TikTokEvent, TikTokUser } from '../types/tiktok';

export interface ITikTokLiveAdapter {
  connect(config: ConnectionConfig): Promise<void>;
  disconnect(): void;
  reconnect(): Promise<void>;
  getStatus(): ConnectionStatus;
  getConfig(): ConnectionConfig;
  onEvent(callback: (event: TikTokEvent) => void): () => void;
  onStatusChange(callback: (status: ConnectionStatus, message?: string) => void): () => void;
}

/**
 * ServerDirectAdapter:
 * Communicates with our Express backend running tiktok-live-connector via REST & SSE.
 * Provides real-time event streaming for production.
 */
export class ServerDirectAdapter implements ITikTokLiveAdapter {
  private status: ConnectionStatus = 'disconnected';
  private config: ConnectionConfig;
  private eventSource: EventSource | null = null;
  private eventListeners: Set<(event: TikTokEvent) => void> = new Set();
  private statusListeners: Set<(status: ConnectionStatus, message?: string) => void> = new Set();

  constructor(defaultConfig?: Partial<ConnectionConfig>) {
    this.config = {
      mode: 'server-direct',
      username: '',
      ...defaultConfig,
    };
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getConfig(): ConnectionConfig {
    return { ...this.config };
  }

  public onEvent(callback: (event: TikTokEvent) => void): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  public onStatusChange(callback: (status: ConnectionStatus, message?: string) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  private setStatus(status: ConnectionStatus, message?: string) {
    this.status = status;
    this.statusListeners.forEach((cb) => cb(status, message));
  }

  private emitEvent(event: TikTokEvent) {
    this.eventListeners.forEach((cb) => cb(event));
  }

  public async connect(config: ConnectionConfig): Promise<void> {
    this.config = { ...config };
    const cleanUsername = config.username.trim().replace(/^@/, '');

    if (!cleanUsername) {
      this.setStatus('error', 'Username TikTok tidak boleh kosong.');
      return;
    }

    this.setStatus('connecting', `Menghubungkan ke siaran langsung TikTok @${cleanUsername}...`);

    // 1. Setup SSE stream listener first
    this.setupSSE();

    // 2. Call backend connect endpoint
    try {
      const response = await fetch('/api/tiktok/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          sessionId: config.sessionId?.trim() || undefined,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Gagal terhubung ke TikTok LIVE');
      }

      this.setStatus('connected', `Terhubung ke TikTok LIVE @${cleanUsername} (Room: ${resData.roomId || 'Aktif'})`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Koneksi gagal';
      this.setStatus('error', errorMsg);
    }
  }

  private setupSSE() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    try {
      const es = new EventSource('/api/tiktok/events');
      this.eventSource = es;

      es.addEventListener('tiktok_event', (e: MessageEvent) => {
        try {
          const event = JSON.parse(e.data) as TikTokEvent;
          this.emitEvent(event);
        } catch {}
      });

      es.addEventListener('initial_state', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.status && data.status !== 'disconnected') {
            this.setStatus(data.status, `Terhubung ke @${data.username} (Room: ${data.roomId || ''})`);
          }
          if (typeof data.viewerCount === 'number' && data.viewerCount > 0) {
            this.emitEvent({
              id: `join_init_${Date.now()}`,
              type: 'join',
              timestamp: Date.now(),
              user: { userId: 'system', uniqueId: 'viewer', nickname: 'Penonton' },
              join: { viewerCount: data.viewerCount },
            });
          }
          if (Array.isArray(data.recentEvents)) {
            data.recentEvents.forEach((ev: TikTokEvent) => {
              this.emitEvent({ ...ev, isHistorical: true });
            });
          }
        } catch {}
      });

      es.addEventListener('viewer_count', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (typeof data.viewerCount === 'number' && data.viewerCount > 0) {
            this.emitEvent({
              id: `join_${Date.now()}`,
              type: 'join',
              timestamp: Date.now(),
              user: { userId: 'system', uniqueId: 'viewer', nickname: 'Penonton' },
              join: { viewerCount: data.viewerCount },
            });
          }
        } catch {}
      });

      es.addEventListener('status', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.status) {
            this.setStatus(data.status, data.message || data.error);
          }
          if (typeof data.viewerCount === 'number' && data.viewerCount > 0) {
            this.emitEvent({
              id: `join_stat_${Date.now()}`,
              type: 'join',
              timestamp: Date.now(),
              user: { userId: 'system', uniqueId: 'viewer', nickname: 'Penonton' },
              join: { viewerCount: data.viewerCount },
            });
          }
        } catch {}
      });

      es.onerror = () => {
        // SSE disconnected, browser will auto-reconnect
      };
    } catch {}
  }

  public disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    fetch('/api/tiktok/disconnect', { method: 'POST' }).catch(() => {});
    this.setStatus('disconnected', 'Koneksi TikTok LIVE ditutup');
  }

  public closeSSEOnly(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  public async reconnect(): Promise<void> {
    this.disconnect();
    await this.connect(this.config);
  }
}

/**
 * WebSocketBridgeAdapter:
 * For streamers connecting directly to their local desktop relay (e.g. ws://localhost:21213)
 */
export class WebSocketBridgeAdapter implements ITikTokLiveAdapter {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private config: ConnectionConfig;
  private eventListeners: Set<(event: TikTokEvent) => void> = new Set();
  private statusListeners: Set<(status: ConnectionStatus, message?: string) => void> = new Set();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(defaultConfig?: Partial<ConnectionConfig>) {
    this.config = {
      mode: 'websocket-bridge',
      username: '',
      wsEndpoint: 'ws://localhost:21213',
      ...defaultConfig,
    };
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getConfig(): ConnectionConfig {
    return { ...this.config };
  }

  public onEvent(callback: (event: TikTokEvent) => void): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  public onStatusChange(callback: (status: ConnectionStatus, message?: string) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  private setStatus(status: ConnectionStatus, message?: string) {
    this.status = status;
    this.statusListeners.forEach((cb) => cb(status, message));
  }

  private emitEvent(event: TikTokEvent) {
    this.eventListeners.forEach((cb) => cb(event));
  }

  public async connect(config: ConnectionConfig): Promise<void> {
    this.config = { ...config };
    const endpoint = config.wsEndpoint || 'ws://localhost:21213';
    const cleanUsername = config.username.replace('@', '').trim();

    this.setStatus('connecting', `Menghubungkan ke WebSocket Bridge: ${endpoint}...`);

    try {
      this.ws = new WebSocket(endpoint);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('connected', `Terhubung ke TikTok Live Bridge untuk @${cleanUsername}`);

        // Subscribe to live room via bridge protocol
        this.ws?.send(
          JSON.stringify({
            command: 'subscribe',
            uniqueId: cleanUsername,
            sessionId: config.sessionId?.trim() || undefined,
          })
        );
      };

      this.ws.onmessage = (msgEvent) => {
        try {
          const payload = JSON.parse(msgEvent.data);
          this.parseBridgeMessage(payload);
        } catch {}
      };

      this.ws.onerror = () => {
        this.setStatus('error', 'Gagal menyambung ke WebSocket bridge. Pastikan connector lokal berjalan.');
      };

      this.ws.onclose = () => {
        if (this.status === 'connected') {
          this.handleReconnect();
        } else {
          this.setStatus('disconnected', 'Koneksi bridge ditutup');
        }
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Koneksi WebSocket gagal';
      this.setStatus('error', msg);
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setStatus('error', 'Koneksi terputus. Batas percobaan reconnect habis.');
      return;
    }

    this.reconnectAttempts++;
    this.setStatus('reconnecting', `Mencoba reconnect (percobaan ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    this.reconnectTimer = setTimeout(() => {
      this.connect(this.config);
    }, 2000 * Math.pow(1.5, this.reconnectAttempts - 1));
  }

  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected', 'Koneksi WebSocket diputus manual.');
  }

  public async reconnect(): Promise<void> {
    this.disconnect();
    this.reconnectAttempts = 0;
    await this.connect(this.config);
  }

  private parseBridgeMessage(data: Record<string, unknown>) {
    const eventName = (data.event || data.type || '') as string;
    if (eventName === 'member' || eventName === 'subscribe') return;

    const body = (data.data || data) as Record<string, unknown>;

    const user: TikTokUser = {
      userId: String(body.userId || body.secUid || Math.random().toString(36).substring(2, 8)),
      uniqueId: String(body.uniqueId || body.nickname || 'tiktok_user'),
      nickname: String(body.nickname || body.uniqueId || 'Penonton'),
      avatarUrl: (body.profilePictureUrl || body.avatarUrl) as string | undefined,
    };

    if (eventName === 'chat' || eventName === 'comment') {
      this.emitEvent({
        id: `chat_${Date.now()}_${Math.random()}`,
        type: 'chat',
        timestamp: Date.now(),
        user,
        chat: { comment: String(body.comment || '') },
      });
    } else if (eventName === 'gift') {
      const repeatCount = Number(body.repeatCount || 1);
      const diamondCount = Number(body.diamondCount || 1);
      this.emitEvent({
        id: `gift_${Date.now()}_${Math.random()}`,
        type: 'gift',
        timestamp: Date.now(),
        user,
        gift: {
          giftId: Number(body.giftId || 0),
          giftName: String(body.giftName || 'Gift'),
          repeatCount,
          diamondCount,
          coinCost: repeatCount * diamondCount,
          isComboStreak: repeatCount > 1,
        },
      });
    } else if (eventName === 'like') {
      this.emitEvent({
        id: `like_${Date.now()}_${Math.random()}`,
        type: 'like',
        timestamp: Date.now(),
        user,
        like: {
          count: Number(body.likeCount || 1),
          totalLikes: Number(body.totalLikeCount || 0),
        },
      });
    } else if (eventName === 'follow') {
      this.emitEvent({
        id: `follow_${Date.now()}_${Math.random()}`,
        type: 'follow',
        timestamp: Date.now(),
        user,
        follow: {},
      });
    } else if (eventName === 'share') {
      this.emitEvent({
        id: `share_${Date.now()}_${Math.random()}`,
        type: 'share',
        timestamp: Date.now(),
        user,
        share: { shareType: String(body.shareType || '') },
      });
    } else if (eventName === 'roomUser') {
      if (typeof body.viewerCount === 'number') {
        this.emitEvent({
          id: `join_${Date.now()}`,
          type: 'join',
          timestamp: Date.now(),
          user: {
            userId: 'system',
            uniqueId: 'viewer',
            nickname: 'Penonton',
          },
          join: { viewerCount: Number(body.viewerCount) },
        });
      }
    }
  }
}
