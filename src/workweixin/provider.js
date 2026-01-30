// WorkWeixin Channel Implementation
// 企业微信通道实现

import { getAccessToken, sendAppMessage, getUserInfo } from "./api.js";

/**
 * 缓存access_token
 */
class AccessTokenCache {
    constructor() {
        this.cache = new Map();
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
    }
}

const accessTokenCache = new AccessTokenCache();

/**
 * 获取或刷新access_token
 */
export async function getWorkWeixinAccessToken(corpId, corpSecret) {
    // 先尝试从缓存获取
    let token = await accessTokenCache.get(corpId, corpSecret);
    
    if (!token) {
        // 从API获取
        const result = await getAccessToken(corpId, corpSecret);
        token = result.accessToken;
        await accessTokenCache.set(corpId, corpSecret, token, result.expiresIn);
    }
    
    return token;
}

/**
 * 发送消息到WorkWeixin
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
    if (!corpId || !corpSecret || !agentId) {
        throw new Error("WorkWeixin: corpId, corpSecret, and agentId are required");
    }
    
    const accessToken = await getWorkWeixinAccessToken(corpId, corpSecret);
    
    const result = await sendAppMessage(accessToken, {
        corpId,
        corpSecret,
        agentId,
        toUser,
        msgType: "text",
        content: text,
    });
    
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
 * 解析接收到的消息
 */
export function parseWorkWeixinMessage(body) {
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
        };
    }
    
    // API调用格式
    return body;
}

/**
 * 构建发送选项
 */
export function buildSendOptions(config) {
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
