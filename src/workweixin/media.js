// WorkWeixin Media Support
// 企业微信媒体消息支持

import { getAccessToken } from "./api.js";

const WORKWEIXIN_API_BASE = "https://qyapi.weixin.qq.com";

/**
 * 上传临时素材
 */
export async function uploadMedia(corpId, corpSecret, agentId, type, fileBuffer, fileName, contentType) {
    const accessToken = await getAccessToken(corpId, corpSecret);
    
    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/media/upload?access_token=${encodeURIComponent(accessToken)}&type=${encodeURIComponent(type)}&agentid=${encodeURIComponent(agentId)}`;
    
    // 创建FormData
    const formData = new FormData();
    formData.append("media", new Blob([fileBuffer], { type: contentType }), fileName);
    
    const res = await fetch(url, {
        method: "POST",
        body: formData,
    });
    
    const data = await res.json();
    
    if (data.errcode !== 0) {
        throw new Error(`Upload media failed: ${data.errmsg} (${data.errcode})`);
    }
    
    return {
        mediaId: data.media_id,
        createdAt: data.created_at,
        type: data.type,
    };
}

/**
 * 下载临时素材
 */
export async function downloadMedia(corpId, corpSecret, mediaId) {
    const accessToken = await getAccessToken(corpId, corpSecret);
    
    const url = `${WORKWEIXIN_API_BASE}/cgi-bin/media/get?access_token=${encodeURIComponent(accessToken)}&media_id=${encodeURIComponent(mediaId)}`;
    
    const res = await fetch(url);
    
    if (!res.ok) {
        throw new Error(`Download media failed: HTTP ${res.status}`);
    }
    
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "application/octet-stream";
    
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
    const { mediaId } = await uploadImage(corpId, corpSecret, agentId, imageBuffer, fileName);
    return sendMediaMessage(corpId, corpSecret, agentId, toUser, "image", mediaId);
}

/**
 * 发送视频消息
 */
export async function sendVideoMessage(corpId, corpSecret, agentId, toUser, videoBuffer, title, description, fileName = "video.mp4") {
    const { mediaId } = await uploadVideo(corpId, corpSecret, agentId, videoBuffer, fileName);
    return sendMediaMessage(corpId, corpSecret, agentId, toUser, "video", mediaId, title, description);
}

/**
 * 发送文件消息
 */
export async function sendFileMessage(corpId, corpSecret, agentId, toUser, fileBuffer, fileName) {
    const { mediaId } = await uploadFile(corpId, corpSecret, agentId, fileBuffer, fileName);
    return sendMediaMessage(corpId, corpSecret, agentId, toUser, "file", mediaId, null, null, fileName);
}

/**
 * 发送图文消息
 */
export async function sendNewsMessage(corpId, corpSecret, agentId, toUser, articles) {
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
        throw new Error(`Send news failed: ${data.errmsg} (${data.errcode})`);
    }
    
    return { success: true, msgId: data.msgid };
}

/**
 * 发送模板消息
 */
export async function sendTemplateMessage(corpId, corpSecret, agentId, toUser, templateId, data, url = null) {
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
        throw new Error(`Send template failed: ${result.errmsg} (${result.errcode})`);
    }
    
    return { success: true, msgId: result.msgid };
}

/**
 * 发送媒体消息 (通用)
 */
async function sendMediaMessage(corpId, corpSecret, agentId, toUser, msgType, mediaId, title = null, description = null, fileName = null) {
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
        throw new Error(`Send ${msgType} failed: ${data.errmsg} (${data.errcode})`);
    }
    
    return { success: true, msgId: data.msgid };
}

/**
 * 获取素材数量
 */
export async function getMediaCount(corpId, corpSecret) {
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
