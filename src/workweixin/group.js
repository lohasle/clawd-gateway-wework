// WorkWeixin Group/Multi-target Messaging
// 企业微信群发/多目标消息

import { getAccessToken, sendAppMessage } from "./api.js";

const WORKWEIXIN_API_BASE = "https://qyapi.weixin.qq.com";

// 日志函数
let log = { info: console.log, debug: console.log, warn: console.log, error: console.error };
export function setLogger(customLog) {
    log = customLog;
}

/**
 * 验证发送参数
 */
function validateSendParams(corpId, corpSecret, agentId, text) {
    if (!corpId || !corpSecret) {
        throw new Error("corpId and corpSecret are required");
    }
    if (!agentId) {
        throw new Error("agentId is required");
    }
    if (!text || typeof text !== "string") {
        throw new Error("Invalid text parameter");
    }
}

/**
 * 发送到用户列表
 */
export async function sendToUsers(corpId, corpSecret, agentId, userIds, text) {
    validateSendParams(corpId, corpSecret, agentId, text);

    if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new Error("userIds must be a non-empty array");
    }

    log?.debug(`[workweixin] Sending to ${userIds.length} users`);
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
        log?.error(`[workweixin] Send to users failed: ${data.errmsg}`);
        throw new Error(`Send to users failed: ${data.errmsg} (${data.errcode})`);
    }

    const invalidUsers = data.invaliduser?.split("|").filter(Boolean) || [];
    if (invalidUsers.length > 0) {
        log?.warn(`[workweixin] Invalid users: ${invalidUsers.join(", ")}`);
    }

    log?.info(`[workweixin] Message sent to users, msgId: ${data.msgid}`);

    return {
        success: true,
        msgId: data.msgid,
        invalidUsers,
    };
}

/**
 * 发送到部门
 */
export async function sendToParty(corpId, corpSecret, agentId, partyIds, text) {
    validateSendParams(corpId, corpSecret, agentId, text);

    if (!Array.isArray(partyIds) || partyIds.length === 0) {
        throw new Error("partyIds must be a non-empty array");
    }

    log?.debug(`[workweixin] Sending to ${partyIds.length} parties`);
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
        log?.error(`[workweixin] Send to party failed: ${data.errmsg}`);
        throw new Error(`Send to party failed: ${data.errmsg} (${data.errcode})`);
    }

    const invalidParty = data.invalidparty?.split("|").filter(Boolean) || [];
    if (invalidParty.length > 0) {
        log?.warn(`[workweixin] Invalid parties: ${invalidParty.join(", ")}`);
    }

    log?.info(`[workweixin] Message sent to parties, msgId: ${data.msgid}`);

    return {
        success: true,
        msgId: data.msgid,
        invalidParty,
    };
}

/**
 * 发送到标签
 */
export async function sendToTag(corpId, corpSecret, agentId, tagIds, text) {
    validateSendParams(corpId, corpSecret, agentId, text);

    if (!Array.isArray(tagIds) || tagIds.length === 0) {
        throw new Error("tagIds must be a non-empty array");
    }

    log?.debug(`[workweixin] Sending to ${tagIds.length} tags`);
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
        log?.error(`[workweixin] Send to tag failed: ${data.errmsg}`);
        throw new Error(`Send to tag failed: ${data.errmsg} (${data.errcode})`);
    }

    const invalidUsers = data.invaliduser?.split("|").filter(Boolean) || [];
    if (invalidUsers.length > 0) {
        log?.warn(`[workweixin] Invalid users from tag: ${invalidUsers.join(", ")}`);
    }

    log?.info(`[workweixin] Message sent to tags, msgId: ${data.msgid}`);

    return {
        success: true,
        msgId: data.msgid,
        invalidUsers,
        invalidTag: data.invalidtag,
    };
}

/**
 * 发送到全部 (用户+部门+标签)
 */
export async function sendToAll(corpId, corpSecret, agentId, text) {
    validateSendParams(corpId, corpSecret, agentId, text);

    log?.info(`[workweixin] Sending message to all users`);
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
        log?.error(`[workweixin] Send to all failed: ${data.errmsg}`);
        throw new Error(`Send to all failed: ${data.errmsg} (${data.errcode})`);
    }

    log?.info(`[workweixin] Message sent to all users, msgId: ${data.msgid}`);

    return {
        success: true,
        msgId: data.msgid,
    };
}

/**
 * 群发消息 (带媒体)
 */
export async function massSend(corpId, corpSecret, agentId, options) {
    if (!corpId || !corpSecret || !agentId) {
        throw new Error("corpId, corpSecret, and agentId are required");
    }

    const { toUsers, toParties, toTags, msgType, content, mediaId, title, description } = options;

    // 验证目标
    const hasTarget = (toUsers?.length > 0) || (toParties?.length > 0) || (toTags?.length > 0);
    if (!hasTarget) {
        throw new Error("At least one target (toUsers, toParties, or toTags) is required");
    }

    // 验证消息内容
    const validMsgTypes = ["text", "image", "voice", "video", "file", "news"];
    if (!validMsgTypes.includes(msgType)) {
        throw new Error(`Unsupported msgType: ${msgType}. Valid types: ${validMsgTypes.join(", ")}`);
    }

    log?.debug(`[workweixin] Mass sending ${msgType} message`);
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
            if (!content) throw new Error("content is required for text messages");
            body.text = { content };
            break;
        case "image":
        case "voice":
        case "file":
            if (!mediaId) throw new Error(`mediaId is required for ${msgType} messages`);
            body[msgType] = { media_id: mediaId };
            break;
        case "video":
            if (!mediaId) throw new Error("mediaId is required for video messages");
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
        log?.error(`[workweixin] Mass send failed: ${data.errmsg}`);
        throw new Error(`Mass send failed: ${data.errmsg} (${data.errcode})`);
    }

    const invalidUsers = data.invaliduser?.split("|").filter(Boolean) || [];
    const invalidParty = data.invalidparty?.split("|").filter(Boolean) || [];

    if (invalidUsers.length > 0 || invalidParty.length > 0) {
        log?.warn(`[workweixin] Invalid targets - users: ${invalidUsers.join(", ")}, parties: ${invalidParty.join(", ")}`);
    }

    log?.info(`[workweixin] Mass message sent, msgId: ${data.msgid}`);

    return {
        success: true,
        msgId: data.msgid,
        invalidUsers,
        invalidParty,
        invalidTag: data.invalidtag,
    };
}

/**
 * 获取部门列表
 */
export async function getDepartmentList(corpId, corpSecret) {
    if (!corpId || !corpSecret) {
        throw new Error("corpId and corpSecret are required");
    }

    log?.debug("[workweixin] Fetching department list");
    const accessToken = await getAccessToken(corpId, corpSecret);

    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/department/list?access_token=${encodeURIComponent(accessToken)}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.errcode !== 0) {
        log?.error(`[workweixin] Get department list failed: ${data.errmsg}`);
        throw new Error(`Get department list failed: ${data.errmsg} (${data.errcode})`);
    }

    const departments = data.department || [];
    log?.info(`[workweixin] Retrieved ${departments.length} departments`);

    return departments;
}

/**
 * 获取标签列表
 */
export async function getTagList(corpId, corpSecret) {
    if (!corpId || !corpSecret) {
        throw new Error("corpId and corpSecret are required");
    }

    log?.debug("[workweixin] Fetching tag list");
    const accessToken = await getAccessToken(corpId, corpSecret);

    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/tag/list?access_token=${encodeURIComponent(accessToken)}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.errcode !== 0) {
        log?.error(`[workweixin] Get tag list failed: ${data.errmsg}`);
        throw new Error(`Get tag list failed: ${data.errmsg} (${data.errcode})`);
    }

    const tags = data.taglist || [];
    log?.info(`[workweixin] Retrieved ${tags.length} tags`);

    return tags;
}

/**
 * 解析目标字符串，支持多种格式
 */
export function parseTargets(targetString) {
    if (!targetString || typeof targetString !== "string") {
        return { users: [], parties: [], tags: [] };
    }

    const result = { users: [], parties: [], tags: [] };
    const parts = targetString.split(/[,;|]/).map(p => p.trim()).filter(Boolean);

    for (const part of parts) {
        // 全部用户
        if (part === "@all") {
            log?.debug("[workweixin] Parsed target: @all (all users)");
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

    log?.debug(`[workweixin] Parsed targets - users: ${result.users.length}, parties: ${result.parties.length}, tags: ${result.tags.length}`);

    return result;
}

/**
 * 统一发送接口
 */
export async function sendWorkWeixinMessage(corpId, corpSecret, agentId, target, text) {
    if (!target || typeof target !== "string") {
        throw new Error("target must be a non-empty string");
    }

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

/**
 * 批量发送结果统计
 */
export function summarizeSendResults(results) {
    return {
        total: results.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        invalidUsers: results.flatMap(r => r.invalidUsers || []),
        invalidParty: results.flatMap(r => r.invalidParty || []),
    };
}
