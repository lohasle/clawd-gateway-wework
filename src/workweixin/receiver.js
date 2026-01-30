// WorkWeixin Message Receiver
// 企业微信消息接收处理器

import { parseMessage, verifyCallbackSignature, decryptMessage } from "./callback.js";

let log = { info: console.log, debug: console.log, warn: console.log, error: console.error };
export function setLogger(customLog) {
    log = customLog;
}

/**
 * 消息类型常量
 */
export const MESSAGE_TYPES = {
    TEXT: "text",
    IMAGE: "image",
    VOICE: "voice",
    VIDEO: "video",
    SHORTVIDEO: "shortvideo",
    LOCATION: "location",
    LINK: "link",
    EVENT: "event",
};

/**
 * 事件类型常量
 */
export const EVENT_TYPES = {
    SUBSCRIBE: "subscribe",           // 订阅
    UNSUBSCRIBE: "unsubscribe",       // 取消订阅
    SCAN: "scan",                     // 扫描二维码
    LOCATION: "location",             // 上报地理位置
    CLICK: "click",                   // 点击菜单
    VIEW: "view",                     // 点击菜单链接
    VIEW_MINIPROGRAM: "view_miniprogram", // 点击小程序
    TEMPLATESENDJOBFINISH: "templatesendjobfinish", // 模板消息发送完成
};

/**
 * 消息接收处理器
 */
class MessageReceiver {
    constructor(options = {}) {
        this.handlers = new Map();
        this.eventHandlers = new Map();
        this.defaultHandler = null;
        this.defaultEventHandler = null;
        this.filters = [];
    }

    /**
     * 注册消息处理器
     */
    on(msgType, handler, options = {}) {
        const key = msgType.toLowerCase();
        this.handlers.set(key, {
            handler,
            priority: options.priority || 0,
            ...options,
        });
        return this;
    }

    /**
     * 注册事件处理器
     */
    onEvent(eventType, handler, options = {}) {
        const key = eventType.toLowerCase();
        this.eventHandlers.set(key, {
            handler,
            priority: options.priority || 0,
            ...options,
        });
        return this;
    }

    /**
     * 注册默认消息处理器
     */
    onDefault(handler) {
        this.defaultHandler = handler;
        return this;
    }

    /**
     * 注册默认事件处理器
     */
    onDefaultEvent(handler) {
        this.defaultEventHandler = handler;
        return this;
    }

    /**
     * 添加消息过滤器
     */
    use(filter) {
        this.filters.push(filter);
        return this;
    }

    /**
     * 处理接收到的消息
     */
    async receive(body, context = {}) {
        // 解析消息
        const message = parseMessage(body);
        if (!message) {
            log?.warn("[receiver] Failed to parse message");
            return { handled: false, error: "Invalid message format" };
        }

        // 执行过滤器
        for (const filter of this.filters) {
            const result = await filter(message, context);
            if (result === false) {
                log?.debug("[receiver] Message filtered out");
                return { handled: false, filtered: true };
            }
        }

        // 查找消息处理器
        const handler = this.handlers.get(message.msgType.toLowerCase());
        if (handler) {
            try {
                const result = await handler.handler(message, context);
                log?.info(`[receiver] Message ${message.msgType} handled`);
                return { handled: true, type: "message", result };
            } catch (err) {
                log?.error(`[receiver] Handler error: ${err.message}`);
                return { handled: false, error: err.message };
            }
        }

        // 使用默认处理器
        if (this.defaultHandler) {
            try {
                const result = await this.defaultHandler(message, context);
                return { handled: true, type: "message", result };
            } catch (err) {
                return { handled: false, error: err.message };
            }
        }

        log?.warn(`[receiver] No handler for message type: ${message.msgType}`);
        return { handled: false, error: "No handler" };
    }

    /**
     * 处理事件消息
     */
    async handleEvent(body, context = {}) {
        const message = parseMessage(body);
        if (!message || message.msgType !== "event") {
            return { handled: false, error: "Not an event" };
        }

        const eventType = message.event?.toLowerCase();
        const handler = this.eventHandlers.get(eventType);

        if (handler) {
            try {
                const result = await handler.handler(message, context);
                log?.info(`[receiver] Event ${message.event} handled`);
                return { handled: true, type: "event", eventType: message.event, result };
            } catch (err) {
                log?.error(`[receiver] Event handler error: ${err.message}`);
                return { handled: false, error: err.message };
            }
        }

        if (this.defaultEventHandler) {
            try {
                const result = await this.defaultEventHandler(message, context);
                return { handled: true, type: "event", result };
            } catch (err) {
                return { handled: false, error: err.message };
            }
        }

        log?.debug(`[receiver] No handler for event: ${message.event}`);
        return { handled: false, error: "No event handler" };
    }

    /**
     * 批量处理
     */
    async receiveBatch(messages) {
        const results = [];
        for (const msg of messages) {
            const result = await this.receive(msg.body, msg.context || {});
            results.push({ ...result, context: msg.context });
        }
        return results;
    }

    /**
     * 获取已注册的消息类型
     */
    getMessageTypes() {
        return Array.from(this.handlers.keys());
    }

    /**
     * 获取已注册的事件类型
     */
    getEventTypes() {
        return Array.from(this.eventHandlers.keys());
    }
}

export const messageReceiver = new MessageReceiver();

/**
 * 消息响应生成器
 */
class ResponseBuilder {
    constructor() {
        this.response = {
            msgtype: "text",
            text: { content: "" },
        };
    }

    /**
     * 创建文本响应
     */
    text(content) {
        this.response = {
            msgtype: "text",
            text: { content },
        };
        return this;
    }

    /**
     * 创建图片响应（通过media_id）
     */
    image(mediaId) {
        this.response = {
            msgtype: "image",
            image: { media_id: mediaId },
        };
        return this;
    }

    /**
     * 创建语音响应
     */
    voice(mediaId) {
        this.response = {
            msgtype: "voice",
            voice: { media_id: mediaId },
        };
        return this;
    }

    /**
     * 创建视频响应
     */
    video(mediaId, title, description) {
        this.response = {
            msgtype: "video",
            video: {
                media_id: mediaId,
                ...(title && { title }),
                ...(description && { description }),
            },
        };
        return this;
    }

    /**
     * 创建音乐响应
     */
    music(musicUrl, title, description, thumbMediaId, hQMusicUrl) {
        this.response = {
            msgtype: "music",
            music: {
                title,
                description,
                musicurl: musicUrl,
                hqmusicurl: hQMusicUrl || musicUrl,
                thumb_media_id: thumbMediaId,
            },
        };
        return this;
    }

    /**
     * 创建图文响应
     */
    news(articles) {
        this.response = {
            msgtype: "news",
            news: {
                articles: articles.map(a => ({
                    title: a.title,
                    description: a.description,
                    url: a.url,
                    picurl: a.picUrl || a.picurl,
                })),
            },
        };
        return this;
    }

    /**
     * 创建文本卡片响应
     */
    textcard(title, description, url, btnText) {
        this.response = {
            msgtype: "textcard",
            textcard: {
                title,
                description,
                url,
                btntxt: btnText || "详情",
            },
        };
        return this;
    }

    /**
     * 获取响应
     */
    build() {
        return this.response;
    }

    /**
     * 清空响应
     */
    clear() {
        this.response = null;
    }
}

export const responseBuilder = new ResponseBuilder();

/**
 * 会话管理器
 */
class SessionManager {
    constructor(options = {}) {
        this.sessions = new Map();
        this.maxAge = options.maxAge || 30 * 60 * 1000; // 30分钟
        this.cleanupInterval = options.cleanupInterval || 5 * 60 * 1000; // 5分钟
        this.startCleanup();
    }

    /**
     * 创建或获取会话
     */
    getSession(userId, createIfNotExists = true) {
        if (!this.sessions.has(userId)) {
            if (!createIfNotExists) return null;
            this.sessions.set(userId, {
                data: {},
                createdAt: Date.now(),
                lastActive: Date.now(),
                messages: [],
            });
        }

        const session = this.sessions.get(userId);
        session.lastActive = Date.now();
        return session;
    }

    /**
     * 设置会话数据
     */
    set(userId, key, value) {
        const session = this.getSession(userId);
        if (session) {
            session.data[key] = value;
            session.messages.push({ action: "set", key, value, time: Date.now() });
        }
    }

    /**
     * 获取会话数据
     */
    get(userId, key) {
        const session = this.getSession(userId, false);
        if (session) {
            return session.data[key];
        }
        return undefined;
    }

    /**
     * 删除会话数据
     */
    delete(userId, key) {
        const session = this.getSession(userId, false);
        if (session) {
            delete session.data[key];
        }
    }

    /**
     * 结束会话
     */
    end(userId) {
        this.sessions.delete(userId);
    }

    /**
     * 清理过期会话
     */
    cleanup() {
        const now = Date.now();
        for (const [userId, session] of this.sessions) {
            if (now - session.lastActive > this.maxAge) {
                this.sessions.delete(userId);
                log?.debug(`[session] Cleaned up expired session: ${userId}`);
            }
        }
    }

    /**
     * 启动定期清理
     */
    startCleanup() {
        setInterval(() => this.cleanup(), this.cleanupInterval);
    }

    /**
     * 获取会话统计
     */
    getStats() {
        return {
            totalSessions: this.sessions.size,
            oldestSession: Array.from(this.sessions.values())
                .reduce((min, s) => s.createdAt < min ? s.createdAt : min, Infinity),
            newestSession: Array.from(this.sessions.values())
                .reduce((max, s) => s.createdAt > max ? s.createdAt : max, 0),
        };
    }
}

export const sessionManager = new SessionManager();

/**
 * 快捷回复模板
 */
export const QUICK_REPLIES = {
    greeting: ["你好", "Hi", "在吗", "您好"],
    affirmative: ["好的", "OK", "好的吧", "收到", "知道了"],
    negative: ["不", "算了", "不要", "不用了"],
    waiting: ["等一下", "稍等", "马上好", "正在处理"],
};

/**
 * 自动回复管理器
 */
class AutoReplyManager {
    constructor(options = {}) {
        this.rules = new Map();
        this.enabled = options.enabled !== false;
        this.defaultReply = options.defaultReply || null;
    }

    /**
     * 添加自动回复规则
     */
    addRule(keyword, reply, options = {}) {
        const rule = {
            keyword,
            reply,
            type: options.type || "exact", // exact, contains, regex
            priority: options.priority || 0,
            enabled: options.enabled !== false,
        };
        this.rules.set(keyword, rule);
        return this;
    }

    /**
     * 批量添加规则
     */
    addRules(rules) {
        for (const rule of rules) {
            this.addRule(rule.keyword, rule.reply, rule.options || {});
        }
        return this;
    }

    /**
     * 查找匹配的回复
     */
    findReply(content) {
        if (!this.enabled) return null;

        const sortedRules = Array.from(this.rules.values())
            .filter(r => r.enabled)
            .sort((a, b) => b.priority - a.priority);

        for (const rule of sortedRules) {
            let matched = false;

            switch (rule.type) {
                case "exact":
                    matched = content === rule.keyword;
                    break;
                case "contains":
                    matched = content.includes(rule.keyword);
                    break;
                case "regex":
                    try {
                        matched = new RegExp(rule.keyword).test(content);
                    } catch {
                        // 无效正则，跳过
                    }
                    break;
            }

            if (matched) {
                log?.debug(`[autoreply] Matched rule: ${rule.keyword}`);
                return rule.reply;
            }
        }

        return this.defaultReply;
    }

    /**
     * 启用/禁用自动回复
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * 设置默认回复
     */
    setDefaultReply(reply) {
        this.defaultReply = reply;
    }

    /**
     * 获取所有规则
     */
    getRules() {
        return Array.from(this.rules.values());
    }

    /**
     * 删除规则
     */
    removeRule(keyword) {
        this.rules.delete(keyword);
    }

    /**
     * 清空规则
     */
    clearRules() {
        this.rules.clear();
    }
}

export const autoReplyManager = new AutoReplyManager();
