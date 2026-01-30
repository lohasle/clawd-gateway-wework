// WorkWeixin Onboarding Adapter
// 企业微信引导适配器

import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "../../routing/session-key.js";
import { listWorkWeixinAccountIds, resolveDefaultWorkWeixinAccountId, resolveWorkWeixinAccount } from "../../workweixin/accounts.js";
import { formatDocsLink } from "../../terminal/links.js";

const channel = "workweixin";

/**
 * 设置WorkWeixin DM策略
 */
function setWorkWeixinDmPolicy(cfg, dmPolicy) {
    const base = cfg.channels?.workweixin || {};
    return {
        ...cfg,
        channels: {
            ...cfg.channels,
            workweixin: {
                ...base,
                dmPolicy,
            },
        },
    };
}

/**
 * WorkWeixin配置帮助信息
 */
async function noteWorkWeixinConfigHelp(prompter) {
    await prompter.note([
        "📱 企业微信配置步骤:",
        "1. 登录企业微信管理后台 (https://work.weixin.qq.com)",
        "2. 进入「应用管理」->「自建应用」",
        "3. 创建或选择应用，获取:",
        "   - CorpId (企业ID)",
        "   - Secret (应用Secret)",
        "   - AgentId (应用AgentId)",
        "4. 在应用详情中配置「接收消息」API接收URL",
        `📖 文档: ${formatDocsLink("/workweixin")}`,
        "🌐 官网: https://clawd.bot",
    ].join("\n"), "WorkWeixin 配置");
}

/**
 * WorkWeixin用户ID帮助信息
 */
async function noteWorkWeixinUserIdHelp(prompter) {
    await prompter.note([
        "👤 获取用户ID方法:",
        "1. 在企业微信通讯录中查看用户详情",
        "2. 或通过API获取: /cgi-bin/user/get",
        "3. 消息接收者的userId即为您要配置的用户",
        "💡 提示: 可以配置 @all 表示全部用户",
        `📖 文档: ${formatDocsLink("/workweixin")}`,
    ].join("\n"), "WorkWeixin 用户ID");
}

/**
 * 提示用户输入allowFrom列表
 */
async function promptWorkWeixinAllowFrom(params) {
    const { cfg, prompter, accountId } = params;
    const resolved = resolveWorkWeixinAccount({ cfg, accountId });
    const existingAllowFrom = resolved.config.allowFrom ?? [];
    
    await noteWorkWeixinUserIdHelp(prompter);
    
    const parseInput = (value) => value
        .split(/[\n,;]+/g)
        .map((entry) => entry.trim())
        .filter(Boolean);
    
    let resolvedIds = [];
    while (resolvedIds.length === 0) {
        const entry = await prompter.text({
            message: "允许发送消息的用户ID",
            placeholder: "user001, user002 或 @all",
            initialValue: existingAllowFrom[0] ? String(existingAllowFrom[0]) : undefined,
            validate: (value) => (String(value ?? "").trim() ? undefined : "Required"),
        });
        const parts = parseInput(String(entry));
        // WorkWeixin userId通常是字符串，直接使用
        resolvedIds = parts.filter(p => p.length > 0 && p.length <= 64);
        
        if (resolvedIds.length === 0) {
            await prompter.note("请输入有效的用户ID", "输入错误");
        }
    }
    
    const merged = [...existingAllowFrom.map(String).filter(Boolean), ...resolvedIds];
    const unique = [...new Set(merged)];
    
    if (accountId === DEFAULT_ACCOUNT_ID) {
        return {
            ...cfg,
            channels: {
                ...cfg.channels,
                workweixin: {
                    ...cfg.channels?.workweixin,
                    enabled: true,
                    dmPolicy: "allowlist",
                    allowFrom: unique,
                },
            },
        };
    }
    
    return {
        ...cfg,
        channels: {
            ...cfg.channels,
            workweixin: {
                ...cfg.channels?.workweixin,
                enabled: true,
                accounts: {
                    ...cfg.channels?.workweixin?.accounts,
                    [accountId]: {
                        ...cfg.channels?.workweixin?.accounts?.[accountId],
                        enabled: cfg.channels?.workweixin?.accounts?.[accountId]?.enabled ?? true,
                        dmPolicy: "allowlist",
                        allowFrom: unique,
                    },
                },
            },
        },
    };
}

/**
 * WorkWeixin DM策略配置
 */
const dmPolicy = {
    label: "WorkWeixin",
    channel,
    policyKey: "channels.workweixin.dmPolicy",
    allowFromKey: "channels.workweixin.allowFrom",
    getCurrent: (cfg) => cfg.channels?.workweixin?.dmPolicy ?? "pairing",
    setPolicy: (cfg, policy) => setWorkWeixinDmPolicy(cfg, policy),
    promptAllowFrom: promptWorkWeixinAllowFrom,
};

/**
 * WorkWeixin Onboarding Adapter
 */
export const workWeixinOnboardingAdapter = {
    channel,
    
    /**
     * 获取通道状态
     */
    getStatus: async ({ cfg }) => {
        const configured = listWorkWeixinAccountIds(cfg).some((accountId) => {
            const acc = resolveWorkWeixinAccount({ cfg, accountId });
            return Boolean(acc.config.corpId?.trim()) && Boolean(acc.config.corpSecret?.trim());
        });
        
        return {
            channel,
            configured,
            statusLines: [`WorkWeixin: ${configured ? "✅ 已配置" : "📝 需要配置"}`],
            selectionHint: configured ? "✅ 可用" : "🏢 企业微信",
            quickstartScore: configured ? 1 : 7,
        };
    },
    
    /**
     * 配置通道
     */
    configure: async ({ cfg, prompter, accountOverrides, shouldPromptAccountIds, forceAllowFrom }) => {
        const override = accountOverrides.workweixin?.trim();
        const defaultId = resolveDefaultWorkWeixinAccountId(cfg);
        let accountId = override ? normalizeAccountId(override) : defaultId;
        
        if (shouldPromptAccountIds && !override) {
            // 简化: 不使用复杂的account prompt
            accountId = defaultId;
        }
        
        let next = cfg;
        const resolved = resolveWorkWeixinAccount({ cfg: next, accountId });
        const accountConfigured = Boolean(resolved.config.corpId?.trim()) && 
                                  Boolean(resolved.config.corpSecret?.trim());
        
        const canUseEnv = accountId === DEFAULT_ACCOUNT_ID &&
                          Boolean(process.env.WORKWEIXIN_CORP_ID?.trim()) &&
                          Boolean(process.env.WORKWEIXIN_CORP_SECRET?.trim());
        
        let corpId = null, corpSecret = null, agentId = null;
        
        if (!accountConfigured) {
            await noteWorkWeixinConfigHelp(prompter);
        }
        
        if (canUseEnv && !resolved.config.corpId) {
            const useEnv = await prompter.confirm({
                message: "检测到环境变量 WORKWEIXIN_CORP_ID/CORP_SECRET，是否使用?",
                initialValue: true,
            });
            if (useEnv) {
                next = {
                    ...next,
                    channels: {
                        ...next.channels,
                        workweixin: { ...next.channels?.workweixin, enabled: true },
                    },
                };
            } else {
                corpId = String(await prompter.text({
                    message: "输入 CorpId (企业ID)",
                    validate: (v) => v?.trim() ? undefined : "必填",
                })).trim();
                
                corpSecret = String(await prompter.text({
                    message: "输入 CorpSecret (应用Secret)",
                    validate: (v) => v?.trim() ? undefined : "必填",
                })).trim();
                
                agentId = String(await prompter.text({
                    message: "输入 AgentId (应用AgentId)",
                    validate: (v) => v?.trim() ? undefined : "必填",
                })).trim();
            }
        } else if (resolved.config.corpId && resolved.config.corpSecret) {
            const keep = await prompter.confirm({
                message: "WorkWeixin 已配置，是否保留?",
                initialValue: true,
            });
            if (!keep) {
                corpId = String(await prompter.text({
                    message: "输入 CorpId (企业ID)",
                    validate: (v) => v?.trim() ? undefined : "必填",
                })).trim();
                
                corpSecret = String(await prompter.text({
                    message: "输入 CorpSecret (应用Secret)",
                    validate: (v) => v?.trim() ? undefined : "必填",
                })).trim();
                
                agentId = String(await prompter.text({
                    message: "输入 AgentId (应用AgentId)",
                    validate: (v) => v?.trim() ? undefined : "必填",
                })).trim();
            }
        } else {
            corpId = String(await prompter.text({
                message: "输入 CorpId (企业ID)",
                validate: (v) => v?.trim() ? undefined : "必填",
            })).trim();
            
            corpSecret = String(await prompter.text({
                message: "输入 CorpSecret (应用Secret)",
                validate: (v) => v?.trim() ? undefined : "必填",
            })).trim();
            
            agentId = String(await prompter.text({
                message: "输入 AgentId (应用AgentId)",
                validate: (v) => v?.trim() ? undefined : "必填",
            })).trim();
        }
        
        if (corpId || corpSecret || agentId) {
            const baseConfig = {
                enabled: true,
                ...(corpId ? { corpId } : {}),
                ...(corpSecret ? { corpSecret } : {}),
                ...(agentId ? { agentId } : {}),
            };
            
            if (accountId === DEFAULT_ACCOUNT_ID) {
                next = {
                    ...next,
                    channels: {
                        ...next.channels,
                        workweixin: { ...next.channels?.workweixin, ...baseConfig },
                    },
                };
            } else {
                next = {
                    ...next,
                    channels: {
                        ...next.channels,
                        workweixin: {
                            ...next.channels?.workweixin,
                            enabled: true,
                            accounts: {
                                ...next.channels?.workweixin?.accounts,
                                [accountId]: {
                                    ...next.channels?.workweixin?.accounts?.[accountId],
                                    ...baseConfig,
                                },
                            },
                        },
                    },
                };
            }
        }
        
        if (forceAllowFrom) {
            next = await promptWorkWeixinAllowFrom({
                cfg: next,
                prompter,
                accountId,
            });
        }
        
        return { cfg: next, accountId };
    },
    
    dmPolicy,
    
    /**
     * 禁用通道
     */
    disable: (cfg) => ({
        ...cfg,
        channels: {
            ...cfg.channels,
            workweixin: { ...cfg.channels?.workweixin, enabled: false },
        },
    }),
};
