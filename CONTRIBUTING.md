# 贡献指南

感谢您考虑为 **clawd-gateway-wework** 做出贡献！

## 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发环境设置](#开发环境设置)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)
- [问题反馈](#问题反馈)

## 行为准则

本项目采用贡献者公约作为行为准则。参与此项目即表示您同意遵守其条款。

## 如何贡献

### 报告 Bug

如果您发现了 bug，请创建一个 [Issue](https://github.com/lohasle/clawd-gateway-wework/issues)，并包含：

1. 清晰的标题和描述
2. 复现步骤
3. 预期行为 vs 实际行为
4. 环境信息（Node.js 版本、操作系统等）
5. 相关日志或截图

### 提出新功能

欢迎提出新功能建议！请创建 Issue 描述：

1. 功能描述
2. 使用场景
3. 可能的实现方案

### 提交代码

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 编写代码和测试
4. 确保测试通过 (`npm test`)
5. 确保代码风格一致 (`npm run lint`)
6. 提交更改 (`git commit -m 'feat: add AmazingFeature'`)
7. 推送到分支 (`git push origin feature/AmazingFeature`)
8. 创建 Pull Request

## 开发环境设置

### 前置要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### 安装步骤

```bash
# 克隆您的 fork
git clone https://github.com/YOUR_USERNAME/clawd-gateway-wework.git

# 进入目录
cd clawd-gateway-wework

# 安装依赖
npm install

# 构建项目
npm run build

# 运行测试
npm test
```

### 项目结构

```
clawd-gateway-wework/
├── src/
│   ├── workweixin/       # 核心模块
│   │   ├── api.js        # API 客户端
│   │   ├── provider.js   # 消息发送
│   │   ├── callback.js   # 回调处理
│   │   ├── monitor.js    # 监控服务
│   │   ├── group.js      # 群发功能
│   │   ├── media.js      # 媒体消息
│   │   ├── accounts.js   # 账户管理
│   │   ├── receiver.js   # 消息接收
│   │   └── utils.js      # 工具函数
│   ├── commands/         # CLI 命令
│   ├── channels/         # 通道插件
│   └── index.js          # 入口文件
├── extensions/           # 扩展模块
├── test/                 # 测试文件
├── dist/                 # 编译输出
└── memory/               # 运行时状态
```

## 代码规范

### JavaScript/TypeScript

- 使用 ES Modules (`import/export`)
- 使用 `async/await` 处理异步操作
- 使用 JSDoc 注释函数和类
- 保持函数简洁，单一职责

### 命名约定

- **文件名**: 使用 kebab-case (`my-module.js`)
- **变量/函数**: 使用 camelCase (`myFunction`)
- **类**: 使用 PascalCase (`MyClass`)
- **常量**: 使用 UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)

### 代码风格

运行 `npm run lint` 检查代码风格。

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 类型 (type)

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具相关
- `ci`: CI 配置相关

### 示例

```
feat(api): add message queue retry mechanism

- Implement exponential backoff for failed messages
- Add max retry count configuration
- Log retry attempts for debugging

Closes #123
```

## Pull Request 流程

1. **确保测试通过**: 所有新代码都需要有对应的测试
2. **更新文档**: 如果有 API 变更，更新 README.md
3. **一个 PR 一个功能**: 保持 PR 聚焦单一功能或修复
4. **描述清晰**: PR 描述应说明变更内容和原因

### PR 检查清单

- [ ] 代码通过所有测试
- [ ] 代码通过 lint 检查
- [ ] 更新了相关文档
- [ ] 添加了必要的测试
- [ ] 遵循代码规范

## 问题反馈

如有任何问题，请：

1. 查看 [FAQ](./README_CN.md#常见问题)
2. 搜索 [Issues](https://github.com/lohasle/clawd-gateway-wework/issues)
3. 创建新 Issue

## 贡献者

感谢所有贡献者！

---

*最后更新: 2026-02-15*
