# WorkWeixin 企业微信插件

<p align="center">
  <strong>企业微信通道插件 - 让 Clawdbot 通过企微机器人与你交互</strong>
</p>

<p align="center">
  <a href="#功能">功能</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#配置">配置</a> •
  <a href="#架构">架构</a> •
  <a href="#开发">开发</a>
</p>

---

## 🌟 项目简介

`clawd-gateway-wework` 是一个企业微信（WeCom）通道插件，专为 Clawdbot 设计。它允许你通过企业微信机器人与 AI 助手进行交互，替代默认的 Telegram 通道。

## ✨ 功能特性

### 核心功能 ✅

- ✅ **消息收发** - 发送/接收文本消息到企微用户
- ✅ **回调处理** - 完整的企微回调消息处理
- ✅ **账号管理** - 灵活的账号配置管理系统
- ✅ **配对审批** - 安全的用户配对审批流程
- ✅ **消息分块** - 大消息自动分块发送
- ✅ **模板消息** - 支持企微模板消息
- ✅ **Markdown** - 完整 Markdown 消息支持

### 企业级特性 ✅

- ✅ **消息队列** - 带重试机制的消息队列
- ✅ **连接池** - HTTP 连接池管理
- ✅ **请求缓存** - 智能请求缓存优化
- ✅ **健康监控** - 完整的健康检查与监控
- ✅ **WebHook** - 高效的 WebHook 处理器
- ✅ **消息路由** - 灵活的消息路由系统
- ✅ **速率限制** - 内置 API 速率限制器
- ✅ **断路器** - 断路器模式防止雪崩
- ✅ **批量操作** - 批量消息操作管理

### 高级功能 ✅

- ✅ **动态 Agent** - 为每个用户/群创建独立 Agent 实例
- ✅ **增强 CLI** - 完整的命令行工具
- ✅ **日志系统** - 结构化日志输出

### 待开发 ⏳

- [ ] 媒体消息支持（图片/视频/文件）
- [ ] 群组消息支持
- [ ] Onboarding 向导
- [ ] 消息 Reaction
- [ ] 线程支持

---

## 🚀 快速开始

### 安装

```bash
npm install clawd-gateway-wework
```

### 基础配置

在 `config.yaml` 中添加：

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
export WORKWEIXIN_AGENT_ID="your_agent_id"
```

### 回调配置

在企业微信应用管理中配置回调 URL：

- **回调 URL**: `https://your-domain.com/webhooks/workweixin`
- **Token**: 配置中的 token 值
- **AES 密钥**: 配置中的 encodingAESKey 值

---

## 📖 使用指南

### 启动服务

```bash
clawdbot start --channels workweixin
```

### 检查状态

```bash
clawdbot channels status workweixin
```

### 发送消息

```bash
# 发送文本消息
clawdbot send workweixin --to userId --message "你好！"

# 发送模板消息
clawdbot send workweixin --to userId --template '{"name":"notification","data":{"title":"标题","content":"内容"}}'
```

### 测试与诊断

```bash
# 测试连接
clawdbot channels test workweixin --account default

# 查看队列状态
clawdbot channels queue workweixin

# 查看健康状态
clawdbot channels health workweixin
```

---

## 🏗️ 架构

```
clawd-gateway-wework/
├── src/
│   ├── workweixin/
│   │   ├── index.js          # 入口和导出
│   │   ├── api.js            # API 客户端
│   │   ├── provider.js       # 消息发送
│   │   ├── callback.js       # 回调处理
│   │   ├── monitor.js        # 监控服务
│   │   ├── group.js          # 群发功能
│   │   ├── media.js          # 媒体消息
│   │   ├── accounts.js       # 账户管理
│   │   └── utils.js          # 工具函数
│   ├── commands/
│   │   └── workweixin.js     # CLI 命令
│   └── routing/
│       └── session-key.js    # 会话路由
├── extensions/
│   └── workweixin/           # 插件扩展
├── dist/                     # 编译输出
├── package.json
└── README.md
```

---

## 🔧 高级功能

### 消息队列

内置消息队列，支持：
- **自动重试** - 指数退避重试策略
- **批量发送** - 合并消息提高效率
- **失败处理** - 失败消息持久化重试

### 速率限制

防止触发企微 API 限制：
- 默认每分钟 60 次请求
- 可配置窗口期和限制数

### 断路器

当 API 调用连续失败超过阈值时，断路器自动开启，防止雪崩效应。

### 健康检查

支持多种检查项：
- API 连通性
- 内存使用情况
- 队列深度

### 监控指标

收集以下指标：
- 请求计数
- 成功/失败率
- 响应时间
- 队列状态

---

## 🛠️ 开发

### 构建

```bash
npm run build
```

### 测试

```bash
npm test
```

### 开发模式

```bash
npm run dev
```

---

## 📋 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 0.2.0 | 2026-01-31 | 20次迭代增强，完成大部分功能 |
| 0.1.0 | 2026-01-30 | 初始版本，基础功能 |

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

---

## 📄 许可证

MIT License

---

## 🔗 相关链接

- [GitHub 仓库](https://github.com/lohasle/clawd-gateway-wework)
- [问题反馈](https://github.com/lohasle/clawd-gateway-wework/issues)

---

*最后更新: 2026-02-14*
