// WorkWeixin Message Actions
// 企业微信消息动作

import { isEmpty } from "../utils.js";

/**
 * WorkWeixin消息动作列表
 */
export function listWorkWeixinActions(ctx) {
    const { message } = ctx;
    const actions = [];
    
    // 默认动作
    actions.push({
        id: "reply",
        label: "Reply",
        icon: "reply",
        description: "Send a reply to this message",
    });
    
    // 如果消息中有链接，可以添加打开链接动作
    if (message.text && /https?:\/\/[^\s]+/.test(message.text)) {
        actions.push({
            id: "open-link",
            label: "Open Link",
            icon: "external-link",
            description: "Open the link in the message",
        });
    }
    
    return actions;
}

/**
 * 提取工具发送
 */
export function extractWorkWeixinToolSend(ctx) {
    const { message, toolResults } = ctx;
    
    // 从工具结果中提取需要发送的内容
    if (toolResults && toolResults.length > 0) {
        const lastResult = toolResults[toolResults.length - 1];
        if (lastResult?.content) {
            return {
                text: lastResult.content,
            };
        }
    }
    
    return null;
}

/**
 * 处理消息动作
 */
export async function handleWorkWeixinAction(ctx) {
    const { action, message, deps } = ctx;
    
    switch (action.id) {
        case "reply":
            return {
                action: "reply",
                target: message.fromUser,
                text: null, // 用户输入
            };
        
        case "open-link":
            const links = message.text?.match(/https?:\/\/[^\s]+/g) || [];
            return {
                action: "open-link",
                links,
            };
        
        default:
            return { action: "unknown" };
    }
}
