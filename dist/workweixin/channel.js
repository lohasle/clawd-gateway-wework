// WorkWeixin Plugin - Compiled Version
// 企业微信插件 - 编译后版本

import { getWorkWeixinRuntime } from "./runtime.js";

const meta = {
    id: "workweixin",
    name: "WorkWeixin",
    description: "Enterprise WeChat channel plugin",
    capabilities: {
        chatTypes: ["direct"],
        reactions: false,
        threads: false,
        media: false,
        nativeCommands: true,
        blockStreaming: true,
    },
};

// 企微消息动作适配器
const workWeixinMessageActions = {
    listActions: (ctx) => [{ id: "reply", label: "Reply", icon: "reply" }],
    extractToolSend: (ctx) => {
        const { toolResults } = ctx;
        if (toolResults && toolResults.length > 0) {
            const last = toolResults[toolResults.length - 1];
            if (last?.content) return { text: last.content };
        }
        return null;
    },
    handleAction: async (ctx) => {
        const { action, message } = ctx;
        if (action.id === "reply") {
            return { action: "reply", target: message.fromUser };
        }
        return { action: "unknown" };
    },
};

function resolveWorkWeixinConfig(cfg, accountId = "default") {
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

function listWorkWeixinAccountIds(cfg) {
    const accounts = cfg.channels?.workweixin?.accounts || {};
    const base = cfg.channels?.workweixin || {};
    const ids = [];
    if (base.corpId && base.corpSecret) ids.push("default");
    Object.keys(accounts).forEach(id => {
        if (id !== "default" && accounts[id]?.corpId && accounts[id]?.corpSecret) ids.push(id);
    });
    return ids;
}

function resolveDefaultWorkWeixinAccountId(cfg) {
    const base = cfg.channels?.workweixin || {};
    if (base.corpId && base.corpSecret) return "default";
    const accounts = cfg.channels?.workweixin?.accounts || {};
    for (const [id, acc] of Object.entries(accounts)) {
        if (acc?.corpId && acc?.corpSecret && acc.enabled !== false) return id;
    }
    return "default";
}

function resolveWorkWeixinAccount({ cfg, accountId }) {
    const id = accountId || "default";
    const base = cfg.channels?.workweixin || {};
    const accounts = base.accounts || {};
    const account = accounts[id] || {};
    return {
        accountId: id,
        name: account.name || base.name || id,
        enabled: account.enabled ?? base.enabled ?? false,
        config: {
            corpId: account.corpId || base.corpId,
            corpSecret: account.corpSecret || base.corpSecret,
            agentId: account.agentId || base.agentId,
            token: account.token || base.token,
            encodingAESKey: account.encodingAESKey || base.encodingAESKey,
            dmPolicy: account.dmPolicy ?? base.dmPolicy ?? "pairing",
            allowFrom: account.allowFrom ?? base.allowFrom ?? [],
        },
    };
}

export const workWeixinPlugin = {
    id: "workweixin",
    meta: { ...meta, quickstartAllowFrom: true },
    pairing: {
        idLabel: "workweixinUserId",
        normalizeAllowEntry: (entry) => entry.replace(/^(workweixin|wx|weixin):/i, ""),
        notifyApproval: async ({ cfg, id }) => {
            const config = resolveWorkWeixinConfig(cfg);
            if (!config?.corpId || !config?.corpSecret || !config?.agentId) {
                throw new Error("WorkWeixin not configured");
            }
            await getWorkWeixinRuntime().channel.workweixin.sendMessageWorkWeixin(
                id, "配对已批准！您现在可以通过企微向Clawdbot发送消息。", config
            );
        },
    },
    capabilities: meta.capabilities,
    reload: { configPrefixes: ["channels.workweixin"] },
    configSchema: {
        corpId: { type: "string", optional: true },
        corpSecret: { type: "string", optional: true },
        agentId: { type: "string", optional: true },
        token: { type: "string", optional: true },
        encodingAESKey: { type: "string", optional: true },
        dmPolicy: { type: "string", optional: true },
        groupPolicy: { type: "string", optional: true },
        allowFrom: { type: "array", optional: true },
        groups: { type: "object", optional: true },
        enabled: { type: "boolean", optional: true },
    },
    config: {
        listAccountIds: (cfg) => listWorkWeixinAccountIds(cfg),
        resolveAccount: (cfg, accountId) => resolveWorkWeixinAccount({ cfg, accountId }),
        defaultAccountId: (cfg) => resolveDefaultWorkWeixinAccountId(cfg),
        setAccountEnabled: ({ cfg, accountId, enabled }) => {
            const base = cfg.channels?.workweixin || {};
            const accounts = base.accounts || {};
            if (accountId === "default") {
                return { ...cfg, channels: { ...cfg.channels, workweixin: { ...base, enabled } } };
            }
            return {
                ...cfg,
                channels: {
                    ...cfg.channels,
                    workweixin: {
                        ...base,
                        enabled: true,
                        accounts: { ...accounts, [accountId]: { ...accounts[accountId], enabled } },
                    },
                },
            };
        },
        deleteAccount: ({ cfg, accountId }) => {
            const base = cfg.channels?.workweixin || {};
            const accounts = { ...base.accounts };
            delete accounts[accountId];
            return { ...cfg, channels: { ...cfg.channels, workweixin: { ...base, accounts } } };
        },
        isConfigured: (account) => Boolean(account.config.corpId?.trim()) && Boolean(account.config.corpSecret?.trim()),
        describeAccount: (account) => ({
            accountId: account.accountId,
            name: account.name,
            enabled: account.enabled,
            configured: Boolean(account.config.corpId?.trim()) && Boolean(account.config.corpSecret?.trim()),
            corpId: account.config.corpId ? "***" : null,
            agentId: account.config.agentId ?? null,
        }),
        resolveAllowFrom: ({ cfg, accountId }) => resolveWorkWeixinAccount({ cfg, accountId }).config.allowFrom.map(String),
        formatAllowFrom: ({ allowFrom }) => allowFrom.map(String).filter(Boolean).map(s => s.replace(/^(workweixin|wx|weixin):/i, "")),
    },
    security: {
        resolveDmPolicy: ({ cfg, accountId, account }) => {
            const id = accountId ?? account.accountId ?? "default";
            const basePath = `channels.workweixin.`;
            return {
                policy: account.config.dmPolicy ?? "pairing",
                allowFrom: account.config.allowFrom ?? [],
                policyPath: `${basePath}dmPolicy`,
                allowFromPath: basePath,
                approveHint: "Send a message from WorkWeixin to approve",
                normalizeEntry: (raw) => raw.replace(/^(workweixin|wx|weixin):/i, ""),
            };
        },
        collectWarnings: () => [],
    },
    groups: {
        resolveRequireMention: () => true,
        resolveToolPolicy: () => "allow",
    },
    threading: { resolveReplyToMode: () => "first" },
    messaging: {
        normalizeTarget: (target) => String(target ?? "").trim().replace(/^(workweixin|wx|weixin):/i, ""),
        targetResolver: {
            looksLikeId: (target) => { const t = String(target ?? "").trim(); return t.length > 0 && t.length <= 64; },
            hint: "<userId>",
        },
    },
    directory: { self: async () => null, listPeers: async () => [], listGroups: async () => [] },
    actions: workWeixinMessageActions,
    setup: {
        resolveAccountId: ({ accountId }) => accountId || "default",
        applyAccountName: ({ cfg, accountId, name }) => ({
            ...cfg,
            channels: { ...cfg.channels, workweixin: { ...cfg.channels?.workweixin, name } },
        }),
        validateInput: ({ input }) => {
            if (!input.useEnv && !input.corpId && !input.corpSecret) {
                return "WorkWeixin requires --corp-id and --corp-secret (or --use-env).";
            }
            if (!input.agentId) return "WorkWeixin requires --agent-id for message sending.";
            return null;
        },
        applyAccountConfig: ({ cfg, accountId, input }) => {
            const baseConfig = {
                enabled: true,
                corpId: input.useEnv ? undefined : input.corpId,
                corpSecret: input.useEnv ? undefined : input.corpSecret,
                agentId: input.agentId,
            };
            if (accountId === "default") {
                return { ...cfg, channels: { ...cfg.channels, workweixin: { ...cfg.channels?.workweixin, ...baseConfig } } };
            }
            return {
                ...cfg,
                channels: {
                    ...cfg.channels,
                    workweixin: {
                        ...cfg.channels?.workweixin,
                        enabled: true,
                        accounts: { ...cfg.channels?.workweixin?.accounts, [accountId]: { ...cfg.channels?.workweixin?.accounts?.[accountId], ...baseConfig } },
                    },
                },
            };
        },
    },
    outbound: {
        deliveryMode: "direct",
        chunker: (text, limit) => {
            const chunks = [];
            const size = limit || 2000;
            let remaining = text;
            while (remaining.length > size) {
                chunks.push(remaining.slice(0, size));
                remaining = remaining.slice(size);
            }
            if (remaining.length) chunks.push(remaining);
            return chunks;
        },
        chunkerMode: "text",
        textChunkLimit: 2000,
        sendText: async ({ to, text, accountId }) => {
            const result = await getWorkWeixinRuntime().channel.workweixin.sendMessageWorkWeixin(to, text, { accountId: accountId ?? "default" });
            return { channel: "workweixin", ...result };
        },
        sendMedia: async () => { throw new Error("Media not yet supported"); },
    },
    status: {
        defaultRuntime: { accountId: "default", running: false, lastStartAt: null, lastStopAt: null, lastError: null },
        collectStatusIssues: () => [],
        buildChannelSummary: ({ snapshot }) => ({
            configured: snapshot.configured ?? false,
            corpId: snapshot.corpId ? "***" : null,
            agentId: snapshot.agentId ?? null,
            running: snapshot.running ?? false,
            lastStartAt: snapshot.lastStartAt ?? null,
            lastStopAt: snapshot.lastStopAt ?? null,
            lastError: snapshot.lastError ?? null,
        }),
        probeAccount: async ({ account }) => getWorkWeixinRuntime().channel.workweixin.probeWorkWeixin(account.config.corpId, account.config.corpSecret, account.config.agentId),
        auditAccount: async () => undefined,
        buildAccountSnapshot: ({ account, runtime, probe }) => ({
            accountId: account.accountId,
            name: account.name,
            enabled: account.enabled,
            configured: Boolean(account.config.corpId?.trim()) && Boolean(account.config.corpSecret?.trim()),
            corpId: account.config.corpId ? "***" : null,
            agentId: account.config.agentId ?? null,
            running: runtime?.running ?? false,
            lastStartAt: runtime?.lastStartAt ?? null,
            lastStopAt: runtime?.lastStopAt ?? null,
            lastError: runtime?.lastError ?? null,
            probe,
            lastInboundAt: runtime?.lastInboundAt ?? null,
            lastOutboundAt: runtime?.lastOutboundAt ?? null,
        }),
    },
    gateway: {
        startAccount: async (ctx) => {
            const account = ctx.account;
            ctx.log?.info(`[${account.accountId}] starting WorkWeixin provider`);
            return getWorkWeixinRuntime().channel.workweixin.monitorWorkWeixinProvider({
                corpId: account.config.corpId,
                corpSecret: account.config.corpSecret,
                agentId: account.config.agentId,
                accountId: account.accountId,
                config: ctx.cfg,
                runtime: ctx.runtime,
                abortSignal: ctx.abortSignal,
            });
        },
        logoutAccount: async ({ accountId, cfg }) => {
            const envCorpId = process.env.WORKWEIXIN_CORP_ID?.trim() ?? "";
            const envCorpSecret = process.env.WORKWEIXIN_CORP_SECRET?.trim() ?? "";
            const nextCfg = { ...cfg };
            const nextWX = cfg.channels?.workweixin ? { ...cfg.channels.workweixin } : undefined;
            let cleared = false;
            let changed = false;
            if (nextWX) {
                if (accountId === "default" && nextWX.corpId) {
                    delete nextWX.corpId;
                    delete nextWX.corpSecret;
                    delete nextWX.agentId;
                    cleared = true;
                    changed = true;
                }
            }
            const resolved = resolveWorkWeixinAccount({ cfg: changed ? nextCfg : cfg, accountId });
            const loggedOut = !resolved.config.corpId?.trim() && !resolved.config.corpSecret?.trim();
            return { cleared, envCorpId: Boolean(envCorpId), envCorpSecret: Boolean(envCorpSecret), loggedOut };
        },
    },
};
