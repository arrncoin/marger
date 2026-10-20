import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { TikTokLiveConnection } from 'tiktok-live-connector';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(express.json());

// Server-side TikTok Live state
interface TikTokState {
  connection: TikTokLiveConnection | null;
  username: string;
  roomId: string | null;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastError: string | null;
  viewerCount: number;
  totalLikes: number;
  connectedAt: number | null;
  recentEvents: Record<string, unknown>[];
}

const state: TikTokState = {
  connection: null,
  username: '',
  roomId: null,
  status: 'disconnected',
  lastError: null,
  viewerCount: 0,
  totalLikes: 0,
  connectedAt: null,
  recentEvents: [],
};

// SSE Client list
const sseClients: Response[] = [];

function broadcastSSE(type: string, data: unknown) {
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    const client = sseClients[i];
    try {
      client.write(payload);
      if (typeof (client as any).flush === 'function') {
        (client as any).flush();
      }
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

function recordEvent(event: Record<string, unknown>) {
  if (event.type === 'member') return;

  state.recentEvents.push(event);
  if (state.recentEvents.length > 60) {
    state.recentEvents.shift();
  }
  broadcastSSE('tiktok_event', event);
}

// Attach event listeners to modern TikTokLiveConnection
function setupConnectionListeners(conn: TikTokLiveConnection, username: string) {
  const c = conn as any;
  c.on('connected', (stateData: Record<string, unknown>) => {
    state.status = 'connected';
    state.roomId = stateData?.roomId ? String(stateData.roomId) : (conn.roomId ? String(conn.roomId) : null);
    state.lastError = null;
    state.connectedAt = Date.now();

    broadcastSSE('status', {
      status: 'connected',
      username,
      roomId: state.roomId,
      message: `Terhubung ke TikTok LIVE @${username} (Room: ${state.roomId})`,
    });
  });

  c.on('disconnected', () => {
    state.status = 'disconnected';
    broadcastSSE('status', {
      status: 'disconnected',
      username,
      message: `Koneksi TikTok LIVE @${username} terputus.`,
    });
  });

  c.on('streamEnd', () => {
    state.status = 'disconnected';
    broadcastSSE('status', {
      status: 'disconnected',
      username,
      message: `Siaran TikTok LIVE @${username} telah berakhir.`,
    });
  });

  c.on('chat', (data: Record<string, unknown>) => {
    const user = (data.user || {}) as Record<string, unknown>;
    const comment = String(data.content || data.comment || '');
    if (!comment) return;

    const nickname = String(user.nickname || user.displayId || 'Penonton');
    const uniqueId = String(user.displayId || user.uniqueId || user.id || 'viewer');
    const avatarThumb = user.avatarThumb as Record<string, unknown> | undefined;
    const avatarUrls = avatarThumb?.urlList as string[] | undefined;
    const avatarUrl = avatarUrls && avatarUrls.length > 0 ? avatarUrls[0] : undefined;

    const event = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'chat',
      timestamp: Date.now(),
      user: {
        userId: String(user.id || uniqueId),
        uniqueId,
        nickname,
        avatarUrl,
        isSubscriber: Boolean(user.isSubscriber),
        badge: user.isModerator ? 'Moderator' : user.isSubscriber ? 'Subscriber' : undefined,
      },
      chat: {
        comment,
      },
    };
    recordEvent(event);
  });

  c.on('like', (data: Record<string, unknown>) => {
    const user = (data.user || {}) as Record<string, unknown>;
    const count = Number(data.count || 1);
    const total = Number(data.total || (state.totalLikes + count));
    state.totalLikes = total;

    const nickname = String(user.nickname || user.displayId || 'Penonton');
    const uniqueId = String(user.displayId || user.uniqueId || 'viewer');

    const event = {
      id: `like_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'like',
      timestamp: Date.now(),
      user: {
        userId: String(user.id || uniqueId),
        uniqueId,
        nickname,
      },
      like: {
        count,
        totalLikes: total,
      },
    };
    recordEvent(event);
  });

function resolveGiftIcon(data: Record<string, unknown>, giftName: string): string {
  const giftObj = (data.gift || data.extendedGiftInfo || data.giftDetails || {}) as Record<string, unknown>;
  const giftImg = (giftObj.image || giftObj.icon || giftObj.giftImage || data.image || data.icon) as Record<string, unknown> | undefined;

  // Extract from all possible TikTok Webcast CDN picture sources
  const directPicture = data.giftPictureUrl || giftObj.giftPictureUrl || giftObj.pictureUrl;
  if (typeof directPicture === 'string' && directPicture.startsWith('http')) {
    return directPicture;
  }

  const urlList = (giftImg?.urlList || giftImg?.url_list || giftObj.urlList || giftObj.url_list) as
    | string[]
    | string
    | undefined;

  if (Array.isArray(urlList) && urlList.length > 0 && typeof urlList[0] === 'string' && urlList[0].startsWith('http')) {
    return urlList[0];
  }
  if (typeof urlList === 'string' && urlList.startsWith('http')) {
    return urlList;
  }

  // Official high-res TikTok LIVE Webcast CDN image links for popular gifts
  const lower = giftName.toLowerCase();
  if (lower.includes('rose') || lower.includes('mawar')) {
    return 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/rose.png~tplv-obj.png';
  }
  if (lower.includes('tiktok') || lower.includes('musical note') || lower.includes('note')) {
    return 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/tiktok_icon.png~tplv-obj.png';
  }
  if (lower.includes('finger heart') || lower.includes('love finger')) {
    return 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/finger_heart.png~tplv-obj.png';
  }
  if (lower.includes('doughnut') || lower.includes('donat')) {
    return 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/doughnut.png~tplv-obj.png';
  }
  if (lower.includes('perfume') || lower.includes('parfum')) {
    return 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/perfume.png~tplv-obj.png';
  }
  if (lower.includes('cap') || lower.includes('topi')) {
    return 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/cap.png~tplv-obj.png';
  }
  if (lower.includes('panda')) {
    return 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/panda.png~tplv-obj.png';
  }
  if (lower.includes('swan') || lower.includes('angsa')) {
    return 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/swan.png~tplv-obj.png';
  }
  if (lower.includes('train') || lower.includes('kereta')) {
    return 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/train.png~tplv-obj.png';
  }
  if (lower.includes('whale') || lower.includes('paus')) {
    return 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/whale.png~tplv-obj.png';
  }
  if (lower.includes('lion') || lower.includes('singa') || lower.includes('leon')) {
    return 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/lion.png~tplv-obj.png';
  }
  if (lower.includes('universe') || lower.includes('semesta')) {
    return 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/tiktok_universe.png~tplv-obj.png';
  }
  if (lower.includes('galaxy') || lower.includes('galaksi')) {
    return 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/galaxy.png~tplv-obj.png';
  }
  if (lower.includes('gun') || lower.includes('money')) {
    return 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/money_gun.png~tplv-obj.png';
  }
  if (lower.includes('firework') || lower.includes('kembang')) {
    return 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/fireworks.png~tplv-obj.png';
  }
  if (lower.includes('crown') || lower.includes('mahkota')) {
    return 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/little_crown.png~tplv-obj.png';
  }
  if (lower.includes('castle') || lower.includes('istana')) {
    return 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/castle.png~tplv-obj.png';
  }
  if (lower.includes('dragon') || lower.includes('naga')) {
    return 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/dragon.png~tplv-obj.png';
  }
  if (lower.includes('car') || lower.includes('mobil')) {
    return 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/sports_car.png~tplv-obj.png';
  }
  if (lower.includes('yacht') || lower.includes('kapal')) {
    return 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/yacht.png~tplv-obj.png';
  }
  if (lower.includes('sunglasses') || lower.includes('kacamata')) {
    return 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/sunglasses.png~tplv-obj.png';
  }
  if (lower.includes('microphone') || lower.includes('mic')) {
    return 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/microphone.png~tplv-obj.png';
  }

  return '🎁';
}

  c.on('gift', (data: Record<string, unknown>) => {
    const user = (data.user || {}) as Record<string, unknown>;
    const giftObj = (data.gift || {}) as Record<string, unknown>;
    const common = (data.common || {}) as Record<string, unknown>;

    const repeatCount = Number(data.repeatCount || data.comboCount || 1);
    const diamondCount = Number(data.diamondCount || giftObj.diamondCount || 1);
    const coinCost = repeatCount * diamondCount;

    const giftName = String(
      giftObj.name ||
      common.describe ||
      (data.describe ? String(data.describe).replace(/^.*sent\s+/, '') : '') ||
      'Gift'
    );

    const nickname = String(user.nickname || user.displayId || 'Penonton');
    const uniqueId = String(user.displayId || user.uniqueId || 'viewer');
    const avatarThumb = user.avatarThumb as Record<string, unknown> | undefined;
    const avatarUrls = avatarThumb?.urlList as string[] | undefined;
    const avatarUrl = avatarUrls && avatarUrls.length > 0 ? avatarUrls[0] : undefined;

    const giftIcon = resolveGiftIcon(data, giftName);

    const event = {
      id: `gift_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'gift',
      timestamp: Date.now(),
      user: {
        userId: String(user.id || uniqueId),
        uniqueId,
        nickname,
        avatarUrl,
      },
      gift: {
        giftId: Number(data.giftId || 0),
        giftName,
        repeatCount,
        diamondCount,
        coinCost,
        isComboStreak: repeatCount > 1,
        giftIcon,
        giftPictureUrl: giftIcon.startsWith('http') ? giftIcon : undefined,
      },
    };
    recordEvent(event);
  });

  c.on('social', (data: Record<string, unknown>) => {
    const user = (data.user || {}) as Record<string, unknown>;
    const common = (data.common || {}) as Record<string, unknown>;
    const displayText = (common.displayText || {}) as Record<string, unknown>;
    const pattern = String(displayText.defaultPattern || '').toLowerCase();

    const nickname = String(user.nickname || user.displayId || 'Pengikut Baru');
    const uniqueId = String(user.displayId || user.uniqueId || 'user');

    if (pattern.includes('follow') || pattern.includes('mengikuti')) {
      const event = {
        id: `follow_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'follow',
        timestamp: Date.now(),
        user: {
          userId: String(user.id || uniqueId),
          uniqueId,
          nickname,
        },
        follow: {},
      };
      recordEvent(event);
    } else if (pattern.includes('share') || pattern.includes('membagikan')) {
      const event = {
        id: `share_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'share',
        timestamp: Date.now(),
        user: {
          userId: String(user.id || uniqueId),
          uniqueId,
          nickname,
        },
        share: { shareType: 'TikTok LIVE Share' },
      };
      recordEvent(event);
    }
  });

  c.on('member', (data: Record<string, unknown>) => {
    const user = (data.user || {}) as Record<string, unknown>;
    const nickname = String(user.nickname || user.displayId || 'Member Baru');
    const uniqueId = String(user.displayId || user.uniqueId || 'member');

    const event = {
      id: `member_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'member',
      timestamp: Date.now(),
      user: {
        userId: String(user.id || uniqueId),
        uniqueId,
        nickname,
        isSubscriber: true,
      },
      member: {
        subTier: 'VIP Member',
      },
    };
    recordEvent(event);
  });

  c.on('roomUser', (data: Record<string, unknown>) => {
    // In TikTok Webcast, data.total is the active real-time viewer count
    const count = Number(data.total || data.viewerCount || data.count || 0);
    if (count > 0) {
      state.viewerCount = count;
      broadcastSSE('viewer_count', { viewerCount: count });

      const joinEvent = {
        id: `join_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'join',
        timestamp: Date.now(),
        user: {
          userId: 'system',
          uniqueId: 'viewer',
          nickname: 'Penonton',
        },
        join: { viewerCount: count },
      };
      recordEvent(joinEvent);
    }
  });

  c.on('error', (err: unknown) => {
    const errMsg = err instanceof Error ? err.message : String(err);
    state.lastError = errMsg;
    broadcastSSE('status', {
      status: state.status,
      username,
      error: errMsg,
      message: `Error koneksi: ${errMsg}`,
    });
  });
}

// API Routes
app.get('/api/tiktok/status', (_req: Request, res: Response) => {
  res.json({
    status: state.status,
    username: state.username,
    roomId: state.roomId,
    viewerCount: state.viewerCount,
    totalLikes: state.totalLikes,
    uptimeSeconds: state.connectedAt ? Math.floor((Date.now() - state.connectedAt) / 1000) : 0,
    lastError: state.lastError,
  });
});

// Diagnostic route: Check if user is live
app.get('/api/tiktok/check-stream', async (req: Request, res: Response) => {
  const username = String(req.query.username || '').trim().replace(/^@/, '');
  if (!username) {
    res.status(400).json({ error: 'Username diperlukan' });
    return;
  }

  try {
    const testConn = new TikTokLiveConnection(username, {
      processInitialData: false,
      fetchRoomInfoOnConnect: false,
    });

    const resConnect = await testConn.connect();
    const roomId = String(resConnect.roomId || testConn.roomId || '');

    try {
      await testConn.disconnect();
    } catch {}

    res.json({
      success: true,
      username,
      isLive: true,
      roomId,
      message: `Akun @${username} sedang aktif LIVE (Room ID: ${roomId})`,
    });
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    res.json({
      success: false,
      username,
      isLive: false,
      message: rawMsg,
    });
  }
});

// Webhook ingestion endpoint for external tools/bridges to push real events
app.post('/api/tiktok/webhook', (req: Request, res: Response) => {
  const payload = req.body;
  if (!payload || !payload.type) {
    res.status(400).json({ error: 'Payload tidak valid. Butuh properti `type`.' });
    return;
  }

  const event = {
    id: `ext_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    ...payload,
  };

  broadcastSSE('tiktok_event', event);
  res.json({ success: true, eventId: event.id });
});

app.post('/api/tiktok/connect', async (req: Request, res: Response) => {
  const { username, sessionId, roomId } = req.body;
  if (!username && !roomId) {
    res.status(400).json({ error: 'Username TikTok atau Room ID diperlukan' });
    return;
  }

  const cleanUsername = String(username || roomId).trim().replace(/^@/, '');

  try {
    if (state.connection) {
      try {
        await state.connection.disconnect();
      } catch {}
      state.connection = null;
    }

    state.username = cleanUsername;
    state.status = 'connecting';
    state.lastError = null;

    broadcastSSE('status', {
      status: 'connecting',
      username: cleanUsername,
      message: `Menghubungkan ke siaran langsung TikTok @${cleanUsername}...`,
    });

    // CRITICAL: fetchRoomInfoOnConnect and enableExtendedGiftInfo must be false
    // to bypass EulerStream paid business plan requirements and connect directly to TikTok Webcast!
    const options: Record<string, unknown> = {
      processInitialData: false,
      fetchRoomInfoOnConnect: false,
      enableExtendedGiftInfo: false,
    };

    if (sessionId) {
      options.session = { cookie: { sessionid: sessionId } };
    }

    const conn = new TikTokLiveConnection(cleanUsername, options as any);
    state.connection = conn;
    setupConnectionListeners(conn, cleanUsername);

    const connectState = (await conn.connect()) as Record<string, unknown>;
    const roomInfo = (connectState?.roomInfo || {}) as Record<string, unknown>;
    const roomStats = (roomInfo?.stats || {}) as Record<string, unknown>;

    state.status = 'connected';
    state.roomId = connectState?.roomId ? String(connectState.roomId) : (conn.roomId ? String(conn.roomId) : null);
    state.connectedAt = Date.now();
    state.viewerCount = Number(roomInfo.user_count || roomStats.user_count || state.viewerCount || 0);
    state.totalLikes = Number(roomStats.like_count || state.totalLikes || 0);

    broadcastSSE('status', {
      status: 'connected',
      username: cleanUsername,
      roomId: state.roomId,
      viewerCount: state.viewerCount,
      totalLikes: state.totalLikes,
      message: `Berhasil terhubung ke TikTok LIVE @${cleanUsername} (Room: ${state.roomId})`,
    });

    broadcastSSE('viewer_count', { viewerCount: state.viewerCount });

    res.json({
      success: true,
      status: 'connected',
      username: cleanUsername,
      roomId: state.roomId,
      viewerCount: state.viewerCount,
      totalLikes: state.totalLikes,
      message: `Berhasil terhubung ke @${cleanUsername}`,
    });
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : 'Gagal menghubungkan ke siaran langsung TikTok';
    state.status = 'error';
    state.lastError = rawMsg;

    broadcastSSE('status', {
      status: 'error',
      username: cleanUsername,
      error: rawMsg,
      message: `Gagal terhubung: ${rawMsg}`,
    });

    res.status(500).json({
      success: false,
      status: 'error',
      error: rawMsg,
    });
  }
});

app.post('/api/tiktok/disconnect', async (_req: Request, res: Response) => {
  if (state.connection) {
    try {
      await state.connection.disconnect();
    } catch {}
    state.connection = null;
  }
  state.status = 'disconnected';
  state.roomId = null;
  state.connectedAt = null;

  broadcastSSE('status', {
    status: 'disconnected',
    username: state.username,
    message: 'Koneksi ke siaran TikTok LIVE diputus.',
  });

  res.json({ success: true, message: 'Koneksi diputus' });
});

// SSE endpoint
app.get('/api/tiktok/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  sseClients.push(res);

  // Send initial state with status, viewerCount, totalLikes, and recentEvents!
  res.write(
    `event: initial_state\ndata: ${JSON.stringify({
      status: state.status,
      username: state.username,
      roomId: state.roomId,
      viewerCount: state.viewerCount,
      totalLikes: state.totalLikes,
      recentEvents: state.recentEvents,
    })}\n\n`
  );
  if (typeof (res as any).flush === 'function') {
    (res as any).flush();
  }

  const pingInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    } catch {
      clearInterval(pingInterval);
    }
  }, 10000);

  req.on('close', () => {
    clearInterval(pingInterval);
    const index = sseClients.indexOf(res);
    if (index !== -1) {
      sseClients.splice(index, 1);
    }
  });
});

async function startServer() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[TikTok LIVE Singer] Production server running at http://localhost:${PORT}`);
  });
}

startServer();
