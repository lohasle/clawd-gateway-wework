// WorkWeixin Runtime
// 企业微信运行时

import { ClawdbotRuntime } from "clawdbot/plugin-sdk";

let runtime = null;

export function setWorkWeixinRuntime(r) {
    runtime = r;
}

export function getWorkWeixinRuntime() {
    if (!runtime) {
        throw new Error("WorkWeixin runtime not initialized");
    }
    return runtime;
}
