import type { ClawdbotRuntime } from "clawdbot/plugin-sdk";

let runtime: ClawdbotRuntime | null = null;

export function setWorkWeixinRuntime(r: ClawdbotRuntime) {
  runtime = r;
}

export function getWorkWeixinRuntime(): ClawdbotRuntime {
  if (!runtime) {
    throw new Error("WorkWeixin runtime not initialized");
  }
  return runtime;
}
