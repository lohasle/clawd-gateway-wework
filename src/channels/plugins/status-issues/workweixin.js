// WorkWeixin Status Issues
// 企业微信状态问题收集

/**
 * 收集WorkWeixin配置问题
 */
export function collectWorkWeixinStatusIssues({ account, cfg, snapshot }) {
    const issues = [];
    
    // 检查是否配置
    if (!snapshot.configured) {
        issues.push({
            level: "error",
            message: "WorkWeixin not configured. Use --corp-id, --corp-secret, --agent-id to configure.",
        });
        return issues;
    }
    
    // 检查agentId
    if (!account.config.agentId) {
        issues.push({
            level: "warning",
            message: "agentId not configured. Message sending may fail.",
        });
    }
    
    // 检查回调配置
    if (!account.config.token || !account.config.encodingAESKey) {
        issues.push({
            level: "info",
            message: "Callback not configured. Enable receive messages via polling instead.",
        });
    }
    
    // 检查probe结果
    if (snapshot.probe && !snapshot.probe.ok) {
        issues.push({
            level: "error",
            message: `API probe failed: ${snapshot.probe.error}`,
        });
    }
    
    // 检查dmPolicy
    const dmPolicy = account.config.dmPolicy ?? "pairing";
    if (dmPolicy === "open") {
        issues.push({
            level: "warning",
            message: "dmPolicy=open allows messages from any user. Consider using 'pairing' or 'allowlist'.",
        });
    }
    
    // 检查allowFrom
    if (dmPolicy === "allowlist" && (!account.config.allowFrom || account.config.allowFrom.length === 0)) {
        issues.push({
            level: "warning",
            message: "dmPolicy=allowlist but allowFrom is empty. No users will be able to message.",
        });
    }
    
    return issues;
}

/**
 * 检查配置完整性
 */
export function checkWorkWeixinConfigComplete(config) {
    const issues = [];
    
    if (!config.corpId?.trim()) {
        issues.push({ field: "corpId", message: "corpId is required" });
    }
    
    if (!config.corpSecret?.trim()) {
        issues.push({ field: "corpSecret", message: "corpSecret is required" });
    }
    
    if (!config.agentId?.trim()) {
        issues.push({ field: "agentId", message: "agentId is required for message sending" });
    }
    
    return {
        complete: issues.length === 0,
        issues,
    };
}

/**
 * 验证配置值
 */
export function validateWorkWeixinConfig(config) {
    const errors = [];
    
    // corpId 应该是企业微信的corpid格式
    if (config.corpId && !/^[a-zA-Z0-9]+$/.test(config.corpId)) {
        errors.push({ field: "corpId", message: "corpId should be alphanumeric" });
    }
    
    // agentId 应该是数字
    if (config.agentId && !/^\d+$/.test(config.agentId)) {
        errors.push({ field: "agentId", message: "agentId should be numeric" });
    }
    
    // token 和 encodingAESKey 是可选的，但如果提供则验证格式
    if (config.token && config.token.length < 10) {
        errors.push({ field: "token", message: "token seems too short" });
    }
    
    if (config.encodingAESKey && config.encodingAESKey.length !== 43) {
        errors.push({ field: "encodingAESKey", message: "encodingAESKey should be 43 characters (Base64)" });
    }
    
    return {
        valid: errors.length === 0,
        errors,
    };
}
