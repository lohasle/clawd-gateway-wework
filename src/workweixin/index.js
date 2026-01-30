// WorkWeixin Provider Runtime
// 企业微信提供者运行时

import { getAccessToken, sendMessageWorkWeixin, probeWorkWeixin, resolveWorkWeixinConfig, parseWorkWeixinMessage } from "./workweixin-provider.js";

const WORKWEIXIN_API_BASE = "https://qyapi.weixin.qq.com";

// 默认轮询间隔（毫秒）
const DEFAULT_POLL_INTERVAL = 3000;

/**
 * 监控配置
 */
const monitorConfig = {
    pollInterval: DEFAULT_POLL_INTERVAL,
    maxRetries: 3,
    retryDelay: 1000,
};

/**
 * Monitor WorkWeixin for messages (polling mode)
 */
export async function monitorWorkWeixinProvider({ corpId, corpSecret, agentId, accountId = "default", config, runtime, abortSignal }) {
    let running = true;
    let lastMessageTime = null;
    let consecutiveErrors = 0;

    const pollInterval = monitorConfig.pollInterval;

    runtime?.log?.info(`[workweixin] Starting monitor for account: ${accountId}`);

    const timer = setInterval(async () => {
        if (!running || abortSignal?.aborted) {
            clearInterval(timer);
            runtime?.log?.info(`[workweixin] Monitor stopped for account: ${accountId}`);
            return;
        }

        try {
            // 更新运行状态
            runtime?.update?.({ running: true, lastStartAt: Date.now(), consecutiveErrors });

            // 实际使用时需要配置回调URL
            // 这里只是占位，实际消息通过回调接收
            consecutiveErrors = 0;
        } catch (err) {
            consecutiveErrors++;
            runtime?.update?.({ lastError: String(err), consecutiveErrors });
            runtime?.log?.error(`[workweixin] Monitor error: ${err.message}`);
        }
    }, pollInterval);

    return {
        async stop() {
            running = false;
            clearInterval(timer);
            runtime?.update?.({ running: false, lastStopAt: Date.now() });
            runtime?.log?.info(`[workweixin] Monitor stopped for account: ${accountId}`);
        },
        getState() {
            return { running, lastMessageTime, consecutiveErrors };
        },
    };
}

/**
 * Resolve WorkWeixin config helper
 */
export function resolveWorkWeixinConfig(cfg, accountId = "default") {
    if (!cfg || typeof cfg !== "object") {
        throw new Error("Invalid configuration object");
    }

    const base = cfg.channels?.workweixin || {};
    const accounts = base.accounts || {};
    const account = accounts[accountId] || {};

    return {
        corpId: account.corpId || base.corpId || undefined,
        corpSecret: account.corpSecret || base.corpSecret || undefined,
        agentId: account.agentId || base.agentId || undefined,
        token: account.token || base.token || undefined,
        encodingAESKey: account.encodingAESKey || base.encodingAESKey || undefined,
        dmPolicy: account.dmPolicy || base.dmPolicy || "pairing",
        allowFrom: account.allowFrom || base.allowFrom || [],
        accountId,
    };
}

/**
 * WorkWeixin runtime exports
 */
export const workWeixinRuntime = {
    /**
     * 解析配置
     */
    resolveWorkWeixinConfig: (cfg, accountId) => resolveWorkWeixinConfig(cfg, accountId),

    /**
     * 发送消息
     */
    sendMessageWorkWeixin: async (toUser, text, options = {}) => {
        const accountId = options.accountId || "default";
        const config = resolveWorkWeixinConfig(options.config || {}, accountId);

        if (!config.corpId || !config.corpSecret || !config.agentId) {
            throw new Error(`WorkWeixin: corpId, corpSecret, and agentId required for account: ${accountId}`);
        }

        return sendMessageWorkWeixin(toUser, text, {
            corpId: config.corpId,
            corpSecret: config.corpSecret,
            agentId: config.agentId,
            accountId,
        });
    },

    /**
     * 探测配置
     */
    probeWorkWeixin: async (corpId, corpSecret, agentId, timeoutMs) => {
        return probeWorkWeixin(corpId, corpSecret, agentId, timeoutMs);
    },

    /**
     * 监控服务
     */
    monitorWorkWeixinProvider,

    /**
     * 解析消息
     */
    parseWorkWeixinMessage,

    /**
     * 获取access token
     */
    getAccessToken,

    /**
     * 更新监控配置
     */
    updateMonitorConfig: (newConfig) => {
        Object.assign(monitorConfig, newConfig);
        return monitorConfig;
    },

    /**
     * 获取监控配置
     */
    getMonitorConfig: () => ({ ...monitorConfig }),
};
