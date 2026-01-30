// WorkWeixin Channel Implementation
// 企业微信通道实现

import { getAccessToken, sendAppMessage, getUserInfo } from "./api.js";

// 日志函数 - 支持外部注入
let log = { info: console.log, debug: console.log, warn: console.log, error: console.error };
export function setLogger(customLog) {
    log = customLog;
}

/**
 * 缓存access_token - 带速率限制保护
 */
class AccessTokenCache {
    constructor() {
        this.cache = new Map();
        this.requestCount = 0;
        this.lastRequestTime = 0;
        this.RATE_LIMIT_WINDOW = 1000; // 1秒内最多请求次数
        this.MAX_REQUESTS_PER_WINDOW = 10;
    }

    getKey(corpId, corpSecret) {
        return `${corpId}:${corpSecret}`;
    }

    async get(corpId, corpSecret) {
        const key = this.getKey(corpId, corpSecret);
        const entry = this.cache.get(key);

        if (entry && entry.expiresAt > Date.now()) {
            return entry.token;
        }

        return null;
    }

    async set(corpId, corpSecret, token, expiresIn) {
        const key = this.getKey(corpId, corpSecret);
        this.cache.set(key, {
            token,
            expiresAt: Date.now() + (expiresIn - 60) * 1000, // 提前60秒刷新
        });
        return token;
    }

    invalidate(corpId, corpSecret) {
        const key = this.getKey(corpId, corpSecret);
        this.cache.delete(key);
        log?.debug(`[workweixin] Access token invalidated for corpId: ${corpId.substring(0, 8)}...`);
    }

    /**
     * 检查并实施速率限制
     */
    async checkRateLimit() {
        const now = Date.now();
        if (now - this.lastRequestTime > this.RATE_LIMIT_WINDOW) {
            this.requestCount = 0;
            this.lastRequestTime = now;
        }

        this.requestCount++;
        if (this.requestCount > this.MAX_REQUESTS_PER_WINDOW) {
            const waitTime = this.RATE_LIMIT_WINDOW - (now - this.lastRequestTime);
            log?.warn(`[workweixin] Rate limit reached, waiting ${waitTime}ms`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            this.requestCount = 0;
            this.lastRequestTime = Date.now();
        }
    }
}

const accessTokenCache = new AccessTokenCache();

/**
 * 获取或刷新access_token - 带速率限制
 */
export async function getWorkWeixinAccessToken(corpId, corpSecret) {
    // 验证输入
    if (!corpId || !corpSecret) {
        throw new Error("corpId and corpSecret are required");
    }

    // 速率限制检查
    await accessTokenCache.checkRateLimit();

    // 先尝试从缓存获取
    let token = await accessTokenCache.get(corpId, corpSecret);

    if (!token) {
        // 从API获取
        log?.info(`[workweixin] Fetching new access token for corpId: ${corpId.substring(0, 8)}...`);
        const result = await getAccessToken(corpId, corpSecret);
        token = result.accessToken;
        await accessTokenCache.set(corpId, corpSecret, token, result.expiresIn);
        log?.debug(`[workweixin] Access token cached, expires in: ${result.expiresIn}s`);
    }

    return token;
}

/**
 * 发送消息到WorkWeixin - 增强版
 */
export async function sendMessageWorkWeixin(
    toUser,
    text,
    {
        corpId,
        corpSecret,
        agentId,
        accountId = "default",
        mediaUrl = null,
    } = {}
) {
    // 参数验证
    if (!corpId || !corpSecret || !agentId) {
        throw new Error("WorkWeixin: corpId, corpSecret, and agentId are required");
    }
    if (!toUser || typeof toUser !== "string") {
        throw new Error("Invalid toUser parameter");
    }
    if (!text || typeof text !== "string") {
        throw new Error("Invalid text parameter");
    }

    log?.debug(`[workweixin] Sending message to user: ${toUser}, length: ${text.length}`);

    const accessToken = await getWorkWeixinAccessToken(corpId, corpSecret);

    const result = await sendAppMessage(accessToken, {
        corpId,
        corpSecret,
        agentId,
        toUser,
        msgType: "text",
        content: text,
    });

    log?.info(`[workweixin] Message sent successfully, msgId: ${result.msgId}`);

    return {
        success: true,
        msgId: result.msgId,
        accountId,
        channel: "workweixin",
    };
}

/**
 * 探测WorkWeixin配置是否有效
 */
export async function probeWorkWeixin(corpId, corpSecret, agentId, timeoutMs = 5000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
        const { accessToken } = await getAccessToken(corpId, corpSecret);
        clearTimeout(timeout);
        
        return {
            ok: true,
            accessToken,
            corpId: corpId.substring(0, 8) + "...",
            agentId,
        };
    } catch (err) {
        clearTimeout(timeout);
        return {
            ok: false,
            error: String(err.message || err),
            corpId: corpId ? corpId.substring(0, 8) + "..." : null,
            agentId,
        };
    }
}

/**
 * 获取用户信息
 */
export async function getWorkWeixinUserInfo(corpId, corpSecret, userId) {
    const accessToken = await getWorkWeixinAccessToken(corpId, corpSecret);
    return getUserInfo(accessToken, userId);
}

/**
 * 解析接收到的消息 - 增强版
 */
export function parseWorkWeixinMessage(body) {
    if (!body || typeof body !== "object") {
        throw new Error("Invalid message body");
    }

    // 回调推送格式
    if (body.ToUserName && body.MsgType) {
        return {
            msgId: body.MsgId,
            fromUser: body.FromUserName,
            toUser: body.ToUserName,
            msgType: body.MsgType,
            content: body.Content || "",
            createTime: body.CreateTime,
            agentId: body.AgentID,
            raw: body,
        };
    }

    // API调用格式 - 直接返回
    return body;
}

/**
 * 构建发送选项
 */
export function buildSendOptions(config) {
    if (!config) {
        throw new Error("Config is required");
    }
    return {
        corpId: config.corpId,
        corpSecret: config.corpSecret,
        agentId: config.agentId,
    };
}

/**
 * WorkWeixin提供者配置
 */
export const workWeixinProviderConfig = {
    name: "workweixin",
    capabilities: {
        text: true,
        media: true,
        reactions: false,
        threads: false,
    },
    configFields: ["corpId", "corpSecret", "agentId", "token", "encodingAESKey"],
};

/**
 * 导出缓存状态（用于调试）
 */
export function getAccessTokenCacheStats() {
    return {
        size: accessTokenCache.cache.size,
        requestCount: accessTokenCache.requestCount,
    };
}

/**
 * 消息队列 - 用于消息重试和批量发送
 */
class MessageQueue {
    constructor(options = {}) {
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 1000;
        this.maxConcurrent = options.maxConcurrent || 5;
        this.queue = [];
        this.processing = 0;
        this.failed = [];
        this.stats = {
            total: 0,
            success: 0,
            failed: 0,
            retries: 0
        };
    }

    /**
     * 添加消息到队列
     */
    async add(message, sendFn) {
        this.queue.push({
            message,
            sendFn,
            retries: 0,
            addedAt: Date.now()
        });
        this.stats.total++;
        return this.process();
    }

    /**
     * 处理队列
     */
    async process() {
        if (this.processing >= this.maxConcurrent) return;
        if (this.queue.length === 0) return;

        this.processing++;

        while (this.queue.length > 0 && this.processing < this.maxConcurrent) {
            const item = this.queue.shift();
            await this.processItem(item);
        }

        this.processing--;
    }

    /**
     * 处理单个消息
     */
    async processItem(item) {
        const { message, sendFn, retries } = item;

        try {
            await sendFn(message);
            this.stats.success++;
            log?.debug(`[workweixin] Message sent successfully`);
        } catch (err) {
            if (retries < this.maxRetries) {
                item.retries++;
                this.stats.retries++;
                // 指数退避
                const delay = this.retryDelay * Math.pow(2, retries);
                log?.warn(`[workweixin] Message failed, retry ${retries + 1}/${this.maxRetries} after ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
                this.queue.unshift(item); // 放回队列头部优先重试
            } else {
                this.stats.failed++;
                this.failed.push({ message, error: err, failedAt: Date.now() });
                log?.error(`[workweixin] Message failed after ${this.maxRetries} retries: ${err.message}`);
            }
        }
    }

    /**
     * 获取队列状态
     */
    getStatus() {
        return {
            pending: this.queue.length,
            processing: this.processing,
            stats: this.stats,
            failedCount: this.failed.length
        };
    }

    /**
     * 重试失败的消息
     */
    async retryFailed() {
        const failed = [...this.failed];
        this.failed = [];

        for (const item of failed) {
            await this.add(item.message, item.sendFn || (() => Promise.resolve()));
        }
    }

    /**
     * 清空队列
     */
    clear() {
        this.queue = [];
        this.failed = [];
    }
}

export const messageQueue = new MessageQueue({
    maxRetries: 3,
    retryDelay: 1000,
    maxConcurrent: 3
});

/**
 * 发送消息（带重试机制）
 */
export async function sendMessageWithRetry(toUser, text, options = {}) {
    const maxRetries = options.maxRetries || 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await sendMessageWorkWeixin(toUser, text, options);
        } catch (err) {
            lastError = err;
            log?.warn(`[workweixin] Send attempt ${attempt}/${maxRetries} failed: ${err.message}`);

            if (attempt < maxRetries) {
                const delay = 1000 * Math.pow(2, attempt - 1); // 指数退避
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}

/**
 * 批量发送消息
 */
export async function sendBatchMessages(messages, options = {}) {
    const results = [];

    for (const msg of messages) {
        try {
            const result = await sendMessageWithRetry(msg.toUser, msg.text, {
                ...options,
                accountId: msg.accountId || options.accountId
            });
            results.push({ ...msg, ...result, success: true });
        } catch (err) {
            results.push({ ...msg, success: false, error: err.message });
        }
    }

    return {
        total: messages.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
    };
}
