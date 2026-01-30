// WorkWeixin Media Support
// 企业微信媒体消息支持

import { getAccessToken } from "./api.js";

const WORKWEIXIN_API_BASE = "https://qyapi.weixin.qq.com";
const WORKWEIXIN_API_BASE_V3 = "https://api.weixin.qq.com";

// 日志函数
let log = { info: console.log, debug: console.log, warn: console.log, error: console.error };
export function setLogger(customLog) {
    log = customLog;
}

// 支持的媒体类型
const VALID_MEDIA_TYPES = ["image", "voice", "video", "file"];

// 图片尺寸限制
const IMAGE_LIMITS = {
    image: { maxSize: 10 * 1024 * 1024, maxWidth: 2048, maxHeight: 2048 }, // 10MB
    voice: { maxSize: 2 * 1024 * 1024, maxDuration: 60 }, // 2MB, 60秒
    video: { maxSize: 10 * 1024 * 1024, maxDuration: 300 }, // 10MB, 5分钟
    file: { maxSize: 20 * 1024 * 1024 } // 20MB
};

/**
 * 验证媒体上传参数
 */
function validateUploadParams(corpId, corpSecret, agentId, type, fileBuffer, fileName) {
    if (!corpId || !corpSecret) {
        throw new Error("corpId and corpSecret are required");
    }
    if (!agentId) {
        throw new Error("agentId is required");
    }
    if (!VALID_MEDIA_TYPES.includes(type)) {
        throw new Error(`Invalid media type: ${type}. Valid types: ${VALID_MEDIA_TYPES.join(", ")}`);
    }
    if (!fileBuffer || !(fileBuffer instanceof ArrayBuffer)) {
        throw new Error("fileBuffer must be a valid ArrayBuffer");
    }
    if (!fileName || typeof fileName !== "string") {
        throw new Error("fileName must be a non-empty string");
    }
}

/**
 * 验证图片尺寸
 */
function validateImageDimensions(width, height, limits) {
    if (width > limits.maxWidth || height > limits.maxHeight) {
        throw new Error(`Image dimensions exceed limit: ${limits.maxWidth}x${limits.maxHeight}`);
    }
}

/**
 * 验证媒体大小
 */
function validateMediaSize(size, type) {
    const limits = IMAGE_LIMITS[type];
    if (size > limits.maxSize) {
        throw new Error(`Media size (${size} bytes) exceeds ${type} limit (${limits.maxSize} bytes)`);
    }
}

/**
 * 猜测MIME类型
 */
export function guessContentType(fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const mimeTypes = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
        mp4: "video/mp4",
        mov: "video/quicktime",
        avi: "video/x-msvideo",
        mp3: "audio/mpeg",
        wav: "audio/wav",
        amr: "audio/amr",
        pdf: "application/pdf",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xls: "application/vnd.ms-excel",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ppt: "application/vnd.ms-powerpoint",
        pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        zip: "application/zip",
    };
    return mimeTypes[ext] || "application/octet-stream";
}

/**
 * 上传临时素材
 */
export async function uploadMedia(corpId, corpSecret, agentId, type, fileBuffer, fileName, contentType) {
    validateUploadParams(corpId, corpSecret, agentId, type, fileBuffer, fileName);

    // 验证文件大小
    validateMediaSize(fileBuffer.byteLength, type);

    log?.info(`[workweixin] Uploading ${type} media: ${fileName} (${fileBuffer.byteLength} bytes)`);
    const accessToken = await getAccessToken(corpId, corpSecret);

    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/media/upload?access_token=${encodeURIComponent(accessToken)}&type=${encodeURIComponent(type)}&agentid=${encodeURIComponent(agentId)}`;

    // 创建FormData
    const formData = new FormData();
    formData.append("media", new Blob([fileBuffer], { type: contentType || guessContentType(fileName) }), fileName);

    const res = await fetch(url, {
        method: "POST",
        body: formData,
    });

    const data = await res.json();

    if (data.errcode !== 0) {
        log?.error(`[workweixin] Upload media failed: ${data.errmsg}`);
        throw new Error(`Upload media failed: ${data.errmsg} (${data.errcode})`);
    }

    log?.info(`[workweixin] Media uploaded successfully, mediaId: ${data.media_id}`);

    return {
        mediaId: data.media_id,
        createdAt: data.created_at,
        type: data.type,
        size: fileBuffer.byteLength,
    };
}

/**
 * 下载临时素材
 */
export async function downloadMedia(corpId, corpSecret, mediaId) {
    if (!corpId || !corpSecret) {
        throw new Error("corpId and corpSecret are required");
    }
    if (!mediaId || typeof mediaId !== "string") {
        throw new Error("mediaId must be a non-empty string");
    }

    log?.debug(`[workweixin] Downloading media: ${mediaId}`);
    const accessToken = await getAccessToken(corpId, corpSecret);

    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/media/get?access_token=${encodeURIComponent(accessToken)}&media_id=${encodeURIComponent(mediaId)}`;

    const res = await fetch(url);

    if (!res.ok) {
        log?.error(`[workweixin] Download media failed: HTTP ${res.status}`);
        throw new Error(`Download media failed: HTTP ${res.status}`);
    }

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "application/octet-stream";

    log?.info(`[workweixin] Media downloaded: ${buffer.byteLength} bytes, type: ${contentType}`);

    return {
        buffer,
        contentType,
        size: buffer.byteLength,
    };
}

/**
 * 上传图片素材（用于图文消息）
 */
export async function uploadImage(corpId, corpSecret, agentId, imageBuffer, fileName = "image.jpg") {
    return uploadMedia(corpId, corpSecret, agentId, "image", imageBuffer, fileName, "image/jpeg");
}

/**
 * 上传视频素材
 */
export async function uploadVideo(corpId, corpSecret, agentId, videoBuffer, fileName = "video.mp4", title, description) {
    if (!title) title = fileName;
    const result = await uploadMedia(corpId, corpSecret, agentId, "video", videoBuffer, fileName, "video/mp4");

    // 视频需要额外设置标题和描述
    return {
        ...result,
        title,
        description,
    };
}

/**
 * 上传语音素材
 */
export async function uploadVoice(corpId, corpSecret, agentId, voiceBuffer, fileName = "voice.amr") {
    return uploadMedia(corpId, corpSecret, agentId, "voice", voiceBuffer, fileName, "audio/amr");
}

/**
 * 上传文件素材
 */
export async function uploadFile(corpId, corpSecret, agentId, fileBuffer, fileName) {
    return uploadMedia(corpId, corpSecret, agentId, "file", fileBuffer, fileName, guessContentType(fileName));
}

/**
 * 发送图片消息
 */
export async function sendImageMessage(corpId, corpSecret, agentId, toUser, imageBuffer, fileName = "image.jpg") {
    if (!toUser || typeof toUser !== "string") {
        throw new Error("toUser must be a non-empty string");
    }

    log?.info(`[workweixin] Sending image to user: ${toUser}`);
    const { mediaId } = await uploadImage(corpId, corpSecret, agentId, imageBuffer, fileName);

    const accessToken = await getAccessToken(corpId, corpSecret);
    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/message/send?access_token=${encodeURIComponent(accessToken)}`;

    const body = {
        touser: toUser,
        msgtype: "image",
        agentid: agentId,
        image: { media_id: mediaId },
    };

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const data = await res.json();

    if (data.errcode !== 0) {
        throw new Error(`Send image failed: ${data.errmsg} (${data.errcode})`);
    }

    log?.info(`[workweixin] Image message sent, msgId: ${data.msgid}`);

    return { success: true, msgId: data.msgid };
}

/**
 * 发送视频消息
 */
export async function sendVideoMessage(corpId, corpSecret, agentId, toUser, videoBuffer, title, description, fileName = "video.mp4") {
    if (!toUser || typeof toUser !== "string") {
        throw new Error("toUser must be a non-empty string");
    }

    log?.info(`[workweixin] Sending video to user: ${toUser}`);
    const { mediaId } = await uploadVideo(corpId, corpSecret, agentId, videoBuffer, fileName, title, description);

    const accessToken = await getAccessToken(corpId, corpSecret);
    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/message/send?access_token=${encodeURIComponent(accessToken)}`;

    const body = {
        touser: toUser,
        msgtype: "video",
        agentid: agentId,
        video: {
            media_id: mediaId,
            ...(title && { title }),
            ...(description && { description }),
        },
    };

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const data = await res.json();

    if (data.errcode !== 0) {
        throw new Error(`Send video failed: ${data.errmsg} (${data.errcode})`);
    }

    return { success: true, msgId: data.msgid };
}

/**
 * 发送文件消息
 */
export async function sendFileMessage(corpId, corpSecret, agentId, toUser, fileBuffer, fileName) {
    if (!toUser || typeof toUser !== "string") {
        throw new Error("toUser must be a non-empty string");
    }

    log?.info(`[workweixin] Sending file to user: ${toUser}`);
    const { mediaId } = await uploadFile(corpId, corpSecret, agentId, fileBuffer, fileName);

    const accessToken = await getAccessToken(corpId, corpSecret);
    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/message/send?access_token=${encodeURIComponent(accessToken)}`;

    const body = {
        touser: toUser,
        msgtype: "file",
        agentid: agentId,
        file: { media_id: mediaId },
    };

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const data = await res.json();

    if (data.errcode !== 0) {
        throw new Error(`Send file failed: ${data.errmsg} (${data.errcode})`);
    }

    return { success: true, msgId: data.msgid };
}

/**
 * 发送图文消息（支持多图多文）
 */
export async function sendNewsMessage(corpId, corpSecret, agentId, toUser, articles) {
    if (!toUser || typeof toUser !== "string") {
        throw new Error("toUser must be a non-empty string");
    }
    if (!Array.isArray(articles) || articles.length === 0) {
        throw new Error("articles must be a non-empty array");
    }
    if (articles.length > 8) {
        throw new Error("Maximum 8 articles allowed");
    }

    log?.info(`[workweixin] Sending news with ${articles.length} articles to user: ${toUser}`);
    const accessToken = await getAccessToken(corpId, corpSecret);
    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/message/send?access_token=${encodeURIComponent(accessToken)}`;

    const body = {
        touser: toUser,
        msgtype: "news",
        agentid: agentId,
        news: {
            articles: articles.map(a => ({
                title: a.title || "",
                description: a.description || "",
                url: a.url || "",
                picurl: a.picUrl || a.picurl || "",
            })),
        },
    };

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const data = await res.json();

    if (data.errcode !== 0) {
        throw new Error(`Send news failed: ${data.errmsg} (${data.errcode})`);
    }

    log?.info(`[workweixin] News message sent, msgId: ${data.msgid}`);

    return { success: true, msgId: data.msgid };
}

/**
 * 发送模板消息（用于微信模板消息API）
 */
export async function sendTemplateMessageV2(corpId, corpSecret, agentId, toUser, templateId, data, url = null, miniProgram = null) {
    if (!toUser || typeof toUser !== "string") {
        throw new Error("toUser must be a non-empty string");
    }
    if (!templateId || typeof templateId !== "string") {
        throw new Error("templateId must be a non-empty string");
    }
    if (!data || typeof data !== "object") {
        throw new Error("data must be an object");
    }

    log?.info(`[workweixin] Sending template message to user: ${toUser}`);
    const accessToken = await getAccessToken(corpId, corpSecret);
    const url_send = `${WORKWEIXIN_API_BASE}/cgi-bin/message/template/send?access_token=${encodeURIComponent(accessToken)}`;

    const body = {
        touser: toUser,
        template_id: templateId,
        agentid: agentId,
        data,
    };

    if (url) {
        body.url = url;
    }

    if (miniProgram) {
        body.miniprogram = {
            appid: miniProgram.appid,
            pagepath: miniProgram.pagepath,
        };
    }

    const res = await fetch(url_send, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const result = await res.json();

    if (result.errcode !== 0) {
        throw new Error(`Send template failed: ${result.errmsg} (${result.errcode})`);
    }

    log?.info(`[workweixin] Template message sent, msgId: ${result.msgid}`);

    return { success: true, msgId: result.msgid };
}

/**
 * 发送文本卡片消息
 */
export async function sendTextCardMessage(corpId, corpSecret, agentId, toUser, title, description, url, btnText = "详情") {
    if (!toUser || typeof toUser !== "string") {
        throw new Error("toUser must be a non-empty string");
    }

    log?.info(`[workweixin] Sending textcard to user: ${toUser}`);
    const accessToken = await getAccessToken(corpId, corpSecret);
    const url_send = `${WORKWEIXIN_API_BASE}/cgi-bin/message/send?access_token=${encodeURIComponent(accessToken)}`;

    const body = {
        touser: toUser,
        msgtype: "textcard",
        agentid: agentId,
        textcard: {
            title,
            description,
            url,
            btntxt: btnText,
        },
    };

    const res = await fetch(url_send, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const data = await res.json();

    if (data.errcode !== 0) {
        throw new Error(`Send textcard failed: ${data.errmsg} (${data.errcode})`);
    }

    return { success: true, msgId: data.msgid };
}

/**
 * 发送小程序消息
 */
export async function sendMiniProgramMessage(corpId, corpSecret, agentId, toUser, appid, title, thumbMediaId, pagepath) {
    if (!toUser || typeof toUser !== "string") {
        throw new Error("toUser must be a non-empty string");
    }
    if (!appid || typeof appid !== "string") {
        throw new Error("appid must be a non-empty string");
    }

    log?.info(`[workweixin] Sending miniprogram to user: ${toUser}`);
    const accessToken = await getAccessToken(corpId, corpSecret);
    const url_send = `${WORKWEIXIN_API_BASE}/cgi-bin/message/send?access_token=${encodeURIComponent(accessToken)}`;

    const body = {
        touser: toUser,
        msgtype: "miniprogram",
        agentid: agentId,
        miniprogram: {
            appid,
            title,
            thumb_media_id: thumbMediaId,
            pagepath,
        },
    };

    const res = await fetch(url_send, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const data = await res.json();

    if (data.errcode !== 0) {
        throw new Error(`Send miniprogram failed: ${data.errmsg} (${data.errcode})`);
    }

    return { success: true, msgId: data.msgid };
}

/**
 * 获取素材数量
 */
export async function getMediaCount(corpId, corpSecret) {
    if (!corpId || !corpSecret) {
        throw new Error("corpId and corpSecret are required");
    }

    log?.debug("[workweixin] Fetching media count");
    const accessToken = await getAccessToken(corpId, corpSecret);

    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/material/get_count?access_token=${encodeURIComponent(accessToken)}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.errcode !== 0) {
        throw new Error(`Get media count failed: ${data.errmsg} (${data.errcode})`);
    }

    return {
        voiceCount: data.voice_count,
        videoCount: data.video_count,
        imageCount: data.image_count,
        fileCount: data.file_count,
    };
}

/**
 * 批量发送不同类型消息
 */
export async function sendMixedMessages(corpId, corpSecret, agentId, toUser, messages) {
    if (!toUser || typeof toUser !== "string") {
        throw new Error("toUser must be a non-empty string");
    }
    if (!Array.isArray(messages) || messages.length === 0) {
        throw new Error("messages must be a non-empty array");
    }

    log?.info(`[workweixin] Sending ${messages.length} mixed messages to user: ${toUser}`);

    const results = [];

    for (const msg of messages) {
        try {
            let result;
            switch (msg.type) {
                case "text":
                    const accessToken = await getAccessToken(corpId, corpSecret);
                    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/message/send?access_token=${encodeURIComponent(accessToken)}`;
                    const body = {
                        touser: toUser,
                        msgtype: "text",
                        agentid: agentId,
                        text: { content: msg.content },
                    };
                    const res = await fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(body),
                    });
                    const data = await res.json();
                    result = { type: "text", success: data.errcode === 0, msgId: data.msgid };
                    break;

                case "image":
                    result = await sendImageMessage(corpId, corpSecret, agentId, toUser, msg.buffer, msg.fileName);
                    result.type = "image";
                    break;

                case "news":
                    result = await sendNewsMessage(corpId, corpSecret, agentId, toUser, msg.articles);
                    result.type = "news";
                    break;

                case "textcard":
                    result = await sendTextCardMessage(corpId, corpSecret, agentId, toUser, msg.title, msg.description, msg.url, msg.btnText);
                    result.type = "textcard";
                    break;

                default:
                    result = { type: msg.type, success: false, error: `Unsupported message type: ${msg.type}` };
            }
            results.push(result);
        } catch (err) {
            results.push({ type: msg.type, success: false, error: err.message });
        }
    }

    return {
        total: messages.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
    };
}

/**
 * 下载临时素材
 */
export async function downloadMedia(corpId, corpSecret, mediaId) {
    if (!corpId || !corpSecret) {
        throw new Error("corpId and corpSecret are required");
    }
    if (!mediaId || typeof mediaId !== "string") {
        throw new Error("mediaId must be a non-empty string");
    }

    log?.debug(`[workweixin] Downloading media: ${mediaId}`);
    const accessToken = await getAccessToken(corpId, corpSecret);

    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/media/get?access_token=${encodeURIComponent(accessToken)}&media_id=${encodeURIComponent(mediaId)}`;

    const res = await fetch(url);

    if (!res.ok) {
        log?.error(`[workweixin] Download media failed: HTTP ${res.status}`);
        throw new Error(`Download media failed: HTTP ${res.status}`);
    }

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "application/octet-stream";

    log?.info(`[workweixin] Media downloaded: ${buffer.byteLength} bytes, type: ${contentType}`);

    return {
        buffer,
        contentType,
        size: buffer.byteLength,
    };
}

/**
 * 上传图片素材 (用于图文消息)
 */
export async function uploadImage(corpId, corpSecret, agentId, imageBuffer, fileName = "image.jpg") {
    return uploadMedia(corpId, corpSecret, agentId, "image", imageBuffer, fileName, "image/jpeg");
}

/**
 * 上传视频素材
 */
export async function uploadVideo(corpId, corpSecret, agentId, videoBuffer, fileName = "video.mp4") {
    return uploadMedia(corpId, corpSecret, agentId, "video", videoBuffer, fileName, "video/mp4");
}

/**
 * 上传语音素材
 */
export async function uploadVoice(corpId, corpSecret, agentId, voiceBuffer, fileName = "voice.amr") {
    return uploadMedia(corpId, corpSecret, agentId, "voice", voiceBuffer, fileName, "audio/amr");
}

/**
 * 上传文件素材
 */
export async function uploadFile(corpId, corpSecret, agentId, fileBuffer, fileName) {
    return uploadMedia(corpId, corpSecret, agentId, "file", fileBuffer, fileName, "application/octet-stream");
}

/**
 * 发送图片消息
 */
export async function sendImageMessage(corpId, corpSecret, agentId, toUser, imageBuffer, fileName = "image.jpg") {
    if (!toUser || typeof toUser !== "string") {
        throw new Error("toUser must be a non-empty string");
    }

    log?.info(`[workweixin] Sending image to user: ${toUser}`);
    const { mediaId } = await uploadImage(corpId, corpSecret, agentId, imageBuffer, fileName);
    return sendMediaMessage(corpId, corpSecret, agentId, toUser, "image", mediaId);
}

/**
 * 发送视频消息
 */
export async function sendVideoMessage(corpId, corpSecret, agentId, toUser, videoBuffer, title, description, fileName = "video.mp4") {
    if (!toUser || typeof toUser !== "string") {
        throw new Error("toUser must be a non-empty string");
    }

    log?.info(`[workweixin] Sending video to user: ${toUser}`);
    const { mediaId } = await uploadVideo(corpId, corpSecret, agentId, videoBuffer, fileName);
    return sendMediaMessage(corpId, corpSecret, agentId, toUser, "video", mediaId, title, description);
}

/**
 * 发送文件消息
 */
export async function sendFileMessage(corpId, corpSecret, agentId, toUser, fileBuffer, fileName) {
    if (!toUser || typeof toUser !== "string") {
        throw new Error("toUser must be a non-empty string");
    }

    log?.info(`[workweixin] Sending file to user: ${toUser}`);
    const { mediaId } = await uploadFile(corpId, corpSecret, agentId, fileBuffer, fileName);
    return sendMediaMessage(corpId, corpSecret, agentId, toUser, "file", mediaId, null, null, fileName);
}

/**
 * 发送图文消息
 */
export async function sendNewsMessage(corpId, corpSecret, agentId, toUser, articles) {
    if (!corpId || !corpSecret || !agentId) {
        throw new Error("corpId, corpSecret, and agentId are required");
    }
    if (!toUser || typeof toUser !== "string") {
        throw new Error("toUser must be a non-empty string");
    }
    if (!Array.isArray(articles) || articles.length === 0) {
        throw new Error("articles must be a non-empty array");
    }

    log?.info(`[workweixin] Sending news to user: ${toUser}, articles: ${articles.length}`);
    const accessToken = await getAccessToken(corpId, corpSecret);

    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/message/send?access_token=${encodeURIComponent(accessToken)}`;

    const body = {
        touser: toUser,
        msgtype: "news",
        agentid: agentId,
        news: {
            articles: articles.map(article => ({
                title: article.title || "",
                description: article.description || "",
                url: article.url || "",
                picurl: article.picUrl || "",
            })),
        },
    };

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const data = await res.json();

    if (data.errcode !== 0) {
        log?.error(`[workweixin] Send news failed: ${data.errmsg}`);
        throw new Error(`Send news failed: ${data.errmsg} (${data.errcode})`);
    }

    log?.info(`[workweixin] News message sent, msgId: ${data.msgid}`);

    return { success: true, msgId: data.msgid };
}

/**
 * 发送模板消息
 */
export async function sendTemplateMessage(corpId, corpSecret, agentId, toUser, templateId, data, url = null) {
    if (!corpId || !corpSecret || !agentId) {
        throw new Error("corpId, corpSecret, and agentId are required");
    }
    if (!toUser || typeof toUser !== "string") {
        throw new Error("toUser must be a non-empty string");
    }
    if (!templateId || typeof templateId !== "string") {
        throw new Error("templateId must be a non-empty string");
    }
    if (!data || typeof data !== "object") {
        throw new Error("data must be an object");
    }

    log?.info(`[workweixin] Sending template message to user: ${toUser}`);
    const accessToken = await getAccessToken(corpId, corpSecret);

    const url_send = `${WORKWEIXIN_API_BASE}/cgi-bin/message/template/send?access_token=${encodeURIComponent(accessToken)}`;

    const body = {
        touser: toUser,
        template_id: templateId,
        agentid: agentId,
        data,
    };

    if (url) {
        body.url = url;
    }

    const res = await fetch(url_send, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const result = await res.json();

    if (result.errcode !== 0) {
        log?.error(`[workweixin] Send template failed: ${result.errmsg}`);
        throw new Error(`Send template failed: ${result.errmsg} (${result.errcode})`);
    }

    log?.info(`[workweixin] Template message sent, msgId: ${result.msgid}`);

    return { success: true, msgId: result.msgid };
}

/**
 * 发送媒体消息 (通用)
 */
async function sendMediaMessage(corpId, corpSecret, agentId, toUser, msgType, mediaId, title = null, description = null, fileName = null) {
    if (!corpId || !corpSecret || !agentId) {
        throw new Error("corpId, corpSecret, and agentId are required");
    }
    if (!toUser || typeof toUser !== "string") {
        throw new Error("toUser must be a non-empty string");
    }
    if (!VALID_MEDIA_TYPES.includes(msgType)) {
        throw new Error(`Unsupported media type: ${msgType}`);
    }
    if (!mediaId || typeof mediaId !== "string") {
        throw new Error("mediaId must be a non-empty string");
    }

    log?.debug(`[workweixin] Sending ${msgType} to user: ${toUser}`);
    const accessToken = await getAccessToken(corpId, corpSecret);

    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/message/send?access_token=${encodeURIComponent(accessToken)}`;

    const body = {
        touser: toUser,
        msgtype: msgType,
        agentid: agentId,
    };

    switch (msgType) {
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
            throw new Error(`Unsupported media type: ${msgType}`);
    }

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const data = await res.json();

    if (data.errcode !== 0) {
        log?.error(`[workweixin] Send ${msgType} failed: ${data.errmsg}`);
        throw new Error(`Send ${msgType} failed: ${data.errmsg} (${data.errcode})`);
    }

    log?.info(`[workweixin] ${msgType} message sent, msgId: ${data.msgid}`);

    return { success: true, msgId: data.msgid };
}

/**
 * 获取素材数量
 */
export async function getMediaCount(corpId, corpSecret) {
    if (!corpId || !corpSecret) {
        throw new Error("corpId and corpSecret are required");
    }

    log?.debug("[workweixin] Fetching media count");
    const accessToken = await getAccessToken(corpId, corpSecret);

    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/material/get_count?access_token=${encodeURIComponent(accessToken)}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.errcode !== 0) {
        log?.error(`[workweixin] Get media count failed: ${data.errmsg}`);
        throw new Error(`Get media count failed: ${data.errmsg} (${data.errcode})`);
    }

    const count = {
        voiceCount: data.voice_count,
        videoCount: data.video_count,
        imageCount: data.image_count,
        fileCount: data.file_count,
    };

    log?.info(`[workweixin] Media count - voice: ${count.voiceCount}, video: ${count.videoCount}, image: ${count.imageCount}, file: ${count.fileCount}`);

    return count;
}

/**
 * 验证媒体文件大小
 */
export function validateMediaSize(buffer, maxSize = 10 * 1024 * 1024) {
    if (!buffer || !(buffer instanceof ArrayBuffer)) {
        throw new Error("Invalid buffer");
    }
    const size = buffer.byteLength;
    if (size > maxSize) {
        throw new Error(`Media size (${size} bytes) exceeds maximum allowed (${maxSize} bytes)`);
    }
    return true;
}

/**
 * 猜测内容的MIME类型
 */
export function guessContentType(fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const mimeTypes = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        mp4: "video/mp4",
        mov: "video/quicktime",
        mp3: "audio/mpeg",
        amr: "audio/amr",
        pdf: "application/pdf",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
    return mimeTypes[ext] || "application/octet-stream";
}
