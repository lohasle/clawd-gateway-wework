import { normalizeAccountId, DEFAULT_ACCOUNT_ID } from "../routing/session-key.js";

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
