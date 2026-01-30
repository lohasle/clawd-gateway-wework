// WorkWeixin Normalize Functions
// 企业微信目标规范化

/**
 * 检查是否是有效的WorkWeixin目标ID
 */
export function looksLikeWorkWeixinTargetId(target) {
    const t = String(target ?? "").trim();
    // userId 长度为1-64字符
    // partyId/tagId 为数字
    // @all 表示全部用户
    if (t === "@all") return true;
    if (/^\d+$/.test(t)) return true; // partyId or tagId
    if (t.length >= 1 && t.length <= 64) return true;
    return false;
}

/**
 * 规范化WorkWeixin消息目标
 */
export function normalizeWorkWeixinMessagingTarget(target) {
    const normalized = String(target ?? "").trim();
    if (!normalized) return normalized;
    
    // 移除可能的前缀
    return normalized
        .replace(/^(workweixin|wx|weixin):/i, "")
        .trim();
}

/**
 * 解析目标字符串
 */
export function parseWorkWeixinTarget(target) {
    const t = normalizeWorkWeixinMessagingTarget(target);
    
    if (!t) return null;
    
    // 全部用户
    if (t === "@all") {
        return { type: "all", target: t };
    }
    
    // 部门
    if (/^party:\d+$/i.test(t)) {
        return { type: "party", target: t.replace(/^party:/i, "") };
    }
    
    // 标签
    if (/^tag:\d+$/i.test(t)) {
        return { type: "tag", target: t.replace(/^tag:/i, "") };
    }
    
    // 用户 (默认)
    return { type: "user", target: t };
}

/**
 * 构建消息发送目标
 */
export function buildWorkWeixinMessageTarget(parsed) {
    switch (parsed.type) {
        case "all":
            return { touser: "@all" };
        case "party":
            return { toparty: parsed.target };
        case "tag":
            return { totag: parsed.target };
        case "user":
        default:
            return { touser: parsed.target };
    }
}
