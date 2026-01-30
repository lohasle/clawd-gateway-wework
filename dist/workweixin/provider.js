// WorkWeixin Provider Implementation
// 企业微信提供者实现

const WORKWEIXIN_API_BASE = "https://qyapi.weixin.qq.com";

const tokenCache = new Map();

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

export async function probeWorkWeixin(corpId, corpSecret, agentId, timeoutMs = 5000) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        const token = await getAccessToken(corpId, corpSecret);
        clearTimeout(timeout);
        return {
            ok: true,
            accessToken: token?.substring(0, 10) + "...",
            corpId: corpId?.substring(0, 8) + "...",
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

export async function monitorWorkWeixinProvider({ corpId, corpSecret, agentId, accountId, config, runtime, abortSignal }) {
    let running = true;
    
    const pollInterval = 3000;
    
    const timer = setInterval(async () => {
        if (!running || abortSignal?.aborted) {
            clearInterval(timer);
            return;
        }
        try {
            runtime?.update?.({ running: true, lastStartAt: Date.now() });
        } catch (err) {
            runtime?.update?.({ lastError: String(err) });
        }
    }, pollInterval);
    
    return {
        async stop() {
            running = false;
            clearInterval(timer);
            runtime?.update?.({ running: false, lastStopAt: Date.now() });
        },
        getState() {
            return { running };
        },
    };
}
