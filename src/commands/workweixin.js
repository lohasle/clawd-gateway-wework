// WorkWeixin CLI Commands
// 企业微信命令行命令

import { listWorkWeixinAccountIds, resolveWorkWeixinAccount, probeWorkWeixin, sendMessageWorkWeixin, sendTemplateMessage, sendMarkdownMessage, messageQueue, connectionPool, healthChecker, metricsCollector } from "../../workweixin/index.js";
import { resolveDefaultWorkWeixinAccountId } from "../../workweixin/accounts.js";

// 便捷函数：日志输出
function output(logger, type, message) {
    if (logger) {
        logger[type](`[workweixin] ${message}`);
    } else {
        console[type === 'warn' ? 'warn' : 'log'](`[workweixin] ${message}`);
    }
}

/**
 * Add WorkWeixin channel
 */
export async function addWorkWeixinChannel(args, config, logger) {
    const { corpId, corpSecret, agentId, name, useEnv } = args;

    if (!useEnv && (!corpId || !corpSecret || !agentId)) {
        throw new Error("Missing required flags: --corp-id, --corp-secret, --agent-id");
    }

    const currentConfig = config.channels?.workweixin || {};

    const newConfig = {
        ...currentConfig,
        enabled: true,
        ...(useEnv ? {} : { corpId, corpSecret, agentId }),
        ...(name && { name }),
    };

    output(logger, 'info', `WorkWeixin channel ${name ? `"${name}" ` : ''}configured`);

    return {
        channels: {
            ...config.channels,
            workweixin: newConfig,
        },
    };
}

/**
 * Show WorkWeixin channel status
 */
export async function showWorkWeixinStatus(config, logger) {
    const accountIds = listWorkWeixinAccountIds(config);

    if (accountIds.length === 0) {
        return {
            channel: "workweixin",
            configured: false,
            message: "WorkWeixin not configured. Use 'clawdbot channels add workweixin --corp-id XXX --corp-secret XXX --agent-id XXX'",
        };
    }

    const accounts = [];
    for (const accountId of accountIds) {
        const account = resolveWorkWeixinAccount({ cfg: config, accountId });
        const probe = await probeWorkWeixin(
            account.config.corpId,
            account.config.corpSecret,
            account.config.agentId
        );

        accounts.push({
            accountId: account.accountId,
            name: account.name,
            enabled: account.enabled,
            configured: Boolean(account.config.corpId && account.config.corpSecret),
            corpId: account.config.corpId?.substring(0, 8) + "...",
            agentId: account.config.agentId,
            probe,
        });
    }

    // 获取连接池状态
    const poolStatus = connectionPool.getStatus();

    return {
        channel: "workweixin",
        configured: true,
        accounts,
        connectionPool: poolStatus,
    };
}

/**
 * Send message via WorkWeixin
 */
export async function sendWorkWeixinMessage(args, config, logger) {
    const { to, message, accountId, template, markdown } = args;

    if (!to) {
        throw new Error("Missing required flag: --to");
    }

    if (!message && !template && !markdown) {
        throw new Error("Missing message content: --message, --template, or --markdown");
    }

    const targetAccountId = accountId || resolveDefaultWorkWeixinAccountId(config);
    const account = resolveWorkWeixinAccount({ cfg: config, accountId: targetAccountId });

    if (!account.config.corpId && !process.env.WORKWEIXIN_CORP_ID) {
        throw new Error(`WorkWeixin not configured for account: ${targetAccountId}`);
    }

    const corpId = account.config.corpId || process.env.WORKWEIXIN_CORP_ID;
    const corpSecret = account.config.corpSecret || process.env.WORKWEIXIN_CORP_SECRET;
    const agentId = account.config.agentId || process.env.WORKWEIXIN_AGENT_ID;

    let result;

    if (template) {
        // 模板消息
        try {
            const templateData = JSON.parse(template);
            result = await sendTemplateMessage(corpId, corpSecret, agentId, to, templateData.name, templateData.data);
        } catch (err) {
            throw new Error(`Template message failed: ${err.message}`);
        }
    } else if (markdown) {
        // Markdown消息
        result = await sendMarkdownMessage(corpId, corpSecret, agentId, to, markdown);
    } else {
        // 普通文本消息
        result = await sendMessageWorkWeixin(to, message, {
            corpId,
            corpSecret,
            agentId,
        });
    }

    output(logger, 'info', `Message sent to ${to}, msgId: ${result.msgId}`);

    metricsCollector.increment('messages.sent');

    return {
        success: true,
        channel: "workweixin",
        to,
        accountId: targetAccountId,
        ...result,
    };
}

/**
 * List WorkWeixin accounts
 */
export async function listWorkWeixinAccounts(config) {
    const accountIds = listWorkWeixinAccountIds(config);
    const accounts = accountIds.map(id => {
        const account = resolveWorkWeixinAccount({ cfg: config, accountId: id });
        return {
            accountId: account.accountId,
            name: account.name,
            enabled: account.enabled,
            configured: Boolean(account.config.corpId && account.config.corpSecret),
        };
    });

    return {
        channel: "workweixin",
        accounts,
    };
}

/**
 * Get queue status
 */
export async function getQueueStatus() {
    const status = messageQueue.getStatus();

    return {
        channel: "workweixin",
        queue: status,
    };
}

/**
 * Get health status
 */
export async function getHealthStatus() {
    const health = healthChecker.getStatus();

    return {
        channel: "workweixin",
        health,
    };
}

/**
 * Get metrics
 */
export async function getMetrics() {
    const metrics = metricsCollector.getMetrics();

    return {
        channel: "workweixin",
        metrics,
    };
}

/**
 * Test WorkWeixin connection
 */
export async function testConnection(args, config, logger) {
    const { accountId, timeout } = args;
    const targetAccountId = accountId || resolveDefaultWorkWeixinAccountId(config);
    const account = resolveWorkWeixinAccount({ cfg: config, accountId: targetAccountId });

    const corpId = account.config.corpId || process.env.WORKWEIXIN_CORP_ID;
    const corpSecret = account.config.corpSecret || process.env.WORKWEIXIN_CORP_SECRET;
    const agentId = account.config.agentId || process.env.WORKWEIXIN_AGENT_ID;

    if (!corpId || !corpSecret || !agentId) {
        return {
            success: false,
            accountId: targetAccountId,
            error: "Missing credentials",
        };
    }

    const startTime = Date.now();

    try {
        const probe = await probeWorkWeixin(corpId, corpSecret, agentId, timeout || 5000);
        const duration = Date.now() - startTime;

        output(logger, 'info', `Connection test passed in ${duration}ms`);

        return {
            success: true,
            accountId: targetAccountId,
            duration: `${duration}ms`,
            probe,
        };
    } catch (err) {
        output(logger, 'error', `Connection test failed: ${err.message}`);

        return {
            success: false,
            accountId: targetAccountId,
            error: err.message,
        };
    }
}

/**
 * Clear message queue
 */
export async function clearQueue(config, logger) {
    messageQueue.clear();
    output(logger, 'info', 'Message queue cleared');

    return {
        success: true,
        message: "Queue cleared",
    };
}

/**
 * Reset metrics
 */
export async function resetMetrics(logger) {
    metricsCollector.counters.clear();
    metricsCollector.gauges.clear();
    metricsCollector.histograms.clear();
    healthChecker.resetMetrics();
    output(logger, 'info', 'Metrics reset');

    return {
        success: true,
        message: "Metrics reset",
    };
}
