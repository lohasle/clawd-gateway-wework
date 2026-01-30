import type { ClawdbotPluginApi } from "clawdbot/plugin-sdk";
import { emptyPluginConfigSchema } from "clawdbot/plugin-sdk";

import { workWeixinPlugin } from "./src/channel.js";
import { setWorkWeixinRuntime } from "./src/runtime.js";

const plugin = {
  id: "workweixin",
  name: "WorkWeixin",
  description: "Enterprise WeChat channel plugin",
  configSchema: emptyPluginConfigSchema(),
  register(api: ClawdbotPluginApi) {
    setWorkWeixinRuntime(api.runtime);
    api.registerChannel({ plugin: workWeixinPlugin });
  },
};

export default plugin;
