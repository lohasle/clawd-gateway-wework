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
 * 健康检查管理器
 */
class HealthChecker {
    constructor(options = {}) {
        this.checks = new Map();
        this.lastCheckTime = null;
        this.status = 'unknown'; // unknown, healthy, degraded, unhealthy
        this.metrics = {
            uptime: 0,
            totalChecks: 0,
            successfulChecks: 0,
            failedChecks: 0,
            averageResponseTime: 0
        };
        this.startTime = Date.now();
        this.registerDefaultChecks();
    }

    /**
     * 注册默认检查项
     */
    registerDefaultChecks() {
        this.register('api_connectivity', async () => {
            const start = Date.now();
            try {
                await getAccessToken('test', 'test');
                return { status: 'healthy', responseTime: Date.now() - start };
            } catch (err) {
                return { status: 'unhealthy', error: err.message, responseTime: Date.now() - start };
            }
        });

        this.register('memory_usage', () => {
            const used = process.memoryUsage();
            const status = used.heapUsed / used.heapLimit < 0.8 ? 'healthy' : 'degraded';
            return {
                status,
                heapUsed: Math.round(used.heapUsed / 1024 / 1024),
                heapTotal: Math.round(used.heapTotal / 1024 / 1024),
                external: Math.round(used.external / 1024 / 1024)
            };
        });

        this.register('queue_depth', () => {
            // 检查消息队列深度
            return { status: 'healthy', depth: 0 };
        });
    }

    /**
     * 注册检查项
     */
    register(name, checkFn) {
        this.checks.set(name, {
            fn: checkFn,
            enabled: true,
            interval: 30000 // 30秒检查一次
        });
    }

    /**
     * 禁用检查项
     */
    disableCheck(name) {
        const check = this.checks.get(name);
        if (check) {
            check.enabled = false;
        }
    }

    /**
     * 启用检查项
     */
    enableCheck(name) {
        const check = this.checks.get(name);
        if (check) {
            check.enabled = true;
        }
    }

    /**
     * 执行健康检查
     */
    async check() {
        this.lastCheckTime = Date.now();
        this.metrics.totalChecks++;

        const results = [];
        let hasUnhealthy = false;
        let hasDegraded = false;

        for (const [name, check] of this.checks) {
            if (!check.enabled) continue;

            const start = Date.now();
            try {
                const result = await check.fn();
                results.push({ name, ...result, responseTime: Date.now() - start });

                if (result.status === 'unhealthy') {
                    hasUnhealthy = true;
                    this.metrics.failedChecks++;
                } else if (result.status === 'degraded') {
                    hasDegraded = true;
                } else {
                    this.metrics.successfulChecks++;
                }
            } catch (err) {
                results.push({ name, status: 'error', error: err.message, responseTime: Date.now() - start });
                hasUnhealthy = true;
                this.metrics.failedChecks++;
            }
        }

        // 计算整体状态
        if (hasUnhealthy) {
            this.status = 'unhealthy';
        } else if (hasDegraded) {
            this.status = 'degraded';
        } else {
            this.status = 'healthy';
        }

        // 更新平均响应时间
        const totalResponseTime = results.reduce((sum, r) => sum + (r.responseTime || 0), 0);
        this.metrics.averageResponseTime = totalResponseTime / results.length;

        this.metrics.uptime = Date.now() - this.startTime;

        return {
            status: this.status,
            timestamp: this.lastCheckTime,
            checks: results,
            metrics: this.metrics
        };
    }

    /**
     * 获取健康状态
     */
    getStatus() {
        return {
            status: this.status,
            lastCheckTime: this.lastCheckTime,
            uptime: Date.now() - this.startTime,
            checks: Array.from(this.checks.entries()).map(([name, check]) => ({
                name,
                enabled: check.enabled
            })),
            metrics: this.metrics
        };
    }

    /**
     * 重置指标
     */
    resetMetrics() {
        this.metrics = {
            uptime: 0,
            totalChecks: 0,
            successfulChecks: 0,
            failedChecks: 0,
            averageResponseTime: 0
        };
        this.startTime = Date.now();
    }
}

export const healthChecker = new HealthChecker();

/**
 * 事件发射器 - 简单版
 */
class EventEmitter {
    constructor() {
        this.events = new Map();
    }

    on(event, listener) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(listener);
    }

    off(event, listener) {
        if (!this.events.has(event)) return;
        const listeners = this.events.get(event);
        const index = listeners.indexOf(listener);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    emit(event, data) {
        if (!this.events.has(event)) return;
        this.events.get(event).forEach(listener => listener(data));
    }
}

export const eventEmitter = new EventEmitter();

/**
 * 指标收集器
 */
class MetricsCollector {
    constructor() {
        this.counters = new Map();
        this.gauges = new Map();
        this.histograms = new Map();
        this.startTime = Date.now();
    }

    /**
     * 增加计数器
     */
    increment(name, value = 1) {
        const key = name;
        if (!this.counters.has(key)) {
            this.counters.set(key, 0);
        }
        this.counters.set(key, this.counters.get(key) + value);
    }

    /**
     * 设置仪表值
     */
    gauge(name, value) {
        this.gauges.set(name, {
            value,
            timestamp: Date.now()
        });
    }

    /**
     * 记录直方图数据
     */
    histogram(name, value) {
        if (!this.histograms.has(name)) {
            this.histograms.set(name, []);
        }
        this.histograms.get(name).push({
            value,
            timestamp: Date.now()
        });

        // 只保留最近1000条
        const data = this.histograms.get(name);
        if (data.length > 1000) {
            data.shift();
        }
    }

    /**
     * 获取所有指标
     */
    getMetrics() {
        const now = Date.now();
        return {
            counters: Object.fromEntries(this.counters),
            gauges: Object.fromEntries(this.gauges),
            histograms: Object.fromEntries(this.histograms),
            uptime: now - this.startTime,
            timestamp: now
        };
    }

    /**
     * 获取计数器值
     */
    getCounter(name) {
        return this.counters.get(name) || 0;
    }

    /**
     * 获取仪表值
     */
    getGauge(name) {
        return this.gauges.get(name);
    }
}

export const metricsCollector = new MetricsCollector();

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
