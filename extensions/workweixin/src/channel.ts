import {
  applyAccountNameToChannelSection,
  buildChannelConfigSchema,
  deleteAccountFromConfigSection,
  formatPairingApproveHint,
  getChatChannelMeta,
  listWorkWeixinAccountIds,
  migrateBaseNameToDefaultAccount,
  normalizeAccountId,
  resolveDefaultWorkWeixinAccountId,
  resolveWorkWeixinAccount,
  setAccountEnabledInConfigSection,
  WorkWeixinConfigSchema,
  type ChannelMessageActionAdapter,
  type ChannelPlugin,
  type ClawdbotConfig,
  type ResolvedWorkWeixinAccount,
} from "clawdbot/plugin-sdk";

import { getWorkWeixinRuntime } from "./runtime.js";

const meta = getChatChannelMeta("workweixin");

// 企微消息动作适配器
const workWeixinMessageActions: ChannelMessageActionAdapter = {
  listActions: (ctx) => {
    const actions = [{ id: "reply", label: "Reply", icon: "reply" }];
    return actions;
  },
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

export const workWeixinPlugin: ChannelPlugin<ResolvedWorkWeixinAccount> = {
  id: "workweixin",
  meta: {
    ...meta,
    quickstartAllowFrom: true,
  },
  // 简化：暂不实现onboarding
  // onboarding: workWeixinOnboardingAdapter,
  pairing: {
    idLabel: "workweixinUserId",
    normalizeAllowEntry: (entry) => entry.replace(/^(workweixin|wx|weixin):/i, ""),
    notifyApproval: async ({ cfg, id }) => {
      const config = getWorkWeixinRuntime().channel.workweixin.resolveWorkWeixinConfig(cfg);
      if (!config?.corpId || !config?.corpSecret || !config?.agentId) {
        throw new Error("WorkWeixin not configured");
      }
      await getWorkWeixinRuntime().channel.workweixin.sendMessageWorkWeixin(
        id, "配对已批准！您现在可以通过企微向Clawdbot发送消息。",
        config
      );
    },
  },
  capabilities: {
    chatTypes: ["direct"],
    reactions: false,
    threads: false,
    media: false,
    nativeCommands: true,
    blockStreaming: true,
  },
  reload: { configPrefixes: ["channels.workweixin"] },
  configSchema: buildChannelConfigSchema(WorkWeixinConfigSchema),
  config: {
    listAccountIds: (cfg) => listWorkWeixinAccountIds(cfg),
    resolveAccount: (cfg, accountId) => resolveWorkWeixinAccount({ cfg, accountId }),
    defaultAccountId: (cfg) => resolveDefaultWorkWeixinAccountId(cfg),
    setAccountEnabled: ({ cfg, accountId, enabled }) =>
      setAccountEnabledInConfigSection({
        cfg, sectionKey: "workweixin", accountId, enabled, allowTopLevel: true,
      }),
    deleteAccount: ({ cfg, accountId }) =>
      deleteAccountFromConfigSection({
        cfg, sectionKey: "workweixin", accountId,
        clearBaseFields: ["corpId", "corpSecret", "agentId", "token", "encodingAESKey"],
      }),
    isConfigured: (account) =>
      Boolean(account.config.corpId?.trim()) && Boolean(account.config.corpSecret?.trim()),
    describeAccount: (account) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: Boolean(account.config.corpId?.trim()) && Boolean(account.config.corpSecret?.trim()),
      corpId: account.config.corpId ? "***" : null,
      agentId: account.config.agentId ?? null,
    }),
    resolveAllowFrom: ({ cfg, accountId }) =>
      (resolveWorkWeixinAccount({ cfg, accountId }).config.allowFrom ?? []).map(String),
    formatAllowFrom: ({ allowFrom }) =>
      allowFrom.map(String).filter(Boolean).map(s => s.replace(/^(workweixin|wx|weixin):/i, "")),
  },
  security: {
    resolveDmPolicy: ({ cfg, accountId, account }) => {
      const id = accountId ?? account.accountId ?? "default";
      const useAccountPath = Boolean(cfg.channels?.workweixin?.accounts?.[id]);
      const basePath = useAccountPath ? `channels.workweixin.accounts.${id}.` : "channels.workweixin.";
      return {
        policy: account.config.dmPolicy ?? "pairing",
        allowFrom: account.config.allowFrom ?? [],
        policyPath: `${basePath}dmPolicy`,
        allowFromPath: basePath,
        approveHint: formatPairingApproveHint("workweixin"),
        normalizeEntry: (raw) => raw.replace(/^(workweixin|wx|weixin):/i, ""),
      };
    },
    collectWarnings: () => [],
  },
  groups: {
    resolveRequireMention: () => true,
    resolveToolPolicy: () => "allow",
  },
  threading: {
    resolveReplyToMode: () => "first",
  },
  messaging: {
    normalizeTarget: (target) => String(target ?? "").trim().replace(/^(workweixin|wx|weixin):/i, ""),
    targetResolver: {
      looksLikeId: (target) => {
        const t = String(target ?? "").trim();
        return t.length > 0 && t.length <= 64;
      },
      hint: "<userId>",
    },
  },
  directory: {
    self: async () => null,
    listPeers: async () => [],
    listGroups: async () => [],
  },
  actions: workWeixinMessageActions,
  setup: {
    resolveAccountId: ({ accountId }) => normalizeAccountId(accountId) ?? "default",
    applyAccountName: ({ cfg, accountId, name }) =>
      applyAccountNameToChannelSection({ cfg, channelKey: "workweixin", accountId, name }),
    validateInput: ({ input }) => {
      if (!input.useEnv && !input.corpId && !input.corpSecret) {
        return "WorkWeixin requires --corp-id and --corp-secret (or --use-env).";
      }
      if (!input.agentId) {
        return "WorkWeixin requires --agent-id for message sending.";
      }
      return null;
    },
    applyAccountConfig: ({ cfg, accountId, input }) => {
      const named = applyAccountNameToChannelSection({ cfg, channelKey: "workweixin", accountId, name: input.name });
      const next = accountId !== "default"
        ? migrateBaseNameToDefaultAccount({ cfg: named, channelKey: "workweixin" })
        : named;
      
      const baseConfig = {
        enabled: true,
        corpId: input.useEnv ? undefined : input.corpId,
        corpSecret: input.useEnv ? undefined : input.corpSecret,
        agentId: input.agentId,
      };
      
      if (accountId === "default") {
        return { ...next, channels: { ...next.channels, workweixin: { ...next.channels?.workweixin, ...baseConfig } } };
      }
      return {
        ...next,
        channels: {
          ...next.channels,
          workweixin: {
            ...next.channels?.workweixin,
            enabled: true,
            accounts: {
              ...next.channels?.workweixin?.accounts,
              [accountId]: { ...next.channels?.workweixin?.accounts?.[accountId], ...baseConfig },
            },
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
      const send = getWorkWeixinRuntime().channel.workweixin.sendMessageWorkWeixin;
      const result = await send(to, text, { accountId: accountId ?? "default" });
      return { channel: "workweixin", ...result };
    },
    sendMedia: async () => {
      throw new Error("Media not yet supported");
    },
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
    probeAccount: async ({ account }) =>
      getWorkWeixinRuntime().channel.workweixin.probeWorkWeixin(
        account.config.corpId, account.config.corpSecret, account.config.agentId
      ),
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
      const nextCfg = { ...cfg } as ClawdbotConfig;
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
        const accounts = nextWX.accounts && typeof nextWX.accounts === "object" ? { ...nextWX.accounts } : undefined;
        if (accounts && accountId in accounts) {
          const entry = accounts[accountId];
          if (entry && typeof entry === "object") {
            const nextEntry = { ...entry };
            ["corpId", "corpSecret", "agentId"].forEach(key => {
              if (key in nextEntry && nextEntry[key]) {
                cleared = true;
                delete nextEntry[key];
                changed = true;
              }
            });
            if (Object.keys(nextEntry).length === 0) {
              delete accounts[accountId];
              changed = true;
            } else {
              accounts[accountId] = nextEntry;
            }
          }
        }
        if (accounts && Object.keys(accounts).length === 0) {
          delete nextWX.accounts;
          changed = true;
        }
      }
      
      const resolved = resolveWorkWeixinAccount({ cfg: changed ? nextCfg : cfg, accountId });
      const loggedOut = !resolved.config.corpId?.trim() && !resolved.config.corpSecret?.trim();
      if (changed) {
        await getWorkWeixinRuntime().config.writeConfigFile(nextCfg);
      }
      return { cleared, envCorpId: Boolean(envCorpId), envCorpSecret: Boolean(envCorpSecret), loggedOut };
    },
  },
};
