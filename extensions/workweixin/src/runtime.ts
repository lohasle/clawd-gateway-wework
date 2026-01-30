import type { ClawdbotRuntime } from "clawdbot/plugin-sdk";

let runtime: ClawdbotRuntime | null = null;

/**
 * 设置WorkWeixin运行时实例
 * @param r - Clawdbot运行时实例
 */
export function setWorkWeixinRuntime(r: ClawdbotRuntime): void {
  if (!r) {
    throw new Error("Cannot set empty runtime");
  }
  runtime = r;
  // 记录初始化日志
  r.log?.info("[workweixin] Runtime initialized successfully");
}

/**
 * 获取WorkWeixin运行时实例
 * @returns Clawdbot运行时实例
 * @throws Error - 当运行时未初始化时抛出
 */
export function getWorkWeixinRuntime(): ClawdbotRuntime {
  if (!runtime) {
    throw new Error("WorkWeixin runtime not initialized. Did you forget to call setWorkWeixinRuntime()?");
  }
  return runtime;
}

/**
 * 检查运行时是否已初始化
 * @returns 是否已初始化
 */
export function isWorkWeixinRuntimeInitialized(): boolean {
  return runtime !== null;
}

/**
 * 重置运行时（主要用于测试）
 */
export function resetWorkWeixinRuntime(): void {
  runtime = null;
}
