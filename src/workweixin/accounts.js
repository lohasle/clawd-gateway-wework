import { normalizeAccountId, DEFAULT_ACCOUNT_ID } from "../routing/session-key.js";

// 日志函数
let log = { info: console.log, debug: console.log, warn: console.log, error: console.error };
export function setLogger(customLog) {
    log = customLog;
}

/**
 * 账户配置验证器
 */
export function validateAccountConfig(config, accountId = "default") {
    const errors = [];

    if (!config.corpId?.trim()) {
        errors.push({ field: "corpId", message: "corpId is required" });
    }

    if (!config.corpSecret?.trim()) {
        errors.push({ field: "corpSecret", message: "corpSecret is required" });
    }

    if (!config.agentId) {
        errors.push({ field: "agentId", message: "agentId is required" });
    }

    // 验证corpId格式
    if (config.corpId && !/^[a-zA-Z0-9]{1,64}$/.test(config.corpId)) {
        errors.push({ field: "corpId", message: "corpId format invalid" });
    }

    // 验证agentId格式
    if (config.agentId && !/^[0-9]{1,10}$/.test(String(config.agentId))) {
        errors.push({ field: "agentId", message: "agentId must be numeric" });
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * 账户配置模板
 */
export const ACCOUNT_TEMPLATES = {
    default: {
        dmPolicy: "pairing",
        groupPolicy: "allowlist",
        allowFrom: [],
        autoReply: false,
        maxMessageLength: 2000,
    },

    developer: {
        dmPolicy: "pairing",
        groupPolicy: "allowlist",
        allowFrom: ["developer"],
        autoReply: true,
        maxMessageLength: 5000,
    },

    notification: {
        dmPolicy: "allowlist",
        groupPolicy: "deny",
        allowFrom: ["admin"],
        autoReply: false,
        maxMessageLength: 2000,
    },
};

/**
 * 应用账户模板
 */
export function applyAccountTemplate(config, templateName = "default") {
    const template = ACCOUNT_TEMPLATES[templateName] || ACCOUNT_TEMPLATES.default;

    return {
        ...config,
        dmPolicy: config.dmPolicy ?? template.dmPolicy,
        groupPolicy: config.groupPolicy ?? template.groupPolicy,
        allowFrom: config.allowFrom ?? template.allowFrom,
        autoReply: config.autoReply ?? template.autoReply,
        maxMessageLength: config.maxMessageLength ?? template.maxMessageLength,
    };
}

/**
 * 加密敏感配置
 */
export function encryptSensitiveConfig(config) {
    const masked = { ...config };

    if (masked.corpSecret) {
        masked.corpSecret = masked.corpSecret.substring(0, 4) + "***" + masked.corpSecret.substring(masked.corpSecret.length - 4);
    }

    if (masked.token) {
        masked.token = "***" + masked.token.substring(masked.token.length - 4);
    }

    if (masked.encodingAESKey) {
        masked.encodingAESKey = "***" + masked.encodingAESKey.substring(masked.encodingAESKey.length - 4);
    }

    return masked;
}

/**
 * List all WorkWeixin account IDs from config
 */
export function listWorkWeixinAccountIds(cfg) {
    const accounts = cfg.channels?.workweixin?.accounts;
    const baseAccount = cfg.channels?.workweixin;

    const ids = new Set();

    // Check base config (default account)
    if (baseAccount?.corpId?.trim() || baseAccount?.corpSecret?.trim()) {
        ids.add(DEFAULT_ACCOUNT_ID);
    }

    // Check named accounts
    if (accounts && typeof accounts === "object") {
        Object.keys(accounts).forEach((id) => {
            const acc = accounts[id];
            if (acc && typeof acc === "object") {
                if (acc.corpId?.trim() || acc.corpSecret?.trim()) {
                    ids.add(id);
                }
            }
        });
    }

    log?.debug(`[workweixin] Found ${ids.size} configured accounts`);
    return Array.from(ids);
}

/**
 * Resolve the default WorkWeixin account ID
 */
export function resolveDefaultWorkWeixinAccountId(cfg) {
    const baseWorkWeixin = cfg.channels?.workweixin;
    const accounts = cfg.channels?.workweixin?.accounts;

    // If base config has credentials, use default
    if (baseWorkWeixin?.corpId?.trim() && baseWorkWeixin?.corpSecret?.trim()) {
        return DEFAULT_ACCOUNT_ID;
    }

    // Find first named account with credentials
    if (accounts && typeof accounts === "object") {
        for (const [id, acc] of Object.entries(accounts)) {
            if (acc && typeof acc === "object") {
                if (acc.corpId?.trim() && acc.corpSecret?.trim()) {
                    return id;
                }
            }
        }
    }

    return DEFAULT_ACCOUNT_ID;
}

/**
 * Resolve a WorkWeixin account from config
 */
export function resolveWorkWeixinAccount({ cfg, accountId }) {
    const normalizedAccountId = normalizeAccountId(accountId) ?? DEFAULT_ACCOUNT_ID;

    const baseWorkWeixin = cfg.channels?.workweixin ?? {};
    const accounts = baseWorkWeixin.accounts ?? {};
    const account = accounts[normalizedAccountId] ?? {};

    // Merge base config with account-specific config
    const resolvedConfig = {
        ...baseWorkWeixin,
        ...account,
        // Account-specific takes precedence
        corpId: account.corpId ?? baseWorkWeixin.corpId,
        corpSecret: account.corpSecret ?? baseWorkWeixin.corpSecret,
        agentId: account.agentId ?? baseWorkWeixin.agentId,
        token: account.token ?? baseWorkWeixin.token,
        encodingAESKey: account.encodingAESKey ?? baseWorkWeixin.encodingAESKey,
    };

    return {
        accountId: normalizedAccountId,
        name: account.name ?? baseWorkWeixin.name ?? normalizedAccountId,
        enabled: account.enabled ?? baseWorkWeixin.enabled ?? false,
        config: {
            dmPolicy: account.dmPolicy ?? baseWorkWeixin.dmPolicy ?? "pairing",
            groupPolicy: account.groupPolicy ?? baseWorkWeixin.groupPolicy ?? "allowlist",
            allowFrom: account.allowFrom ?? baseWorkWeixin.allowFrom ?? [],
            groups: account.groups ?? baseWorkWeixin.groups,
            ...resolvedConfig,
        },
    };
}

/**
 * 获取所有账户摘要
 */
export function getAccountsSummary(cfg) {
    const accountIds = listWorkWeixinAccountIds(cfg);
    const summaries = [];

    for (const accountId of accountIds) {
        const account = resolveWorkWeixinAccount({ cfg, accountId });
        const validation = validateAccountConfig(account.config, accountId);

        summaries.push({
            accountId: account.accountId,
            name: account.name,
            enabled: account.enabled,
            configured: validation.valid,
            maskedConfig: encryptSensitiveConfig(account.config),
            errors: validation.errors,
        });
    }

    return {
        total: accountIds.length,
        configured: summaries.filter(s => s.configured).length,
        accounts: summaries,
    };
}
