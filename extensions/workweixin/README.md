# WorkWeixin Plugin for Clawdbot

企业微信通道插件，用于替代Telegram。

## 功能

- ✅ 发送文本消息到企微用户
- ✅ 接收企微回调消息
- ✅ 账号配置管理
- ✅ 配对审批流程
- ✅ 消息分块发送
- ⏳ 媒体消息支持（待开发）

## 配置

在 `config.yaml` 中配置：

```yaml
channels:
  workweixin:
    enabled: true
    corpId: "your_corp_id"
    corpSecret: "your_corp_secret"
    agentId: "your_agent_id"
    # 可选配置
    token: "callback_token"
    encodingAESKey: "callback_aes_key"
    dmPolicy: "pairing"  # pairing, allowlist, open
    allowFrom:
      - "user1"
      - "user2"
```

## 环境变量配置

```bash
export WORKWEIXIN_CORP_ID="your_corp_id"
export WORKWEIXIN_CORP_SECRET="your_corp_secret"
```

## 回调配置

在企业微信应用管理中配置回调URL：

```
回调URL: https://your-domain.com/webhooks/workweixin
回调Token: (配置中的token值)
AES密钥: (配置中的encodingAESKey值)
```

## 使用方法

### 启动

```bash
clawdbot start --channels workweixin
```

### 检查状态

```bash
clawdbot channels status workweixin
```

### 发送测试消息

```bash
clawdbot send workweixin --to userId --message "Hello from Clawdbot!"
```

## 开发计划

### 已完成 ✅

1. 插件基础结构
2. Provider实现（发送消息、获取access_token）
3. 账号管理功能
4. 配对审批流程
5. 消息分块发送

### 待开发 ⏳

1. 媒体消息支持
2. Onboarding向导
3. 群组消息支持
4. 消息Reaction
5. 线程支持

## API

### 发送消息

```javascript
import { sendMessageWorkWeixin } from "./provider.js";

const result = await sendMessageWorkWeixin("userId", "Hello!", {
    corpId: "...",
    corpSecret: "...",
    agentId: "...",
});
```

### 获取access_token

```javascript
import { getAccessToken } from "./provider.js";

const token = await getAccessToken(corpId, corpSecret);
```

## 错误处理

所有API调用都使用统一的错误格式：

```javascript
{
    ok: true,           // 或 false
    error: "错误信息",  // 失败时提供
    // 其他响应字段
}
```

## License

MIT
