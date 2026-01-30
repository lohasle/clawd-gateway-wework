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
