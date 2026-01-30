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

/**
 * 删除账户
 */
export async function deleteWorkWeixinAccount(args, config, logger) {
    const { accountId } = args;

    if (!accountId) {
        throw new Error("Missing required flag: --account-id");
    }

    const currentConfig = config.channels?.workweixin || {};
    const accounts = currentConfig.accounts || {};

    if (!accounts[accountId]) {
        return {
            success: false,
            message: `Account "${accountId}" not found`,
        };
    }

    delete accounts[accountId];

    output(logger, 'info', `Account "${accountId}" deleted`);

    return {
        success: true,
        accountId,
        message: "Account deleted",
        config: {
            ...config,
            channels: {
                ...config.channels,
                workweixin: {
                    ...currentConfig,
                    accounts,
                },
            },
        },
    };
}

/**
 * 启用/禁用账户
 */
export async function setAccountEnabled(args, config, logger) {
    const { accountId, enabled } = args;

    if (!accountId) {
        throw new Error("Missing required flag: --account-id");
    }

    if (typeof enabled !== "boolean") {
        throw new Error("Missing required flag: --enabled (true/false)");
    }

    const currentConfig = config.channels?.workweixin || {};
    const accounts = currentConfig.accounts || {};

    if (accountId === "default") {
        currentConfig.enabled = enabled;
    } else {
        if (!accounts[accountId]) {
            return {
                success: false,
                message: `Account "${accountId}" not found`,
            };
        }
        accounts[accountId] = {
            ...accounts[accountId],
            enabled,
        };
    }

    output(logger, 'info', `Account "${accountId}" ${enabled ? 'enabled' : 'disabled'}`);

    return {
        success: true,
        accountId,
        enabled,
        config: {
            ...config,
            channels: {
                ...config.channels,
                workweixin: {
                    ...currentConfig,
                    accounts,
                },
            },
        },
    };
}

/**
 * 导出配置
 */
export async function exportConfig(config, logger) {
    const accountIds = listWorkWeixinAccountIds(config);
    const exported = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        channel: "workweixin",
        accounts: [],
    };

    for (const accountId of accountIds) {
        const account = resolveWorkWeixinAccount({ cfg: config, accountId });
        exported.accounts.push({
            accountId: account.accountId,
            name: account.name,
            enabled: account.enabled,
            config: {
                dmPolicy: account.config.dmPolicy,
                groupPolicy: account.config.groupPolicy,
                allowFrom: account.config.allowFrom,
                // 不导出敏感信息
            },
        });
    }

    output(logger, 'info', `Exported ${exported.accounts.length} accounts`);

    return exported;
}

/**
 * 导入配置
 */
export async function importConfig(args, config, logger) {
    const { file } = args;

    if (!file) {
        throw new Error("Missing required flag: --file");
    }

    // 读取配置文件
    let importData;
    try {
        const fs = await import("fs");
        const content = fs.readFileSync(file, "utf-8");
        importData = JSON.parse(content);
    } catch (err) {
        throw new Error(`Failed to read import file: ${err.message}`);
    }

    if (importData.channel !== "workweixin") {
        throw new Error("Invalid config file for workweixin channel");
    }

    const currentConfig = config.channels?.workweixin || {};
    const accounts = currentConfig.accounts || {};

    let imported = 0;
    for (const acc of importData.accounts || []) {
        accounts[acc.accountId] = {
            ...accounts[acc.accountId],
            name: acc.name,
            enabled: acc.enabled || true,
            dmPolicy: acc.config?.dmPolicy || "pairing",
            groupPolicy: acc.config?.groupPolicy || "allowlist",
            allowFrom: acc.config?.allowFrom || [],
        };
        imported++;
    }

    output(logger, 'info', `Imported ${imported} accounts`);

    return {
        success: true,
        imported,
        config: {
            ...config,
            channels: {
                ...config.channels,
                workweixin: {
                    ...currentConfig,
                    accounts,
                },
            },
        },
    };
}

/**
 * 监听消息
 */
export async function listenMessages(args, config, logger) {
    const { accountId, outputFormat } = args;

    const targetAccountId = accountId || resolveDefaultWorkWeixinAccountId(config);
    const account = resolveWorkWeixinAccount({ cfg: config, accountId: targetAccountId });

    if (!account.config.corpId && !process.env.WORKWEIXIN_CORP_ID) {
        throw new Error(`WorkWeixin not configured for account: ${targetAccountId}`);
    }

    output(logger, 'info', `Starting message listener for account: ${targetAccountId}`);
    output(logger, 'info', `Press Ctrl+C to stop`);

    // 设置消息接收处理器
    messageReceiver.on("text", async (message) => {
        const outputData = outputFormat === "json"
            ? JSON.stringify(message, null, 2)
            : `[${message.createTime}] ${message.fromUser}: ${message.content}`;

        output(logger, 'info', outputData);
    });

    return {
        success: true,
        accountId: targetAccountId,
        message: "Message listener started. Press Ctrl+C to stop.",
    };
}

/**
 * 群发消息
 */
export async function broadcastMessage(args, config, logger) {
    const { message, toUsers, toParties, toTags, accountId } = args;

    if (!message) {
        throw new Error("Missing required flag: --message");
    }
    if (!toUsers && !toParties && !toTags) {
        throw new Error("At least one of --to-users, --to-parties, or --to-tags is required");
    }

    const targetAccountId = accountId || resolveDefaultWorkWeixinAccountId(config);
    const account = resolveWorkWeixinAccount({ cfg: config, accountId: targetAccountId });

    const corpId = account.config.corpId || process.env.WORKWEIXIN_CORP_ID;
    const corpSecret = account.config.corpSecret || process.env.WORKWEIXIN_CORP_SECRET;
    const agentId = account.config.agentId || process.env.WORKWEIXIN_AGENT_ID;

    const result = await sendBatchMessages([
        ...(toUsers ? toUsers.split(",").map(u => ({ toUser: u.trim(), text: message })) : []),
        ...(toParties ? toParties.split(",").map(p => ({ toParty: p.trim(), text: message })) : []),
        ...(toTags ? toTags.split(",").map(t => ({ toTag: t.trim(), text: message })) : []),
    ], { corpId, corpSecret, agentId });

    output(logger, 'info', `Broadcast complete: ${result.success}/${result.total} sent`);

    return result;
}

/**
 * 获取帮助信息
 */
export async function getHelp() {
    return {
        channel: "workweixin",
        commands: [
            {
                name: "add",
                description: "Add WorkWeixin account",
                usage: "clawdbot channels add workweixin --corp-id XXX --corp-secret XXX --agent-id XXX [--name XXX]",
            },
            {
                name: "status",
                description: "Show channel status",
                usage: "clawdbot channels status workweixin",
            },
            {
                name: "list",
                description: "List all accounts",
                usage: "clawdbot channels list workweixin",
            },
            {
                name: "send",
                description: "Send message",
                usage: "clawdbot send workweixin --to userId --message 'Hello'",
            },
            {
                name: "test",
                description: "Test connection",
                usage: "clawdbot channels test workweixin [--account default]",
            },
            {
                name: "queue",
                description: "Show queue status",
                usage: "clawdbot channels queue workweixin",
            },
            {
                name: "health",
                description: "Show health status",
                usage: "clawdbot channels health workweixin",
            },
            {
                name: "metrics",
                description: "Show metrics",
                usage: "clawdbot channels metrics workweixin",
            },
            {
                name: "listen",
                description: "Listen for messages",
                usage: "clawdbot channels listen workweixin [--account default] [--output json]",
            },
            {
                name: "broadcast",
                description: "Broadcast message to users/parties/tags",
                usage: "clawdbot channels broadcast workweixin --message 'Hello' --to-users user1,user2",
            },
        ],
    };
}
