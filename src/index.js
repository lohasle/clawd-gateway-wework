/**
 * Clawd-Gateway-WeWork Plugin
 * 企业微信通道插件主入口
 *
 * @module clawd-gateway-wework
 */

// 版本信息
export const VERSION = "0.2.0";
export const PLUGIN_NAME = "clawd-gateway-wework";
export const PLUGIN_DESCRIPTION = "企业微信通道插件 - 通过企微机器人驱动Clawdbot";

// 导出所有功能模块
export * from "./workweixin/index.js";
export * from "./workweixin/provider.js";
export * from "./workweixin/api.js";
export * from "./workweixin/callback.js";
export * from "./workweixin/monitor.js";
export * from "./workweixin/group.js";
export * from "./workweixin/media.js";
export * from "./workweixin/accounts.js";
export * from "./workweixin/utils.js";
export * from "./workweixin/receiver.js";
export * from "./commands/workweixin.js";

// 插件信息
export const pluginInfo = {
    name: PLUGIN_NAME,
    version: VERSION,
    description: PLUGIN_DESCRIPTION,
    author: "lohasle",
    repository: "https://github.com/lohasle/clawd-gateway-wework",
    capabilities: [
        "text_messages",
        "template_messages",
        "markdown_messages",
        "media_messages",
        "news_messages",
        "textcard_messages",
        "miniprogram_messages",
        "group_messages",
        "callback_webhook",
        "message_queue",
        "retry_mechanism",
        "rate_limiting",
        "circuit_breaker",
        "health_monitoring",
        "account_management",
        "session_management",
        "auto_reply",
    ],
    supportedMessageTypes: [
        "text",
        "image",
        "voice",
        "video",
        "file",
        "news",
        "textcard",
        "miniprogram",
        "template",
        "markdown",
    ],
    supportedEventTypes: [
        "subscribe",
        "unsubscribe",
        "scan",
        "click",
        "view",
    ],
};

// 默认配置
export const defaultConfig = {
    enabled: false,
    dmPolicy: "pairing",
    groupPolicy: "allowlist",
    allowFrom: [],
    maxMessageLength: 2000,
    retryAttempts: 3,
    retryDelay: 1000,
    rateLimitWindow: 60000,
    rateLimitMaxRequests: 60,
    circuitBreakerThreshold: 5,
    circuitBreakerResetTimeout: 30000,
};

// 插件初始化函数
export async function initialize(options = {}) {
    const {
        logger,
        config,
        eventEmitter,
    } = options;

    // 设置日志
    if (logger) {
        const { setLogger: setApiLogger } = await import("./workweixin/api.js");
        const { setLogger: setProviderLogger } = await import("./workweixin/provider.js");
        const { setLogger: setCallbackLogger } = await import("./workweixin/callback.js");
        const { setLogger: setMediaLogger } = await import("./workweixin/media.js");

        setApiLogger(logger);
        setProviderLogger(logger);
        setCallbackLogger(logger);
        setMediaLogger(logger);
    }

    // 初始化健康检查
    const { healthChecker } = await import("./workweixin/monitor.js");
    healthChecker.register('plugin_initialized', async () => {
        return { status: 'healthy', initialized: true };
    });

    // 设置事件发射器
    if (eventEmitter) {
        const { messageReceiver } = await import("./workweixin/receiver.js");
        messageReceiver.on("text", async (message) => {
            eventEmitter.emit("message:workweixin", message);
        });
        messageReceiver.onEvent("subscribe", async (message) => {
            eventEmitter.emit("event:workweixin:subscribe", message);
        });
    }

    console.log(`[${PLUGIN_NAME}] Plugin initialized v${VERSION}`);

    return {
        version: VERSION,
        info: pluginInfo,
        config: defaultConfig,
    };
}

// 便捷函数：创建插件实例
export function createPlugin(customConfig = {}) {
    return {
        name: PLUGIN_NAME,
        version: VERSION,
        description: PLUGIN_DESCRIPTION,
        initialize,
        defaultConfig,
        customConfig,
    };
}

// 导出所有命令映射
export const commands = {
    "channels:add:workweixin": {
        name: "add-workweixin",
        handler: async (args, config, logger) => {
            const { addWorkWeixinChannel } = await import("./commands/workweixin.js");
            return addWorkWeixinChannel(args, config, logger);
        },
    },
    "channels:status:workweixin": {
        name: "status-workweixin",
        handler: async (args, config, logger) => {
            const { showWorkWeixinStatus } = await import("./commands/workweixin.js");
            return showWorkWeixinStatus(config, logger);
        },
    },
    "channels:list:workweixin": {
        name: "list-workweixin",
        handler: async (args, config, logger) => {
            const { listWorkWeixinAccounts } = await import("./commands/workweixin.js");
            return listWorkWeixinAccounts(config);
        },
    },
    "send:workweixin": {
        name: "send-workweixin",
        handler: async (args, config, logger) => {
            const { sendWorkWeixinMessage } = await import("./commands/workweixin.js");
            return sendWorkWeixinMessage(args, config, logger);
        },
    },
    "channels:test:workweixin": {
        name: "test-workweixin",
        handler: async (args, config, logger) => {
            const { testConnection } = await import("./commands/workweixin.js");
            return testConnection(args, config, logger);
        },
    },
    "channels:queue:workweixin": {
        name: "queue-workweixin",
        handler: async (args, config, logger) => {
            const { getQueueStatus } = await import("./commands/workweixin.js");
            return getQueueStatus();
        },
    },
    "channels:health:workweixin": {
        name: "health-workweixin",
        handler: async (args, config, logger) => {
            const { getHealthStatus } = await import("./commands/workweixin.js");
            return getHealthStatus();
        },
    },
    "channels:metrics:workweixin": {
        name: "metrics-workweixin",
        handler: async (args, config, logger) => {
            const { getMetrics } = await import("./commands/workweixin.js");
            return getMetrics();
        },
    },
    "channels:listen:workweixin": {
        name: "listen-workweixin",
        handler: async (args, config, logger) => {
            const { listenMessages } = await import("./commands/workweixin.js");
            return listenMessages(args, config, logger);
        },
    },
    "channels:broadcast:workweixin": {
        name: "broadcast-workweixin",
        handler: async (args, config, logger) => {
            const { broadcastMessage } = await import("./commands/workweixin.js");
            return broadcastMessage(args, config, logger);
        },
    },
    "channels:help:workweixin": {
        name: "help-workweixin",
        handler: async (args, config, logger) => {
            const { getHelp } = await import("./commands/workweixin.js");
            return getHelp();
        },
    },
};

// 快速开始示例
export const quickStartExample = `
# 快速开始

1. 添加账户:
   clawdbot channels add workweixin --corp-id YOUR_CORP_ID --corp-secret YOUR_CORP_SECRET --agent-id YOUR_AGENT_ID

2. 测试连接:
   clawdbot channels test workweixin

3. 发送消息:
   clawdbot send workweixin --to userId --message "Hello!"

4. 查看状态:
   clawdbot channels status workweixin

5. 监听消息:
   clawdbot channels listen workweixin
`;

// 默认导出
export default {
    VERSION,
    PLUGIN_NAME,
    PLUGIN_DESCRIPTION,
    pluginInfo,
    defaultConfig,
    initialize,
    createPlugin,
    commands,
    quickStartExample,
};
