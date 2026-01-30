// WorkWeixin API Client
// 企业微信API客户端

const WORKWEIXIN_API_BASE = "https://qyapi.weixin.qq.com";

// 日志函数
let log = { info: console.log, debug: console.log, warn: console.log, error: console.error };
export function setLogger(customLog) {
    log = customLog;
}

/**
 * HTTP连接池管理
 */
class HttpConnectionPool {
    constructor(options = {}) {
        this.maxConnections = options.maxConnections || 10;
        this.connections = new Map();
        this.timeout = options.timeout || 30000;
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            avgResponseTime: 0
        };
    }

    /**
     * 获取或创建连接
     */
    getConnection(key) {
        if (!this.connections.has(key)) {
            if (this.connections.size >= this.maxConnections) {
                // 移除最早的连接
                const oldestKey = this.connections.keys().next().value;
                this.connections.delete(oldestKey);
                log?.debug(`[workweixin] Connection pool full, removed oldest: ${oldestKey}`);
            }
            this.connections.set(key, {
                createdAt: Date.now(),
                lastUsed: Date.now(),
                useCount: 0
            });
        }

        const conn = this.connections.get(key);
        conn.lastUsed = Date.now();
        conn.useCount++;
        return conn;
    }

    /**
     * 执行HTTP请求（带连接管理）
     */
    async request(url, options = {}) {
        const startTime = Date.now();
        this.stats.totalRequests++;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.timeout);

            const res = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    "Content-Type": "application/json",
                    ...options.headers
                }
            });

            clearTimeout(timeoutId);

            const responseTime = Date.now() - startTime;
            this.updateAvgResponseTime(responseTime);
            this.stats.successfulRequests++;

            return res;
        } catch (err) {
            this.stats.failedRequests++;
            throw err;
        }
    }

    /**
     * 更新平均响应时间
     */
    updateAvgResponseTime(newTime) {
        const total = this.stats.successfulRequests;
        this.stats.avgResponseTime = ((this.stats.avgResponseTime * (total - 1)) + newTime) / total;
    }

    /**
     * 获取池状态
     */
    getStatus() {
        return {
            activeConnections: this.connections.size,
            maxConnections: this.maxConnections,
            stats: this.stats
        };
    }

    /**
     * 清理过期连接
     */
    cleanup(maxAge = 300000) { // 5分钟
        const now = Date.now();
        for (const [key, conn] of this.connections) {
            if (now - conn.lastUsed > maxAge) {
                this.connections.delete(key);
                log?.debug(`[workweixin] Cleaned up idle connection: ${key}`);
            }
        }
    }

    /**
     * 清空连接池
     */
    clear() {
        this.connections.clear();
        log?.info("[workweixin] Connection pool cleared");
    }
}

export const connectionPool = new HttpConnectionPool({
    maxConnections: 10,
    timeout: 30000
});

/**
 * 请求缓存 - 用于减少重复API调用
 */
class RequestCache {
    constructor(options = {}) {
        this.cache = new Map();
        this.maxSize = options.maxSize || 100;
        this.defaultTTL = options.defaultTTL || 60000; // 1分钟
    }

    /**
     * 生成缓存key
     */
    generateKey(method, url, params = {}) {
        const paramStr = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
        return `${method}:${url}?${paramStr}`;
    }

    /**
     * 获取缓存
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        entry.hitCount++;
        return entry.data;
    }

    /**
     * 设置缓存
     */
    set(key, data, ttl = this.defaultTTL) {
        if (this.cache.size >= this.maxSize) {
            // 移除最少使用的条目
            let minHit = Infinity;
            let minKey = null;
            for (const [k, v] of this.cache) {
                if (v.hitCount < minHit) {
                    minHit = v.hitCount;
                    minKey = k;
                }
            }
            if (minKey) this.cache.delete(minKey);
        }

        this.cache.set(key, {
            data,
            expiresAt: Date.now() + ttl,
            createdAt: Date.now(),
            hitCount: 0
        });
    }

    /**
     * 获取缓存状态
     */
    getStatus() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            entries: Array.from(this.cache.entries()).map(([k, v]) => ({
                key: k.substring(0, 50) + (k.length > 50 ? '...' : ''),
                hitCount: v.hitCount,
                expiresAt: v.expiresAt
            }))
        };
    }

    /**
     * 清空缓存
     */
    clear() {
        this.cache.clear();
    }
}

export const requestCache = new RequestCache({
    maxSize: 100,
    defaultTTL: 30000
});

/**
 * 获取access_token
 */
export async function getAccessToken(corpId, corpSecret) {
    const cacheKey = requestCache.generateKey('GET', '/cgi-bin/gettoken', { corpId });

    // 尝试从缓存获取
    const cached = requestCache.get(cacheKey);
    if (cached) {
        log?.debug(`[workweixin] Using cached access token`);
        return cached;
    }

    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(corpSecret)}`;

    const res = await connectionPool.request(url, { method: "GET" });
    const data = await res.json();

    if (data.errcode !== 0) {
        throw new Error(`Failed to get access_token: ${data.errmsg} (code: ${data.errcode})`);
    }

    const result = {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
    };

    // 缓存access_token (缓存时间比过期时间短)
    requestCache.set(cacheKey, result, (data.expires_in - 120) * 1000);

    return result;
}

/**
 * 发送应用消息
 * @param {string} accessToken - 访问令牌
 * @param {object} options - 消息选项
 */
export async function sendAppMessage(accessToken, options) {
    const {
        corpId,
        corpSecret,
        agentId,
        toUser,        // 接收者userId，@all表示全部
        toParty,       // 接收者部门id
        toTag,         // 接收者标签id
        msgType = "text",
        content,
        mediaId,
        title,
        description,
        url,
        btnText,
        safe = 0,
    } = options;

    // 输入验证
    if (!accessToken || typeof accessToken !== "string") {
        throw new Error("Invalid access token");
    }
    if (!agentId) {
        throw new Error("Agent ID is required");
    }
    if (!toUser && !toParty && !toTag) {
        throw new Error("At least one of toUser, toParty, or toTag must be provided");
    }

    const messageBody = {
        touser: toUser,
        toparty: toParty,
        totag: toTag,
        msgtype: msgType,
        agentid: agentId,
        safe,
        text: {
            content: content || "",
        },
        // For other message types
        ...(msgType === "image" && { image: { media_id: mediaId } }),
        ...(msgType === "news" && {
            news: {
                articles: [{
                    title: title || "",
                    description: description || "",
                    url: url,
                    picurl: mediaId,
                }],
            },
        }),
        ...(msgType === "textcard" && {
            textcard: {
                title: title || "",
                description: description || "",
                url: url,
                btntxt: btnText || "详情",
            },
        }),
    };

    const url_send = `${WORKWEIXIN_API_BASE}/cgi-bin/message/send?access_token=${encodeURIComponent(accessToken)}`;

    const res = await fetch(url_send, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(messageBody),
    });

    const data = await res.json();

    if (data.errcode !== 0) {
        throw new Error(`Failed to send message: ${data.errmsg} (code: ${data.errcode})`);
    }

    return {
        msgId: data.msgid,
        invalidUser: data.invaliduser,
        invalidParty: data.invalidparty,
        invalidTag: data.invalidtag,
    };
}

/**
 * 发送文本消息
 */
export async function sendTextMessage(corpId, corpSecret, agentId, toUser, content) {
    const { accessToken } = await getAccessToken(corpId, corpSecret);
    return sendAppMessage(accessToken, {
        corpId,
        corpSecret,
        agentId,
        toUser,
        msgType: "text",
        content,
    });
}

/**
 * 获取用户信息
 */
export async function getUserInfo(accessToken, userId) {
    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/user/get?access_token=${encodeURIComponent(accessToken)}&userid=${encodeURIComponent(userId)}`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.errcode !== 0) {
        throw new Error(`Failed to get user info: ${data.errmsg} (code: ${data.errcode})`);
    }
    
    return {
        userId: data.userid,
        name: data.name,
        department: data.department,
        position: data.position,
        mobile: data.mobile,
        email: data.email,
        avatar: data.avatar,
        status: data.status,
    };
}

/**
 * 获取部门成员列表
 */
export async function getDepartmentUsers(accessToken, departmentId, fetchChild = true) {
    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/user/list?access_token=${encodeURIComponent(accessToken)}&department_id=${encodeURIComponent(departmentId)}&fetch_child=${fetchChild ? 1 : 0}`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.errcode !== 0) {
        throw new Error(`Failed to get department users: ${data.errmsg} (code: ${data.errcode})`);
    }
    
    return {
        users: data.userlist || [],
    };
}

/**
 * 上传临时素材
 */
export async function uploadMedia(accessToken, agentId, type, fileBuffer, fileName, contentType) {
    const FormData = (await import("formdata-lib")).default || (await import("form-data")).default;
    
    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/media/upload?access_token=${encodeURIComponent(accessToken)}&type=${encodeURIComponent(type)}&agentid=${encodeURIComponent(agentId)}`;
    
    const form = new FormData();
    form.append("media", new Blob([fileBuffer], { type: contentType }), fileName);
    
    const res = await fetch(url, {
        method: "POST",
        body: form,
    });
    
    const data = await res.json();
    
    if (data.errcode !== 0) {
        throw new Error(`Failed to upload media: ${data.errmsg} (code: ${data.errcode})`);
    }
    
    return {
        mediaId: data.media_id,
        createdAt: data.created_at,
    };
}

/**
 * 下载临时素材
 */
export async function downloadMedia(accessToken, mediaId) {
    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/media/get?access_token=${encodeURIComponent(accessToken)}&media_id=${encodeURIComponent(mediaId)}`;
    
    const res = await fetch(url);
    
    if (!res.ok) {
        throw new Error(`Failed to download media: HTTP ${res.status}`);
    }
    
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "application/octet-stream";
    
    return {
        buffer,
        contentType,
    };
}

/**
 * 验证回调签名
 */
export function verifyCallbackSignature(token, timestamp, nonce, signature) {
    const crypto = await import("crypto");
    const sorted = [token, timestamp, nonce].sort();
    const signatureStr = crypto.createHash("sha1").update(sorted.join("")).digest("hex");
    return signature === signatureStr;
}

/**
 * 解密回调消息
 */
export function decryptMessage(encodingAESKey, encryptedMsg) {
    const crypto = await import("crypto");
    
    const key = Buffer.from(encodingAESKey + "=", "base64");
    const msgBuf = Buffer.from(encryptedMsg, "base64");
    
    // 提取前16字节作为iv
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
    
    return content.toString("utf8");
}

/**
 * 验证URL（回调模式）
 */
export function verifyURL(token, encodingAESKey, signature, timestamp, nonce, echostr) {
    const crypto = await import("crypto");
    const sorted = [token, timestamp, nonce, echostr].sort();
    const signatureStr = crypto.createHash("sha1").update(sorted.join("")).digest("hex");
    
    if (signature !== signatureStr) {
        return { success: false, error: "Signature mismatch" };
    }
    
    const decrypted = decryptMessage(encodingAESKey, echostr);
    return { success: true, decrypted };
}
