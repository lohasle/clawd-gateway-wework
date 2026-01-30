// WorkWeixin CLI Commands
// 企业微信命令行命令

import { listWorkWeixinAccountIds, resolveWorkWeixinAccount, probeWorkWeixin, sendMessageWorkWeixin } from "../../workweixin/index.js";
import { resolveDefaultWorkWeixinAccountId } from "../../workweixin/accounts.js";

/**
 * Add WorkWeixin channel
 */
export async function addWorkWeixinChannel(args, config, logger) {
    const { corpId, corpSecret, agentId, name } = args;
    
    if (!corpId || !corpSecret || !agentId) {
        throw new Error("Missing required flags: --corp-id, --corp-secret, --agent-id");
    }
    
    const currentConfig = config.channels?.workweixin || {};
    
    const newConfig = {
        ...currentConfig,
        enabled: true,
        corpId,
        corpSecret,
        agentId,
        ...(name && { name }),
    };
    
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
    
    return {
        channel: "workweixin",
        configured: true,
        accounts,
    };
}

/**
 * Send message via WorkWeixin
 */
export async function sendWorkWeixinMessage(args, config, logger) {
    const { to, message, accountId } = args;
    
    if (!to || !message) {
        throw new Error("Missing required flags: --to, --message");
    }
    
    const targetAccountId = accountId || resolveDefaultWorkWeixinAccountId(config);
    const account = resolveWorkWeixinAccount({ cfg: config, accountId: targetAccountId });
    
    if (!account.config.corpId || !account.config.corpSecret || !account.config.agentId) {
        throw new Error(`WorkWeixin not configured for account: ${targetAccountId}`);
    }
    
    const result = await sendMessageWorkWeixin(to, message, {
        corpId: account.config.corpId,
        corpSecret: account.config.corpSecret,
        agentId: account.config.agentId,
    });
    
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
