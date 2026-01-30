// WorkWeixin Provider Monitor
// 企业微信提供者监控

import { getAccessToken, sendAppMessage, verifyCallbackSignature, decryptMessage } from "./api.js";
import { getWorkWeixinAccessToken, parseWorkWeixinMessage } from "./provider.js";

// 日志函数
let log = { info: console.log, debug: console.log, warn: console.log, error: console.error };
export function setLogger(customLog) {
    log = customLog;
}

// 默认配置
const DEFAULT_POLL_INTERVAL = 2000;
const DEFAULT_RETRY_DELAY = 1000;

/**
 * 监控状态管理
 */
class MonitorState {
    constructor(accountId) {
        this.accountId = accountId;
        this.reset();
    }

    reset() {
        this.running = false;
        this.lastMessageTime = null;
        this.accessToken = null;
        this.accessTokenExpiresAt = null;
        this.consecutiveErrors = 0;
        this.totalMessages = 0;
        this.lastError = null;
    }

    toJSON() {
        return {
            accountId: this.accountId,
            running: this.running,
            lastMessageTime: this.lastMessageTime,
            consecutiveErrors: this.consecutiveErrors,
            totalMessages: this.totalMessages,
            lastError: this.lastError,
        };
    }
}

/**
 * 监控WorkWeixin消息
 */
export async function monitorWorkWeixinProvider({
    corpId,
    corpSecret,
    agentId,
    token,
    encodingAESKey,
    accountId = "default",
    config,
    runtime,
    abortSignal,
    onMessage,
    onError,
    pollInterval = DEFAULT_POLL_INTERVAL,
}) {
    const state = new MonitorState(accountId);
    state.running = true;

    log?.info(`[workweixin] Starting monitor for account: ${accountId}`);

    // 刷新access_token
    async function refreshAccessToken() {
        try {
            const result = await getAccessToken(corpId, corpSecret);
            state.accessToken = result.accessToken;
            state.accessTokenExpiresAt = Date.now() + (result.expiresIn - 60) * 1000;
            state.consecutiveErrors = 0;
            state.lastError = null;
            log?.debug(`[workweixin] Access token refreshed for account: ${accountId}`);
            return result.accessToken;
        } catch (err) {
            state.consecutiveErrors++;
            state.lastError = String(err);
            log?.error(`[workweixin] Failed to refresh token: ${err.message}`);
            onError?.(err);
            return null;
        }
    }

    // 初始化token
    await refreshAccessToken();

    const pollTimer = setInterval(async () => {
        if (!state.running || abortSignal?.aborted) {
            clearInterval(pollTimer);
            log?.info(`[workweixin] Monitor stopped for account: ${accountId}`);
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

            // 更新运行时状态
            runtime?.update?.(state.toJSON());

        } catch (err) {
            state.consecutiveErrors++;
            state.lastError = String(err);
            log?.error(`[workweixin] Poll error: ${err.message}`);
            onError?.(err);
        }
    }, pollInterval);

    // 返回控制对象
    return {
        async stop() {
            state.running = false;
            clearInterval(pollTimer);
            runtime?.update?.({ running: false, lastStopAt: Date.now() });
            log?.info(`[workweixin] Monitor stopped for account: ${accountId}`);
        },
        getState() {
            return state.toJSON();
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
    token,
    encodingAESKey,
}) {
    // 内部状态
    let processedCount = 0;

    return {
        /**
         * 处理回调请求
         */
        async handleCallback(body, headers) {
            try {
                // 验证签名（如果有配置token）
                if (token && body.msg_signature && body.timestamp && body.nonce) {
                    const isValid = verifyCallbackSignature(
                        token,
                        body.timestamp,
                        body.nonce,
                        body.msg_signature
                    );
                    if (!isValid) {
                        log?.warn("[workweixin] Invalid callback signature");
                        return { errcode: 40001, errmsg: "Signature verification failed" };
                    }
                }

                // 解密消息（如果有配置encodingAESKey）
                let messageBody = body;
                if (encodingAESKey && body.encrypt) {
                    try {
                        const decrypted = decryptMessage(encodingAESKey, body.encrypt);
                        messageBody = JSON.parse(decrypted);
                    } catch (err) {
                        log?.error(`[workweixin] Failed to decrypt message: ${err.message}`);
                        return { errcode: 40002, errmsg: "Decryption failed" };
                    }
                }

                const message = parseWorkWeixinMessage(messageBody);

                if (message && message.fromUser) {
                    processedCount++;
                    await onMessage?.(message);
                }

                return { errcode: 0, errmsg: "ok" };
            } catch (err) {
                log?.error(`[workweixin] Callback error: ${err.message}`);
                onError?.(err);
                return { errcode: -1, errmsg: err.message };
            }
        },

        /**
         * 获取处理计数
         */
        getProcessedCount() {
            return processedCount;
        },
    };
}

/**
 * WorkWeixin回调处理 - 简化版
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
        const isValid = verifyCallbackSignature(token, timestamp, nonce, msgSignature);
        if (!isValid) {
            log?.warn("[workweixin] Invalid signature in callback");
            return { errcode: 40001, errmsg: "Signature verification failed" };
        }
    }

    // 解密消息
    let messageBody = body;
    if (encodingAESKey && encrypt) {
        try {
            const decrypted = decryptMessage(encodingAESKey, encrypt);
            messageBody = JSON.parse(decrypted);
        } catch (err) {
            log?.error(`[workweixin] Decryption failed: ${err.message}`);
            return { errcode: 40002, errmsg: "Decryption failed" };
        }
    }

    // 处理消息
    if (messageBody.MsgType) {
        const message = {
            msgId: messageBody.MsgId,
            fromUser: messageBody.FromUserName,
            toUser: messageBody.ToUserName,
            msgType: messageBody.MsgType,
            content: messageBody.Content || messageBody.Text?.Content || "",
            createTime: messageBody.CreateTime,
            agentId: messageBody.AgentID,
        };

        await onMessage?.(message);
    }

    return { errcode: 0, errmsg: "ok" };
}
