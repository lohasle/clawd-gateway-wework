// WorkWeixin API Client
// 企业微信API客户端

const WORKWEIXIN_API_BASE = "https://qyapi.weixin.qq.com";

/**
 * 获取access_token
 */
export async function getAccessToken(corpId, corpSecret) {
    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(corpSecret)}`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.errcode !== 0) {
        throw new Error(`Failed to get access_token: ${data.errmsg} (code: ${data.errcode})`);
    }
    
    return {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
    };
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
