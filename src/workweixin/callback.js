// WorkWeixin Callback Handler
// 企业微信回调处理器

import crypto from "crypto";

const WORKWEIXIN_API_BASE = "https://qyapi.weixin.qq.com";

/**
 * 验证回调签名
 */
export function verifyCallbackSignature(token, timestamp, nonce, signature) {
    const sorted = [token, timestamp, nonce].sort();
    const signatureStr = crypto.createHash("sha1").update(sorted.join("")).digest("hex");
    return signature === signatureStr;
}

/**
 * 解密消息
 */
export function decryptMessage(encodingAESKey, encryptedMsg) {
    try {
        const key = Buffer.from(encodingAESKey + "=", "base64");
        const msgBuf = Buffer.from(encryptedMsg, "base64");
        const iv = key.slice(0, 16);
        
        const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
        decipher.setAutoPadding(false);
        
        let decrypted = Buffer.concat([decipher.update(msgBuf), decipher.final()]);
        
        // 移除PKCS7 padding
        const pad = decrypted[decrypted.length - 1];
        if (pad < 1 || pad > 32) {
            throw new Error("Invalid padding");
        }
        decrypted = decrypted.slice(0, -pad);
        
        // 格式: [4字节长度][内容][4字节长度][随机数]
        const contentLen = decrypted.readUInt32BE(0);
        const content = decrypted.slice(4, 4 + contentLen);
        
        return JSON.parse(content.toString("utf8"));
    } catch (err) {
        throw new Error(`Decrypt failed: ${err.message}`);
    }
}

/**
 * 加密消息（用于响应）
 */
export function encryptMessage(encodingAESKey, content, random = null) {
    const key = Buffer.from(encodingAESKey + "=", "base64");
    const iv = crypto.randomBytes(16);
    
    const contentStr = JSON.stringify(content);
    const contentBuf = Buffer.from(contentStr, "utf8");
    const contentLen = Buffer.alloc(4);
    contentLen.writeUInt32BE(contentBuf.length, 0);
    const randomBuf = random || crypto.randomBytes(crypto.randomInt(16, 32));
    
    const totalBuf = Buffer.concat([contentLen, contentBuf, contentLen, randomBuf]);
    
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    cipher.setAutoPadding(false);
    
    let encrypted = Buffer.concat([cipher.update(totalBuf), cipher.final()]);
    
    // 格式: [4字节长度][随机数+加密内容]
    const ivBase64 = iv.toString("base64");
    const encryptedBase64 = encrypted.toString("base64");
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(iv.length + encrypted.length, 0);
    
    return ivBase64 + encryptedBase64;
}

/**
 * 验证URL（回调模式 GET 请求）
 */
export function verifyURL(token, encodingAESKey, signature, timestamp, nonce, echostr) {
    if (!verifyCallbackSignature(token, timestamp, nonce, signature)) {
        return { success: false, error: "Signature mismatch" };
    }
    
    try {
        const decrypted = decryptMessage(encodingAESKey, echostr);
        return { success: true, decrypted };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * 处理回调请求
 */
export async function handleCallbackRequest({
    method,           // GET or POST
    query,            // URL query params: msg_signature, timestamp, nonce, echostr (for GET)
    body,             // POST body: encrypt, etc.
    config,           // WorkWeixin config: token, encodingAESKey, corpId, corpSecret, agentId
    onMessage,        // Callback for incoming messages
}) {
    const { token, encodingAESKey } = config;
    
    // GET request - URL verification
    if (method === "GET") {
        const { msg_signature, timestamp, nonce, echostr } = query;
        
        if (!token || !timestamp || !nonce || !echostr) {
            return { statusCode: 400, body: { errcode: -1, errmsg: "Missing parameters" } };
        }
        
        if (!msg_signature) {
            // 简单验证模式
            return { statusCode: 200, body: echostr };
        }
        
        const result = verifyURL(token, encodingAESKey, msg_signature, timestamp, nonce, echostr);
        
        if (!result.success) {
            return { statusCode: 401, body: { errcode: -1, errmsg: result.error } };
        }
        
        return { statusCode: 200, body: result.decrypted };
    }
    
    // POST request - Message processing
    if (method === "POST") {
        const { msg_signature, timestamp, nonce } = query;
        const { encrypt } = body || {};
        
        if (!encrypt) {
            return { statusCode: 400, body: { errcode: -1, errmsg: "Missing encrypt field" } };
        }
        
        // 验证签名
        if (msg_signature && token && timestamp && nonce) {
            if (!verifyCallbackSignature(token, timestamp, nonce, msg_signature)) {
                return { statusCode: 401, body: { errcode: -1, errmsg: "Signature mismatch" } };
            }
        }
        
        // 解密消息
        let messageBody = body;
        if (encodingAESKey && encrypt) {
            try {
                messageBody = decryptMessage(encodingAESKey, encrypt);
            } catch (err) {
                return { statusCode: 500, body: { errcode: -1, errmsg: `Decrypt failed: ${err.message}` } };
            }
        }
        
        // 解析消息
        const message = parseMessage(messageBody);
        
        // 调用消息处理回调
        if (onMessage && message) {
            await onMessage(message);
        }
        
        // 返回成功响应
        return { statusCode: 200, body: { errcode: 0, errmsg: "ok" } };
    }
    
    return { statusCode: 405, body: { errcode: -1, errmsg: "Method not allowed" } };
}

/**
 * 解析企微消息
 */
export function parseMessage(body) {
    if (!body || !body.MsgType) {
        return null;
    }
    
    const base = {
        msgId: body.MsgId,
        fromUser: body.FromUserName,
        toUser: body.ToUserName,
        msgType: body.MsgType,
        createTime: body.CreateTime,
        agentId: body.AgentID,
    };
    
    switch (body.MsgType) {
        case "text":
            return { ...base, content: body.Content || "", text: { content: body.Content } };
        
        case "image":
            return { ...base, image: { mediaId: body.MediaId, picUrl: body.PicUrl } };
        
        case "voice":
            return { ...base, voice: { mediaId: body.MediaId, format: body.Format } };
        
        case "video":
            return { ...base, video: { mediaId: body.MediaId, thumbMediaId: body.ThumbMediaId } };
        
        case "location":
            return { ...base, location: { x: body.Location_X, y: body.Location_Y, scale: body.Scale, label: body.Label } };
        
        case "link":
            return { ...base, link: { title: body.Title, description: body.Description, url: body.Url, picUrl: body.PicUrl } };
        
        case "event":
            return { ...base, event: body.Event, eventKey: body.EventKey };
        
        default:
            return { ...base, raw: body };
    }
}

/**
 * 创建回调响应（成功）
 */
export function createSuccessResponse(encodingAESKey) {
    return { errcode: 0, errmsg: "ok" };
}

/**
 * 创建错误响应
 */
export function createErrorResponse(error, encodingAESKey = null) {
    const body = { errcode: -1, errmsg: String(error) };

    if (encodingAESKey) {
        const encrypted = encryptMessage(encodingAESKey, body);
        return { encrypt: encrypted };
    }

    return body;
}

/**
 * 消息路由器
 */
class MessageRouter {
    constructor() {
        this.routes = new Map();
        this.defaultHandler = null;
        this.middleware = [];
    }

    /**
     * 注册路由
     */
    register(msgType, handler, options = {}) {
        const key = options.event ? `${msgType}:${options.event}` : msgType;
        this.routes.set(key, {
            handler,
            priority: options.priority || 0
        });
    }

    /**
     * 设置默认处理器
     */
    setDefault(handler) {
        this.defaultHandler = handler;
    }

    /**
     * 添加中间件
     */
    use(middleware) {
        this.middleware.push(middleware);
    }

    /**
     * 路由消息
     */
    async route(message) {
        const { msgType, event } = message;

        // 按优先级排序的路由
        const sortedRoutes = Array.from(this.routes.entries())
            .sort((a, b) => b[1].priority - a[1].priority);

        // 查找匹配路由
        const eventKey = event ? `${msgType}:${event}` : null;
        let matchedRoute = null;

        for (const [key, route] of sortedRoutes) {
            if (key === msgType || key === eventKey) {
                matchedRoute = route;
                break;
            }
        }

        // 执行中间件
        let context = { message };
        for (const mw of this.middleware) {
            context = await mw(context);
            if (context === null) {
                return null; // 中间件拦截
            }
        }

        // 执行处理器
        if (matchedRoute) {
            return await matchedRoute.handler(message, context);
        }

        if (this.defaultHandler) {
            return await this.defaultHandler(message, context);
        }

        log?.warn(`[workweixin] No handler for message type: ${msgType}`);
        return null;
    }

    /**
     * 获取所有路由
     */
    getRoutes() {
        return Array.from(this.routes.entries()).map(([key, route]) => ({
            key,
            priority: route.priority
        }));
    }
}

export const messageRouter = new MessageRouter();

/**
 * WebHook处理器
 */
class WebHookHandler {
    constructor(options = {}) {
        this.config = options.config || {};
        this.router = options.router || messageRouter;
        this.healthChecker = options.healthChecker || null;
        this.errorHandler = options.errorHandler || null;
        this.middlewares = [];
    }

    /**
     * 配置
     */
    configure(config) {
        this.config = { ...this.config, ...config };
    }

    /**
     * 添加中间件
     */
    use(middleware) {
        this.middlewares.push(middleware);
    }

    /**
     * 处理请求
     */
    async handle(request) {
        const startTime = Date.now();

        try {
            // 执行请求前中间件
            for (const mw of this.middlewares) {
                const result = await mw(request);
                if (result === false) {
                    return { statusCode: 403, body: { errcode: -1, errmsg: "Blocked by middleware" } };
                }
            }

            // 健康检查请求
            if (request.path === '/health' || request.query?.action === 'health') {
                if (this.healthChecker) {
                    const health = await this.healthChecker.check();
                    return {
                        statusCode: health.status === 'healthy' ? 200 : 503,
                        body: health
                    };
                }
                return { statusCode: 200, body: { status: 'ok' } };
            }

            // 指标请求
            if (request.path === '/metrics' || request.query?.action === 'metrics') {
                return { statusCode: 200, body: { status: 'ok', message: "Metrics endpoint" } };
            }

            // 回调验证请求
            if (request.method === 'GET') {
                const verifyResult = await this.handleVerification(request);
                return verifyResult;
            }

            // 回调消息请求
            if (request.method === 'POST') {
                const processResult = await this.handleMessage(request);
                return processResult;
            }

            return { statusCode: 405, body: { errcode: -1, errmsg: "Method not allowed" } };
        } catch (err) {
            log?.error(`[workweixin] WebHook error: ${err.message}`);

            if (this.errorHandler) {
                return await this.errorHandler(err, request);
            }

            return {
                statusCode: 500,
                body: { errcode: -1, errmsg: err.message }
            };
        } finally {
            const duration = Date.now() - startTime;
            log?.debug(`[workweixin] WebHook request processed in ${duration}ms`);
        }
    }

    /**
     * 处理验证请求
     */
    async handleVerification(request) {
        const { query } = request;
        const { msg_signature, timestamp, nonce, echostr } = query;

        if (!this.config.token) {
            return { statusCode: 200, body: echostr };
        }

        const result = verifyURL(
            this.config.token,
            this.config.encodingAESKey,
            msg_signature,
            timestamp,
            nonce,
            echostr
        );

        if (!result.success) {
            return { statusCode: 401, body: { errcode: -1, errmsg: result.error } };
        }

        return { statusCode: 200, body: result.decrypted };
    }

    /**
     * 处理消息请求
     */
    async handleMessage(request) {
        const { query, body } = request;
        const { msg_signature, timestamp, nonce } = query;

        // 验证签名
        if (msg_signature && this.config.token && timestamp && nonce) {
            if (!verifyCallbackSignature(this.config.token, timestamp, nonce, msg_signature)) {
                return { statusCode: 401, body: { errcode: -1, errmsg: "Signature mismatch" } };
            }
        }

        // 解密消息
        let messageBody = body;
        if (this.config.encodingAESKey && body?.encrypt) {
            try {
                messageBody = decryptMessage(this.config.encodingAESKey, body.encrypt);
            } catch (err) {
                return { statusCode: 500, body: { errcode: -1, errmsg: `Decrypt failed: ${err.message}` } };
            }
        }

        // 解析消息
        const message = parseMessage(messageBody);
        if (!message) {
            return { statusCode: 400, body: { errcode: -1, errmsg: "Invalid message format" } };
        }

        // 路由消息
        const result = await this.router.route(message);

        // 返回响应
        if (this.config.encodingAESKey) {
            const encrypted = encryptMessage(this.config.encodingAESKey, { errcode: 0, errmsg: "ok" });
            return { statusCode: 200, body: { encrypt: encrypted } };
        }

        return { statusCode: 200, body: { errcode: 0, errmsg: "ok" } };
    }
}

export const webHookHandler = new WebHookHandler();
