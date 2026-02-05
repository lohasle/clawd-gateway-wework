// Dynamic Agent Manager for WeChat Work Bot
// 为每个用户/群创建独立的 Agent 实例，提供隔离性和可扩展性

class DynamicAgentManager {
  constructor(config = {}) {
    this.agents = new Map(); // agentId -> {workspace, context, metadata}
    this.config = {
      maxIdleTime: config.maxIdleTime || 30 * 60 * 1000, // 30分钟
      maxAgents: config.maxAgents || 100,
      ...config
    };
    this.cleanupInterval = setInterval(() => this.cleanupIdleAgents(), 5 * 60 * 1000); // 每5分钟清理
  }

  // 生成确定性 agentId
  generateAgentId(userId, isGroup = false) {
    return isGroup ? `wecom-group-${userId}` : `wecom-dm-${userId}`;
  }

  // 获取或创建 agent
  getAgent(userId, isGroup = false) {
    const agentId = this.generateAgentId(userId, isGroup);

    if (this.agents.has(agentId)) {
      const agent = this.agents.get(agentId);
      agent.lastAccess = Date.now();
      return agent;
    }

    // 创建新 agent
    const agent = {
      agentId,
      userId,
      isGroup,
      workspace: `/.openclaw/workspaces/${agentId}`,
      context: [],
      metadata: {
        createdAt: Date.now(),
        lastAccess: Date.now(),
        messageCount: 0
      }
    };

    this.agents.set(agentId, agent);
    this.enforceMaxAgents();
    return agent;
  }

  // 更新 agent 上下文
  updateContext(agentId, message) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.context.push({
      role: 'user',
      content: message,
      timestamp: Date.now()
    });

    // 限制上下文长度
    if (agent.context.length > 50) {
      agent.context = agent.context.slice(-50);
    }

    agent.metadata.lastAccess = Date.now();
    agent.metadata.messageCount++;
  }

  // 清理空闲 agent
  cleanupIdleAgents() {
    const now = Date.now();
    const idleThreshold = this.config.maxIdleTime;

    for (const [agentId, agent] of this.agents.entries()) {
      if (now - agent.metadata.lastAccess > idleThreshold) {
        this.agents.delete(agentId);
        console.log(`[DynamicAgentManager] Cleaned up idle agent: ${agentId}`);
      }
    }
  }

  // 强制执行最大 agent 限制（LRU）
  enforceMaxAgents() {
    if (this.agents.size <= this.config.maxAgents) return;

    // 按最后访问时间排序，删除最旧的
    const sorted = Array.from(this.agents.entries())
      .sort((a, b) => a[1].metadata.lastAccess - b[1].metadata.lastAccess);

    const toRemove = sorted.slice(0, this.agents.size - this.config.maxAgents);
    toRemove.forEach(([agentId]) => {
      this.agents.delete(agentId);
      console.log(`[DynamicAgentManager] Evicted agent (LRU): ${agentId}`);
    });
  }

  // 获取统计信息
  getStats() {
    return {
      totalAgents: this.agents.size,
      activeAgents: Array.from(this.agents.values())
        .filter(a => Date.now() - a.metadata.lastAccess < 5 * 60 * 1000).length,
      totalMessages: Array.from(this.agents.values())
        .reduce((sum, a) => sum + a.metadata.messageCount, 0)
    };
  }

  // 关闭管理器
  shutdown() {
    clearInterval(this.cleanupInterval);
    this.agents.clear();
  }
}

module.exports = DynamicAgentManager;
