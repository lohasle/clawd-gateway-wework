// WorkWeixin Provider Runtime
// 企业微信提供者运行时

import { getAccessToken, sendMessageWorkWeixin, probeWorkWeixin, resolveWorkWeixinConfig, parseWorkWeixinMessage } from "./workweixin-provider.js";

const WORKWEIXIN_API_BASE = "https://qyapi.weixin.qq.com";

/**
 * Monitor WorkWeixin for messages (polling mode)
 */
export async function monitorWorkWeixinProvider({ corpId, corpSecret, agentId, accountId, config, runtime, abortSignal }) {
    let running = true;
    let lastMessageTime = null;
    
    const pollInterval = 3000; // 3 seconds
    
    const timer = setInterval(async () => {
        if (!running || abortSignal?.aborted) {
            clearInterval(timer);
            return;
        }
        
        try {
            // 实际使用时需要配置回调URL
            // 这里只是占位，实际消息通过回调接收
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
            return { running, lastMessageTime };
        },
    };
}

/**
 * Resolve WorkWeixin config helper
 */
function resolveConfig(cfg, accountId = "default") {
    const base = cfg.channels?.workweixin || {};
    const accounts = base.accounts || {};
    const account = accounts[accountId] || {};
    
    return {
        corpId: account.corpId || base.corpId,
        corpSecret: account.corpSecret || base.corpSecret,
        agentId: account.agentId || base.agentId,
        token: account.token || base.token,
        encodingAESKey: account.encodingAESKey || base.encodingAESKey,
    };
}

/**
 * WorkWeixin runtime exports
 */
export const workWeixinRuntime = {
    resolveWorkWeixinConfig: (cfg) => resolveConfig(cfg),
    sendMessageWorkWeixin: async (toUser, text, options = {}) => {
        const config = resolveConfig(options.config || {}, options.accountId);
        if (!config.corpId || !config.corpSecret || !config.agentId) {
            throw new Error("WorkWeixin: corpId, corpSecret, and agentId required");
        }
        return sendMessageWorkWeixin(toUser, text, config);
    },
    probeWorkWeixin: async (corpId, corpSecret, agentId, timeoutMs) => {
        return probeWorkWeixin(corpId, corpSecret, agentId, timeoutMs);
    },
    monitorWorkWeixinProvider,
    parseWorkWeixinMessage,
    getAccessToken,
};
