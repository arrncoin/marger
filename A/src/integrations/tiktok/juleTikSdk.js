const { EventEmitter } = require("events");
const { WebcastPushConnection } = require("tiktok-live-connector");

function extractDisplayUser(rawUser) {
    const user = rawUser || {};
    const uniqueId = String(user.uniqueId || user.userId || user.id || user.displayId || "").replace(/^@/, "").trim();
    const nickname = String(user.nickname || user.displayName || user.name || uniqueId || "").trim();
    return {
        userId: String(user.userId || user.id || uniqueId || ""),
        uniqueId: uniqueId || nickname || "unknown",
        nickname: nickname || uniqueId || "unknown",
        avatarUrl: user.avatarUrl || user.avatarThumb || user.profilePicture || null,
        isModerator: Boolean(user.isModerator),
        isSubscriber: Boolean(user.isSubscriber),
    };
}

class JuleTikClient extends EventEmitter {
    constructor(options = {}) {
        super();
        const cfg = options || {};
        this.username = String(cfg.uniqueId || cfg.username || "").replace(/^@/, "").trim();
        this.connection = null;
        this.connected = false;
        this.started = false;
        this.autoReconnect = Boolean(cfg.autoReconnect !== false);
        this.maxReconnectAttempts = Number.isFinite(cfg.maxReconnectAttempts) ? Number(cfg.maxReconnectAttempts) : 5;
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;
        this.roomId = null;
        this.viewerCount = 0;
        this.lastError = null;
        this.state = { roomId: null, viewerCount: 0, isLive: false };
    }

    normalizeChatPayload(data) {
        const user = extractDisplayUser(data?.user || data?.author || data?.sender || {});
        const content = String(data?.content || data?.comment || data?.message || data?.text || "").trim();
        return {
            id: data?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            type: "chat",
            timestamp: data?.timestamp || Date.now(),
            user,
            chat: { comment: content },
        };
    }

    normalizeGiftPayload(data) {
        const user = extractDisplayUser(data?.user || data?.sender || {});
        return {
            id: data?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            type: "gift",
            timestamp: data?.timestamp || Date.now(),
            user,
            gift: {
                giftName: data?.giftName || data?.giftDetails?.giftName || data?.gift?.name || "Gift",
                repeatCount: Number(data?.repeatCount || 1),
                diamondCount: Number(data?.diamondCount || data?.totalValue || 1),
            },
        };
    }

    attachListeners() {
        const conn = this.connection;
        if (!conn) return;

        const dispatchIfValid = (type, payload) => {
            if (!payload || typeof payload !== "object") return;
            this.emit(type, payload);
        };

        conn.on("connected", (state) => {
            this.connected = true;
            this.started = true;
            this.roomId = state?.roomId || conn.roomId || this.roomId;
            this.state.roomId = this.roomId;
            this.state.isLive = true;
            this.emit("connected", state || { roomId: this.roomId, username: this.username });
        });

        conn.on("roomInfo", (info) => {
            this.emit("roomInfo", info);
        });

        conn.on("roomUserSeq", (data) => {
            const nextCount = Number(data?.viewerCount ?? data?.memberCount ?? this.viewerCount ?? 0);
            this.viewerCount = Number.isFinite(nextCount) ? nextCount : this.viewerCount;
            this.state.viewerCount = this.viewerCount;
            this.emit("roomUserSeq", data);
        });

        conn.on("chat", (data) => dispatchIfValid("chat", this.normalizeChatPayload(data)));
        conn.on("gift", (data) => dispatchIfValid("gift", this.normalizeGiftPayload(data)));
        conn.on("like", (data) => dispatchIfValid("like", data));
        conn.on("follow", (data) => dispatchIfValid("follow", { ...data, user: extractDisplayUser(data?.user || data?.sender || {}) }));
        conn.on("share", (data) => dispatchIfValid("share", { ...data, user: extractDisplayUser(data?.user || data?.sender || {}) }));
        conn.on("member", (data) => dispatchIfValid("member", { ...data, user: extractDisplayUser(data?.user || data?.sender || {}) }));

        conn.on("streamEnd", () => {
            this.connected = false;
            this.state.isLive = false;
            this.emit("streamEnd");
        });

        conn.on("disconnected", (reason) => {
            this.connected = false;
            this.state.isLive = false;
            this.emit("disconnected", reason || "disconnect");
        });

        conn.on("error", (err) => {
            this.lastError = err;
            this.emit("error", err);
        });
    }

    async connect() {
        if (!this.username) {
            throw new Error("Tiktok username is required");
        }
        if (this.connection) {
            return this.connection;
        }

        this.connection = new WebcastPushConnection(this.username);
        this.attachListeners();
        await this.connection.connect();
        return this.connection;
    }

    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.connection && typeof this.connection.disconnect === "function") {
            this.connection.disconnect();
        }
        this.connection = null;
        this.connected = false;
        this.started = false;
        this.state.isLive = false;
        this.emit("disconnected", "manual_disconnect");
    }

    destroy() {
        this.disconnect();
    }
}

function createTikTokLive(options = {}) {
    return new JuleTikClient(options);
}

module.exports = {
    JuleTikClient,
    createTikTokLive,
    createTikTokClient: createTikTokLive,
    WebcastPushConnection,
};
