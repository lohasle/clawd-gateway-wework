// WorkWeixin Plugin Index
// 企业微信插件入口

import { setWorkWeixinRuntime } from "./runtime.js";
import { workWeixinPlugin } from "./channel.js";

const plugin = {
    id: "workweixin",
    name: "WorkWeixin",
    description: "Enterprise WeChat channel plugin",
    register(api) {
        setWorkWeixinRuntime(api.runtime);
        api.registerChannel({ plugin: workWeixinPlugin });
    },
};

export default plugin;
