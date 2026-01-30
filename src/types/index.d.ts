/**
 * WorkWeixin Plugin Type Definitions
 * 企业微信插件类型定义
 */

import type { ClawdbotRuntime, ClawdbotConfig } from "clawdbot/plugin-sdk";

/**
 * 企微配置
 */
export interface WorkWeixinConfig {
    /** 企业ID */
    corpId?: string;
    /** 应用密钥 */
    corpSecret?: string;
    /** 应用ID */
    agentId?: string;
    /** 回调Token */
    token?: string;
    /** 回调AES密钥 */
    encodingAESKey?: string;
    /** 消息策略 */
    dmPolicy?: "pairing" | "allowlist" | "open";
    /** 允许发送的用户 */
    allowFrom?: string[];
    /** 是否启用 */
    enabled?: boolean;
}

/**
 * 完整企微配置（带默认值）
 */
export interface FullWorkWeixinConfig extends WorkWeixinConfig {
    corpId: string;
    corpSecret: string;
    agentId: string;
    dmPolicy: "pairing" | "allowlist" | "open";
    allowFrom: string[];
    enabled: boolean;
}

/**
 * 企微消息
 */
export interface WorkWeixinMessage {
    /** 消息ID */
    msgId?: string;
    /** 发送者ID */
    fromUser: string;
    /** 接收者ID */
    toUser: string;
    /** 消息类型 */
    msgType: string;
    /** 消息内容 */
    content?: string;
    /** 创建时间 */
    createTime?: number;
    /** 应用ID */
    agentId?: number;
    /** 原始数据 */
    raw?: Record<string, unknown>;
}

/**
 * 发送消息选项
 */
export interface SendMessageOptions {
    /** 接收用户ID */
    toUser: string;
    /** 消息内容 */
    text: string;
    /** 企业ID（可选，从配置读取） */
    corpId?: string;
    /** 应用密钥（可选，从配置读取） */
    corpSecret?: string;
    /** 应用ID（可选，从配置读取） */
    agentId?: string;
    /** 账号ID */
    accountId?: string;
    /** 完整配置（可选） */
    config?: WorkWeixinConfig;
}

/**
 * 发送结果
 */
export interface SendResult {
    /** 是否成功 */
    success: boolean;
    /** 消息ID */
    msgId?: string;
    /** 账号ID */
    accountId?: string;
    /** 通道标识 */
    channel: "workweixin";
    /** 错误信息 */
    error?: string;
}

/**
 * 探测结果
 */
export interface ProbeResult {
    /** 是否成功 */
    ok: boolean;
    /** Access Token */
    accessToken?: string;
    /** 企业ID（脱敏） */
    corpId?: string;
    /** 应用ID */
    agentId?: string;
    /** 错误信息 */
    error?: string;
}

/**
 * 健康检查结果
 */
export interface HealthStatus {
    /** 整体状态 */
    status: "healthy" | "degraded" | "unhealthy";
    /** 最后检查时间 */
    lastCheckTime?: number;
    /** 运行时间（毫秒） */
    uptime?: number;
    /** 检查项结果 */
    checks?: HealthCheckResult[];
    /** 指标 */
    metrics?: HealthMetrics;
}

/**
 * 单个健康检查结果
 */
export interface HealthCheckResult {
    /** 检查名称 */
    name: string;
    /** 状态 */
    status: "healthy" | "degraded" | "unhealthy" | "error";
    /** 响应时间（毫秒） */
    responseTime?: number;
    /** 详细信息 */
    details?: Record<string, unknown>;
    /** 错误信息 */
    error?: string;
}

/**
 * 健康指标
 */
export interface HealthMetrics {
    /** 总检查次数 */
    totalChecks: number;
    /** 成功次数 */
    successfulChecks: number;
    /** 失败次数 */
    failedChecks: number;
    /** 平均响应时间 */
    averageResponseTime: number;
}

/**
 * 队列状态
 */
export interface QueueStatus {
    /** 待处理消息数 */
    pending: number;
    /** 处理中消息数 */
    processing: number;
    /** 统计数据 */
    stats: {
        total: number;
        success: number;
        failed: number;
        retries: number;
    };
    /** 失败消息数 */
    failedCount: number;
}

/**
 * 账户摘要
 */
export interface AccountSummary {
    /** 账户ID */
    accountId: string;
    /** 账户名称 */
    name: string;
    /** 是否启用 */
    enabled: boolean;
    /** 是否已配置 */
    configured: boolean;
    /** 脱敏配置 */
    maskedConfig: WorkWeixinConfig;
    /** 配置错误 */
    errors: ConfigError[];
}

/**
 * 配置错误
 */
export interface ConfigError {
    /** 字段名 */
    field: string;
    /** 错误信息 */
    message: string;
}

/**
 * 模板数据
 */
export interface TemplateData {
    /** 模板名称 */
    name: string;
    /** 模板变量 */
    data: Record<string, string>;
}

/**
 * 消息模板
 */
export interface MessageTemplate {
    /** 标题 */
    title: string;
    /** 内容 */
    content: string;
    /** 跳转URL */
    url?: string;
    /** 按钮文字 */
    btnText?: string;
}

/**
 * 路由上下文
 */
export interface RouteContext {
    /** 消息 */
    message: WorkWeixinMessage;
    /** 通道配置 */
    config: FullWorkWeixinConfig;
    /** 运行时 */
    runtime?: ClawdbotRuntime;
}

/**
 * WebHook请求
 */
export interface WebHookRequest {
    /** HTTP方法 */
    method: "GET" | "POST";
    /** 请求路径 */
    path: string;
    /** 查询参数 */
    query: Record<string, string>;
    /** 请求体 */
    body: Record<string, unknown>;
    /** 请求头 */
    headers: Record<string, string>;
}

/**
 * WebHook响应
 */
export interface WebHookResponse {
    /** 状态码 */
    statusCode: number;
    /** 响应体 */
    body: Record<string, unknown>;
}

/**
 * 日志级别
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4
}

/**
 * 插件配置选项
 */
export interface PluginOptions {
    /** 日志级别 */
    logLevel?: LogLevel;
    /** 启用控制台颜色 */
    useColors?: boolean;
    /** 最大重试次数 */
    maxRetries?: number;
    /** 重试延迟（毫秒） */
    retryDelay?: number;
    /** 速率限制窗口期（毫秒） */
    rateLimitWindow?: number;
    /** 速率限制最大请求数 */
    rateLimitMaxRequests?: number;
    /** 断路器失败阈值 */
    circuitBreakerThreshold?: number;
    /** 断路器重置超时（毫秒） */
    circuitBreakerResetTimeout?: number;
}

/**
 * 指标收集器接口
 */
export interface MetricsCollector {
    /** 增加计数器 */
    increment(name: string, value?: number): void;
    /** 设置仪表值 */
    gauge(name: string, value: number): void;
    /** 记录直方图数据 */
    histogram(name: string, value: number): void;
    /** 获取所有指标 */
    getMetrics(): Record<string, unknown>;
}
