# 贡献指南

感谢您考虑为 **clawd-gateway-wework** 做出贡献！

## 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发环境设置](#开发环境设置)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)
- [问题报告](#问题报告)
- [功能请求](#功能请求)

---

## 行为准则

本项目采用贡献者公约作为行为准则。参与此项目即表示您同意遵守其条款。请阅读 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) 了解详情。

---

## 如何贡献

### 快速开始

1. Fork 本项目
2. 克隆您的 Fork (`git clone https://github.com/YOUR_USERNAME/clawd-gateway-wework.git`)
3. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
4. 进行更改并提交 (`git commit -m 'feat: add AmazingFeature'`)
5. 推送到分支 (`git push origin feature/AmazingFeature`)
6. 创建一个 Pull Request

### 贡献类型

欢迎以下类型的贡献：

- 🐛 **Bug 修复** - 修复现有问题
- ✨ **新功能** - 添加新特性
- 📝 **文档改进** - 完善 README、注释或文档
- 🔧 **配置优化** - 改进配置文件或构建流程
- 🧪 **测试增强** - 添加或改进测试用例
- 🎨 **代码重构** - 改善代码结构而不改变功能
- ⚡ **性能优化** - 提升代码执行效率

---

## 开发环境设置

### 系统要求

- Node.js >= 18.0.0
- npm >= 9.0.0 或 yarn >= 1.22.0
- Git

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/YOUR_USERNAME/clawd-gateway-wework.git
cd clawd-gateway-wework

# 安装依赖
npm install

# 构建项目
npm run build

# 运行测试
npm test

# 运行代码检查
npm run lint
```

### 开发模式

```bash
# 启动开发模式（监听文件变化）
npm run dev
```

---

## 代码规范

### TypeScript/JavaScript 规范

- 使用 ES6+ 语法
- 遵循 ESLint 配置
- 使用有意义的变量和函数名
- 添加必要的注释

### 代码格式化

```bash
# 格式化代码
npm run format

# 检查代码规范
npm run lint

# 自动修复代码问题
npm run lint:fix
```

### 文件命名

- 使用 kebab-case 命名文件：`my-component.js`
- 组件文件使用 PascalCase：`MyComponent.js`
- 工具函数使用 camelCase：`myHelper.js`

---

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

### 提交格式

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### 提交类型

| 类型 | 描述 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 代码重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具相关 |
| `ci` | CI 配置更改 |

### 示例

```bash
# 新功能
git commit -m "feat: add markdown message support"

# Bug 修复
git commit -m "fix: resolve token refresh issue"

# 文档更新
git commit -m "docs: update installation guide"

# 带作用域
git commit -m "feat(api): add rate limiter configuration"
```

---

## Pull Request 流程

### PR 检查清单

在提交 PR 之前，请确保：

- [ ] 代码通过所有测试 (`npm test`)
- [ ] 代码通过 Lint 检查 (`npm run lint`)
- [ ] 代码已格式化 (`npm run format`)
- [ ] 添加了必要的测试用例
- [ ] 更新了相关文档
- [ ] 遵循提交规范

### PR 标题规范

PR 标题应遵循与提交信息相同的格式：

```
feat: add new feature
fix: resolve bug in message handler
docs: update README
```

### 审核流程

1. 提交 PR 后，CI 会自动运行测试
2. 至少需要一位维护者审核
3. 所有 CI 检查必须通过
4. 解决所有审核意见后合并

---

## 问题报告

### 报告 Bug

如果发现 Bug，请 [创建 Issue](https://github.com/lohasle/clawd-gateway-wework/issues/new?template=bug_report.md) 并包含：

- 清晰的标题和描述
- 复现步骤
- 期望行为
- 实际行为
- 环境信息（Node.js 版本、操作系统等）
- 相关日志或截图

### 安全问题

如果您发现安全漏洞，请**不要**公开创建 Issue。请参阅 [SECURITY.md](SECURITY.md) 了解如何报告安全问题。

---

## 功能请求

欢迎提出新功能建议！请 [创建 Feature Request](https://github.com/lohasle/clawd-gateway-wework/issues/new?template=feature_request.md) 并包含：

- 功能描述
- 使用场景
- 预期收益
- 可能的实现方案（可选）

---

## 获取帮助

- 💬 [GitHub Discussions](https://github.com/lohasle/clawd-gateway-wework/discussions) - 一般讨论
- 🐛 [GitHub Issues](https://github.com/lohasle/clawd-gateway-wework/issues) - Bug 报告和功能请求
- 📧 Email: security@lohasle.com

---

## 许可证

通过贡献代码，您同意您的贡献将根据 [MIT License](LICENSE) 进行许可。

---

## 贡献者

感谢所有贡献者的付出！

<a href="https://github.com/lohasle/clawd-gateway-wework/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=lohasle/clawd-gateway-wework" />
</a>

---

*最后更新: 2026-02-25*
