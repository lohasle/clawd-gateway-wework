// WorkWeixin Provider Implementation - Minimal Version
// 企业微信提供者实现 - 最小可用版本

const WORKWEIXIN_API_BASE = "https://qyapi.weixin.qq.com";

// Access token cache
const tokenCache = new Map();

/**
 * Get access token with caching
 */
export async function getAccessToken(corpId, corpSecret) {
    const key = `${corpId}:${corpSecret}`;
    const cached = tokenCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.token;
    }
    
    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(corpSecret)}`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.errcode !== 0) {
        throw new Error(`gettoken failed: ${data.errmsg} (${data.errcode})`);
    }
    
    const token = data.access_token;
    const expiresAt = Date.now() + (data.expires_in - 60) * 1000;
    tokenCache.set(key, { token, expiresAt });
    
    return token;
}

/**
 * Send text message to user
 */
export async function sendMessageWorkWeixin(toUser, text, options = {}) {
    const { corpId, corpSecret, agentId } = options;
    
    if (!corpId || !corpSecret || !agentId) {
        throw new Error("corpId, corpSecret, and agentId are required");
    }
    
    const accessToken = await getAccessToken(corpId, corpSecret);
    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/message/send?access_token=${encodeURIComponent(accessToken)}`;
    
    const body = {
        touser: toUser,
        msgtype: "text",
        agentid: agentId,
        text: { content: text },
        safe: 0,
    };
    
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    
    const data = await res.json();
    if (data.errcode !== 0) {
        throw new Error(`send failed: ${data.errmsg} (${data.errcode})`);
    }
    
    return { success: true, msgId: data.msgid };
}

/**
 * Probe WorkWeixin configuration
 */
export async function probeWorkWeixin(corpId, corpSecret, agentId, timeoutMs = 5000) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        
        const token = await getAccessToken(corpId, corpSecret);
        clearTimeout(timeout);
        
        return {
            ok: true,
            accessToken: token?.substring(0, 10) + "...",
            corpId: corpId.substring(0, 8) + "...",
            agentId,
        };
    } catch (err) {
        return {
            ok: false,
            error: String(err.message || err),
            corpId: corpId ? corpId.substring(0, 8) + "..." : null,
            agentId,
        };
    }
}

/**
 * Resolve WorkWeixin config from main config
 */
export function resolveWorkWeixinConfig(cfg, accountId = "default") {
    const base = cfg.channels?.workweixin || {};
    const accounts = base.accounts || {};
    const account = accounts[accountId] || {};
    
    return {
        corpId: account.corpId || base.corpId,
        corpSecret: account.corpSecret || base.corpSecret,
        agentId: account.agentId || base.agentId,
        token: account.token || base.token,
        encodingAESKey: account.encodingAESKey || base.encodingAESKey,
        enabled: account.enabled ?? base.enabled ?? false,
        dmPolicy: account.dmPolicy ?? base.dmPolicy ?? "pairing",
        allowFrom: account.allowFrom ?? base.allowFrom ?? [],
    };
}

/**
 * List WorkWeixin account IDs
 */
export function listWorkWeixinAccountIds(cfg) {
    const accounts = cfg.channels?.workweixin?.accounts || {};
    const base = cfg.channels?.workweixin || {};
    
    const ids = [];
    
    if (base.corpId && base.corpSecret) {
        ids.push("default");
    }
    
    Object.keys(accounts).forEach(id => {
        if (id !== "default" && accounts[id]?.corpId && accounts[id]?.corpSecret) {
            ids.push(id);
        }
    });
    
    return ids;
}

/**
 * Resolve default account ID
 */
export function resolveDefaultWorkWeixinAccountId(cfg) {
    const base = cfg.channels?.workweixin || {};
    if (base.corpId && base.corpSecret) {
        return "default";
    }
    
    const accounts = cfg.channels?.workweixin?.accounts || {};
    for (const [id, acc] of Object.entries(accounts)) {
        if (acc?.corpId && acc?.corpSecret && acc.enabled !== false) {
            return id;
        }
    }
    
    return "default";
}

/**
 * Resolve account with full details
 */
export function resolveWorkWeixinAccount({ cfg, accountId }) {
    const normalizedId = accountId || "default";
    const base = cfg.channels?.workweixin || {};
    const accounts = base.accounts || {};
    const account = accounts[normalizedId] || {};
    
    return {
        accountId: normalizedId,
        name: account.name || base.name || normalizedId,
        enabled: account.enabled ?? base.enabled ?? false,
        config: {
            corpId: account.corpId || base.corpId,
            corpSecret: account.corpSecret || base.corpSecret,
            agentId: account.agentId || base.agentId,
            token: account.token || base.token,
            encodingAESKey: account.encodingAESKey || base.encodingAESKey,
            dmPolicy: account.dmPolicy ?? base.dmPolicy ?? "pairing",
            allowFrom: account.allowFrom ?? base.allowFrom ?? [],
        },
    };
}

/**
 * Get user info
 */
export async function getWorkWeixinUserInfo(corpId, corpSecret, userId) {
    const token = await getAccessToken(corpId, corpSecret);
    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/user/get?access_token=${encodeURIComponent(token)}&userid=${encodeURIComponent(userId)}`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.errcode !== 0) {
        throw new Error(`get user failed: ${data.errmsg} (${data.errcode})`);
    }
    
    return data;
}

/**
 * Parse callback message
 */
export function parseWorkWeixinMessage(body) {
    if (body.MsgId) {
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
    return body;
}

/**
 * Handle callback verification (GET request)
 */
export function handleCallbackVerify(token, timestamp, nonce, echostr) {
    // Simple verification - in production, use proper signature verification
    return { errcode: 0, errmsg: "ok", echostr };
}

/**
 * Decrypt message (simplified)
 */
export function decryptMessage(encodingAESKey, encryptedMsg) {
    // In production, implement proper AES decryption
    return encryptedMsg;
}
