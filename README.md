# WorkWeixin Plugin for Clawdbot

企业微信通道插件，用于替代Telegram。通过企业微信机器人与Clawdbot进行交互。

## 功能

### 已完成 ✅

- ✅ 发送文本消息到企微用户
- ✅ 接收企微回调消息
- ✅ 账号配置管理
- ✅ 配对审批流程
- ✅ 消息分块发送
- ✅ 模板消息支持
- ✅ Markdown消息支持
- ✅ 消息队列与重试机制
- ✅ HTTP连接池管理
- ✅ 请求缓存优化
- ✅ 健康检查与监控
- ✅ WebHook处理器
- ✅ 消息路由
- ✅ 速率限制器
- ✅ 断路器模式
- ✅ 批量操作管理
- ✅ 账户模板
- ✅ 增强CLI命令
- ✅ 完整日志系统

### 待开发 ⏳

- [ ] 媒体消息支持（图片/视频/文件）
- [ ] 群组消息支持
- [ ] Onboarding向导
- [ ] 消息Reaction
- [ ] 线程支持

## 快速开始

### 安装

```bash
npm install clawd-gateway-wework
```

### 配置

在 `config.yaml` 中配置：

```yaml
channels:
  workweixin:
    enabled: true
    corpId: "your_corp_id"
    corpSecret: "your_corp_secret"
    agentId: "your_agent_id"
    token: "callback_token"
    encodingAESKey: "callback_aes_key"
    dmPolicy: "pairing"
    allowFrom:
      - "user1"
      - "user2"
```

### 环境变量配置

```bash
export WORKWEIXIN_CORP_ID="your_corp_id"
export WORKWEIXIN_CORP_SECRET="your_corp_secret"
```

### 回调配置

在企业微信应用管理中配置回调URL：

- **回调URL**: `https://your-domain.com/webhooks/workweixin`
- **回调Token**: (配置中的token值)
- **AES密钥**: (配置中的encodingAESKey值)

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

### 发送模板消息

```bash
clawdbot send workweixin --to userId --template '{"name":"notification","data":{"title":"标题","content":"内容"}}'
```

### 测试连接

```bash
clawdbot channels test workweixin --account default
```

### 查看队列状态

```bash
clawdbot channels queue workweixin
```

### 查看健康状态

```bash
clawdbot channels health workweixin
```

## 架构

```
clawd-gateway-wework/
├── src/
│   ├── workweixin/
│   │   ├── index.js          # 入口和导出
│   │   ├── api.js            # API客户端
│   │   ├── provider.js       # 消息发送
│   │   ├── callback.js       # 回调处理
│   │   ├── monitor.js        # 监控服务
│   │   ├── group.js          # 群发功能
│   │   ├── media.js          # 媒体消息
│   │   ├── accounts.js       # 账户管理
│   │   └── utils.js          # 工具函数
│   ├── commands/
│   │   └── workweixin.js     # CLI命令
│   └── routing/
│       └── session-key.js    # 会话路由
├── dist/                     # 编译输出
├── package.json
└── tsconfig.json
```

## 高级功能

### 消息队列

插件内置消息队列，支持：
- 自动重试（指数退避）
- 批量发送
- 失败消息重试

### 速率限制

内置API速率限制器，防止触发企微限制：
- 默认每分钟60次请求
- 可配置窗口期和限制数

### 断路器

当API调用连续失败超过阈值时，断路器会自动开启，防止雪崩效应。

### 健康检查

支持多种健康检查项：
- API连通性
- 内存使用
- 队列深度

### 监控指标

收集以下指标：
- 请求计数
- 成功/失败率
- 响应时间
- 队列状态

## 开发

### 构建

```bash
npm run build
```

### 测试

```bash
npm test
```

### 开发模式（监听）

```bash
npm run dev
```

## 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 0.2.0 | 2026-01-31 | 20次迭代增强，完成大部分功能 |
| 0.1.0 | 2026-01-30 | 初始版本，基础功能 |

## 贡献

欢迎提交Issue和PR！

## 许可证

MIT License
