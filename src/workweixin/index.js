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

/**
 * 速率限制器
 */
export class RateLimiter {
    constructor(options = {}) {
        this.windowMs = options.windowMs || 60000; // 1分钟
        this.maxRequests = options.maxRequests || 60;
        this.requests = new Map();
    }

    /**
     * 检查是否超限
     */
    async check(key = 'default') {
        const now = Date.now();
        const windowStart = now - this.windowMs;

        if (!this.requests.has(key)) {
            this.requests.set(key, []);
        }

        const timestamps = this.requests.get(key).filter(t => t > windowStart);
        const count = timestamps.length;

        if (count >= this.maxRequests) {
            const oldest = timestamps[0];
            const waitTime = oldest + this.windowMs - now;
            return { allowed: false, waitTime, remaining: 0 };
        }

        timestamps.push(now);
        this.requests.set(key, timestamps);

        return {
            allowed: true,
            remaining: this.maxRequests - count - 1,
            resetAt: now + this.windowMs
        };
    }

    /**
     * 获取状态
     */
    getStatus(key = 'default') {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        const timestamps = this.requests.get(key) || [];
        const recent = timestamps.filter(t => t > windowStart);

        return {
            current: recent.length,
            limit: this.maxRequests,
            remaining: Math.max(0, this.maxRequests - recent.length)
        };
    }
}

export const rateLimiter = new RateLimiter({
    windowMs: 60000,
    maxRequests: 60
});

/**
 * 断路器
 */
export class CircuitBreaker {
    constructor(options = {}) {
        this.failureThreshold = options.failureThreshold || 5;
        this.resetTimeout = options.resetTimeout || 30000;
        this.state = 'closed'; // closed, open, half-open
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.halfOpenSuccess = 0;
    }

    /**
     * 执行操作（带断路器保护）
     */
    async execute(fn) {
        if (this.state === 'open') {
            if (Date.now() - this.lastFailureTime > this.resetTimeout) {
                this.state = 'half-open';
                this.halfOpenSuccess = 0;
            } else {
                throw new Error("Circuit breaker is open");
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (err) {
            this.onFailure();
            throw err;
        }
    }

    /**
     * 成功回调
     */
    onSuccess() {
        if (this.state === 'half-open') {
            this.halfOpenSuccess++;
            if (this.halfOpenSuccess >= 3) {
                this.reset();
            }
        }
        this.failureCount = 0;
    }

    /**
     * 失败回调
     */
    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.failureCount >= this.failureThreshold) {
            this.state = 'open';
        }
    }

    /**
     * 重置断路器
     */
    reset() {
        this.state = 'closed';
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.halfOpenSuccess = 0;
    }

    /**
     * 获取状态
     */
    getState() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            lastFailureTime: this.lastFailureTime
        };
    }
}

export const circuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 30000
});

/**
 * 批量操作管理器
 */
export class BatchManager {
    constructor(options = {}) {
        this.batchSize = options.batchSize || 100;
        this.flushInterval = options.flushInterval || 5000;
        this.queue = [];
        this.timer = null;
        this.processing = false;
    }

    /**
     * 添加任务到批次
     */
    add(task) {
        this.queue.push(task);
        if (this.queue.length >= this.batchSize) {
            this.flush();
        } else if (!this.timer) {
            this.timer = setTimeout(() => this.flush(), this.flushInterval);
        }
    }

    /**
     * 刷新批次
     */
    async flush() {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        const batch = this.queue.splice(0, this.batchSize);

        try {
            await this.processBatch(batch);
        } catch (err) {
            console.error(`[BatchManager] Batch processing failed: ${err.message}`);
            // 将失败的任务重新加入队列
            this.queue.unshift(...batch);
        }

        this.processing = false;

        if (this.queue.length >= this.batchSize) {
            this.flush();
        }
    }

    /**
     * 处理批次（子类重写）
     */
    async processBatch(batch) {
        // 默认实现：逐个处理
        const results = [];
        for (const task of batch) {
            try {
                results.push({ success: true, task, result: await task() });
            } catch (err) {
                results.push({ success: false, task, error: err.message });
            }
        }
        return results;
    }

    /**
     * 获取状态
     */
    getStatus() {
        return {
            pending: this.queue.length,
            processing: this.processing
        };
    }

    /**
     * 关闭
     */
    close() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
}

export const batchManager = new BatchManager({
    batchSize: 50,
    flushInterval: 10000
});

/**
 * 版本信息
 */
export const VERSION = "0.2.0";

/**
 * 插件信息
 */
export const PLUGIN_INFO = {
    name: "clawd-gateway-wework",
    version: VERSION,
    description: "企业微信通道插件 - 通过企微机器人驱动Clawdbot",
    author: "lohasle",
    repository: "https://github.com/lohasle/clawd-gateway-wework",
    capabilities: [
        "text_messages",
        "template_messages",
        "markdown_messages",
        "group_messages",
        "callback_webhook",
        "message_queue",
        "retry_mechanism",
        "health_monitoring"
    ]
};
