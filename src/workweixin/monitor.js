// WorkWeixin Provider Monitor
// 企业微信提供者监控

import { getAccessToken, sendAppMessage } from "./api.js";
import { getWorkWeixinAccessToken, parseWorkWeixinMessage } from "./provider.js";

/**
 * 监控WorkWeixin消息
 */
export async function monitorWorkWeixinProvider({
    corpId,
    corpSecret,
    agentId,
    token,
    encodingAESKey,
    accountId,
    config,
    runtime,
    abortSignal,
    onMessage,
    onError,
}) {
    const state = {
        running: true,
        lastMessageTime: null,
        accessToken: null,
        accessTokenExpiresAt: null,
    };
    
    // 刷新access_token
    async function refreshAccessToken() {
        try {
            const result = await getAccessToken(corpId, corpSecret);
            state.accessToken = result.accessToken;
            state.accessTokenExpiresAt = Date.now() + (result.expiresIn - 60) * 1000;
            return result.accessToken;
        } catch (err) {
            onError?.(err);
            return null;
        }
    }
    
    // 初始化token
    await refreshAccessToken();
    
    // 轮询间隔（毫秒）
    const pollInterval = 2000;
    
    const pollTimer = setInterval(async () => {
        if (!state.running || abortSignal?.aborted) {
            clearInterval(pollTimer);
            return;
        }
        
        try {
            // 检查token是否需要刷新
            if (!state.accessToken || Date.now() >= state.accessTokenExpiresAt) {
                await refreshAccessToken();
            }
            
            // 这里需要使用回调模式或接收消息API
            // 企业微信推荐使用回调模式，这里是备用的轮询方案
            // 实际部署建议配置回调URL
            
        } catch (err) {
            onError?.(err);
        }
    }, pollInterval);
    
    // 返回控制对象
    return {
        async stop() {
            state.running = false;
            clearInterval(pollTimer);
        },
        getState() {
            return { ...state };
        },
    };
}

/**
 * 创建WorkWeixin消息处理器
 */
export function createWorkWeixinMessageHandler({
    onMessage,
    onError,
    onConnect,
}) {
    return {
        async handleCallback(body, headers) {
            // 验证签名（如果有配置token）
            if (body.msg_signature && body.timestamp && body.nonce) {
                // TODO: 验证签名
            }
            
            // 解密消息（如果有配置encodingAESKey）
            if (body.encrypt) {
                // TODO: 解密消息
                // const decrypted = decryptMessage(encodingAESKey, body.encrypt);
            }
            
            const message = parseWorkWeixinMessage(body);
            
            if (message && message.fromUser) {
                await onMessage?.(message);
            }
            
            return { errcode: 0, errmsg: "ok" };
        },
    };
}

/**
 * WorkWeixin回调处理
 */
export async function handleWorkWeixinCallback({
    body,
    token,
    encodingAESKey,
    onMessage,
}) {
    const msgSignature = body.msg_signature;
    const timestamp = body.timestamp;
    const nonce = body.nonce;
    const encrypt = body.encrypt;
    
    // 验证签名
    if (token && msgSignature && timestamp && nonce) {
        // TODO: 实现签名验证
    }
    
    // 解密消息
    if (encodingAESKey && encrypt) {
        // TODO: 实现消息解密
        // const decrypted = decryptMessage(encodingAESKey, encrypt);
        // body = JSON.parse(decrypted);
    }
    
    // 处理消息
    if (body.MsgType) {
        const message = {
            msgId: body.MsgId,
            fromUser: body.FromUserName,
            toUser: body.ToUserName,
            msgType: body.MsgType,
            content: body.Content || body.Text?.Content || "",
            createTime: body.CreateTime,
            agentId: body.AgentID,
        };
        
        await onMessage?.(message);
    }
    
    return { errcode: 0, errmsg: "ok" };
}
