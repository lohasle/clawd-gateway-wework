// WorkWeixin Group/Multi-target Messaging
// 企业微信群发/多目标消息

import { getAccessToken, sendAppMessage } from "./api.js";

const WORKWEIXIN_API_BASE = "https://qyapi.weixin.qq.com";

/**
 * 发送到用户列表
 */
export async function sendToUsers(corpId, corpSecret, agentId, userIds, text) {
    const accessToken = await getAccessToken(corpId, corpSecret);
    
    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/message/send?access_token=${encodeURIComponent(accessToken)}`;
    
    const body = {
        touser: userIds.join("|"),
        msgtype: "text",
        agentid: agentId,
        text: { content: text },
        safe: 0,
    };
    
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    
    const data = await res.json();
    
    if (data.errcode !== 0) {
        throw new Error(`Send to users failed: ${data.errmsg} (${data.errcode})`);
    }
    
    return {
        success: true,
        msgId: data.msgid,
        invalidUsers: data.invaliduser?.split("|") || [],
    };
}

/**
 * 发送到部门
 */
export async function sendToParty(corpId, corpSecret, agentId, partyIds, text) {
    const accessToken = await getAccessToken(corpId, corpSecret);
    
    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/message/send?access_token=${encodeURIComponent(accessToken)}`;
    
    const body = {
        toparty: partyIds.join("|"),
        msgtype: "text",
        agentid: agentId,
        text: { content: text },
        safe: 0,
    };
    
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    
    const data = await res.json();
    
    if (data.errcode !== 0) {
        throw new Error(`Send to party failed: ${data.errmsg} (${data.errcode})`);
    }
    
    return {
        success: true,
        msgId: data.msgid,
        invalidParty: data.invalidparty?.split("|") || [],
    };
}

/**
 * 发送到标签
 */
export async function sendToTag(corpId, corpSecret, agentId, tagIds, text) {
    const accessToken = await getAccessToken(corpId, corpSecret);
    
    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/message/send?access_token=${encodeURIComponent(accessToken)}`;
    
    const body = {
        totag: tagIds.join("|"),
        msgtype: "text",
        agentid: agentId,
        text: { content: text },
        safe: 0,
    };
    
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    
    const data = await res.json();
    
    if (data.errcode !== 0) {
        throw new Error(`Send to tag failed: ${data.errmsg} (${data.errcode})`);
    }
    
    return {
        success: true,
        msgId: data.msgid,
        invalidUsers: data.invaliduser?.split("|") || [],
        invalidTag: data.invalidtag,
    };
}

/**
 * 发送到全部 (用户+部门+标签)
 */
export async function sendToAll(corpId, corpSecret, agentId, text) {
    const accessToken = await getAccessToken(corpId, corpSecret);
    
    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/message/send?access_token=${encodeURIComponent(accessToken)}`;
    
    const body = {
        touser: "@all",
        msgtype: "text",
        agentid: agentId,
        text: { content: text },
        safe: 0,
    };
    
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    
    const data = await res.json();
    
    if (data.errcode !== 0) {
        throw new Error(`Send to all failed: ${data.errmsg} (${data.errcode})`);
    }
    
    return {
        success: true,
        msgId: data.msgid,
    };
}

/**
 * 群发消息 (带媒体)
 */
export async function massSend(corpId, corpSecret, agentId, options) {
    const { toUsers, toParties, toTags, msgType, content, mediaId, title, description } = options;
    
    const accessToken = await getAccessToken(corpId, corpSecret);
    
    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/message/send?access_token=${encodeURIComponent(accessToken)}`;
    
    const body = {
        ...(toUsers?.length > 0 && { touser: toUsers.join("|") }),
        ...(toParties?.length > 0 && { toparty: toParties.join("|") }),
        ...(toTags?.length > 0 && { totag: toTags.join("|") }),
        msgtype: msgType,
        agentid: agentId,
    };
    
    // 根据消息类型添加内容
    switch (msgType) {
        case "text":
            body.text = { content };
            break;
        case "image":
        case "voice":
        case "file":
            body[msgType] = { media_id: mediaId };
            break;
        case "video":
            body.video = {
                media_id: mediaId,
                ...(title && { title }),
                ...(description && { description }),
            };
            break;
        default:
            throw new Error(`Unsupported msgType: ${msgType}`);
    }
    
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    
    const data = await res.json();
    
    if (data.errcode !== 0) {
        throw new Error(`Mass send failed: ${data.errmsg} (${data.errcode})`);
    }
    
    return {
        success: true,
        msgId: data.msgid,
        invalidUsers: data.invaliduser?.split("|") || [],
        invalidParty: data.invalidparty?.split("|") || [],
        invalidTag: data.invalidtag,
    };
}

/**
 * 获取部门列表
 */
export async function getDepartmentList(corpId, corpSecret) {
    const accessToken = await getAccessToken(corpId, corpSecret);
    
    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/department/list?access_token=${encodeURIComponent(accessToken)}`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.errcode !== 0) {
        throw new Error(`Get department list failed: ${data.errmsg} (${data.errcode})`);
    }
    
    return data.department || [];
}

/**
 * 获取标签列表
 */
export async function getTagList(corpId, corpSecret) {
    const accessToken = await getAccessToken(corpId, corpSecret);
    
    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/tag/list?access_token=${encodeURIComponent(accessToken)}`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.errcode !== 0) {
        throw new Error(`Get tag list failed: ${data.errmsg} (${data.errcode})`);
    }
    
    return data.taglist || [];
}

/**
 * 解析目标字符串，支持多种格式
 */
export function parseTargets(targetString) {
    if (!targetString) return { users: [], parties: [], tags: [] };
    
    const result = { users: [], parties: [], tags: [] };
    const parts = targetString.split(/[,;|]/).map(p => p.trim()).filter(Boolean);
    
    for (const part of parts) {
        // 全部用户
        if (part === "@all") {
            return { users: ["@all"], parties: [], tags: [] };
        }
        
        // 部门
        if (/^party:(\d+)$/i.test(part)) {
            const id = part.match(/^party:(\d+)$/i)[1];
            result.parties.push(id);
            continue;
        }
        
        // 标签
        if (/^tag:(\d+)$/i.test(part)) {
            const id = part.match(/^tag:(\d+)$/i)[1];
            result.tags.push(id);
            continue;
        }
        
        // 纯数字 (可能是部门或标签ID)
        if (/^\d+$/.test(part)) {
            // 默认视为用户ID，除非有明确前缀
            result.users.push(part);
            continue;
        }
        
        // 用户ID
        result.users.push(part);
    }
    
    return result;
}

/**
 * 统一发送接口
 */
export async function sendWorkWeixinMessage(corpId, corpSecret, agentId, target, text) {
    const { users, parties, tags } = parseTargets(target);
    
    // 优先级: 用户 > 标签 > 部门
    if (users.length > 0) {
        if (users[0] === "@all") {
            return sendToAll(corpId, corpSecret, agentId, text);
        }
        return sendToUsers(corpId, corpSecret, agentId, users, text);
    }
    
    if (tags.length > 0) {
        return sendToTag(corpId, corpSecret, agentId, tags, text);
    }
    
    if (parties.length > 0) {
        return sendToParty(corpId, corpSecret, agentId, parties, text);
    }
    
    throw new Error("No valid target specified");
}
