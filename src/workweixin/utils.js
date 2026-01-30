// WorkWeixin Logger
// 企业微信日志记录器

/**
 * 日志级别
 */
export const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
};

/**
 * 日志颜色配置
 */
const LOG_COLORS = {
    DEBUG: '\x1b[36m', // 青色
    INFO: '\x1b[32m',  // 绿色
    WARN: '\x1b[33m',  // 黄色
    ERROR: '\x1b[31m', // 红色
    RESET: '\x1b[0m'
};

/**
 * 日志格式化器
 */
class LogFormatter {
    static format(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const levelStr = level.toUpperCase().padEnd(5);

        if (Object.keys(meta).length > 0) {
            const metaStr = JSON.stringify(meta);
            return `[${timestamp}] [${levelStr}] ${message} ${metaStr}`;
        }

        return `[${timestamp}] [${levelStr}] ${message}`;
    }

    static formatColor(level, message) {
        const color = LOG_COLORS[level] || LOG_COLORS.INFO;
        const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
        return `${color}[${timestamp}] [${level.toUpperCase().padEnd(5)}]${LOG_COLORS.RESET} ${message}`;
    }
}

/**
 * 日志记录器类
 */
export class Logger {
    constructor(options = {}) {
        this.level = options.level || LOG_LEVELS.INFO;
        this.name = options.name || 'workweixin';
        this.silent = options.silent || false;
        this.output = options.output || console.log;
        this.useColor = options.useColor !== false;
        this.meta = {};
    }

    /**
     * 设置全局元数据
     */
    setMeta(key, value) {
        this.meta[key] = value;
    }

    /**
     * 清除元数据
     */
    clearMeta() {
        this.meta = {};
    }

    /**
     * 调试日志
     */
    debug(message, meta = {}) {
        this.log('debug', message, meta);
    }

    /**
     * 信息日志
     */
    info(message, meta = {}) {
        this.log('info', message, meta);
    }

    /**
     * 警告日志
     */
    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }

    /**
     * 错误日志
     */
    error(message, meta = {}) {
        this.log('error', message, meta);
    }

    /**
     * 核心日志方法
     */
    log(level, message, meta = {}) {
        if (this.silent) return;
        if (LOG_LEVELS[level.toUpperCase()] < this.level) return;

        const fullMeta = { ...this.meta, ...meta };
        const formatted = this.useColor
            ? LogFormatter.formatColor(level, message)
            : LogFormatter.format(level, message, fullMeta);

        const outputMethod = level === 'error' ? 'error' : 'log';
        this.output(formatted);
    }

    /**
     * 创建子记录器
     */
    child(name) {
        return new Logger({
            name: `${this.name}:${name}`,
            level: this.level,
            silent: this.silent,
            output: this.output,
            useColor: this.useColor
        });
    }

    /**
     * 设置日志级别
     */
    setLevel(level) {
        if (typeof level === 'string') {
            this.level = LOG_LEVELS[level.toUpperCase()] || LOG_LEVELS.INFO;
        } else {
            this.level = level;
        }
    }

    /**
     * 临时禁用日志
     */
    silence() {
        this.silent = true;
    }

    /**
     * 恢复日志
     */
    unsilence() {
        this.silent = false;
    }
}

// 导出默认日志记录器
export const logger = new Logger({
    name: 'workweixin',
    level: LOG_LEVELS.DEBUG
});

/**
 * 性能计时器
 */
export class Timer {
    constructor(name = 'timer') {
        this.name = name;
        this.startTime = null;
        this.endTime = null;
    }

    start() {
        this.startTime = Date.now();
        return this;
    }

    stop() {
        this.endTime = Date.now();
        return this;
    }

    /**
     * 获取经过的时间（毫秒）
     */
    elapsed() {
        const end = this.endTime || Date.now();
        return end - this.startTime;
    }

    /**
     * 获取格式化的时间字符串
     */
    format() {
        const ms = this.elapsed();
        if (ms < 1000) {
            return `${ms}ms`;
        } else if (ms < 60000) {
            return `${(ms / 1000).toFixed(2)}s`;
        } else {
            return `${(ms / 60000).toFixed(2)}m`;
        }
    }

    /**
     * 记录日志并返回时间
     */
    log(message = null) {
        const time = this.format();
        if (message) {
            logger.info(`${this.name}: ${message} - ${time}`);
        }
        return time;
    }
}

/**
 * UUID生成器
 */
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * 延迟函数
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试函数
 */
export async function retry(fn, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const delayMs = options.delayMs || 1000;
    const backoff = options.backoff || true;

    let lastError;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (i < maxRetries - 1) {
                const waitTime = backoff ? delayMs * Math.pow(2, i) : delayMs;
                await delay(waitTime);
            }
        }
    }

    throw lastError;
}

/**
 * 对象深合并
 */
export function deepMerge(target, source) {
    const result = { ...target };

    for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(result[key] || {}, source[key]);
        } else {
            result[key] = source[key];
        }
    }

    return result;
}

/**
 * 从环境变量加载配置
 */
export function loadConfigFromEnv(prefix = 'WORKWEIXIN_') {
    const config = {};

    const mappings = {
        [`${prefix}CORP_ID`]: 'corpId',
        [`${prefix}CORP_SECRET`]: 'corpSecret',
        [`${prefix}AGENT_ID`]: 'agentId',
        [`${prefix}TOKEN`]: 'token',
        [`${prefix}ENCODING_AES_KEY`]: 'encodingAESKey',
    };

    for (const [envKey, configKey] of Object.entries(mappings)) {
        const value = process.env[envKey];
        if (value) {
            config[configKey] = value;
        }
    }

    return config;
}

/**
 * 验证必需的环境变量
 */
export function requireEnvVars(...vars) {
    const missing = [];

    for (const v of vars) {
        if (!process.env[v]) {
            missing.push(v);
        }
    }

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    return true;
}

/**
 * 安全JSON解析
 */
export function safeJSONParse(str, fallback = null) {
    try {
        return JSON.parse(str);
    } catch (err) {
        return fallback;
    }
}

/**
 * 节流函数
 */
export function throttle(fn, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            fn.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 防抖函数
 */
export function debounce(fn, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * 数组分块
 */
export function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

/**
 * 限制字符串长度
 */
export function truncate(str, maxLength = 100, suffix = '...') {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * 格式化字节大小
 */
export function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
