// Unit tests for DynamicAgentManager

import { describe, it, expect, beforeEach, afterEach } from 'jest';
import DynamicAgentManager from '../src/dynamic-agent-manager.js';

describe('DynamicAgentManager', () => {
  let manager;

  beforeEach(() => {
    manager = new DynamicAgentManager({ maxIdleTime: 1000 });
  });

  afterEach(() => {
    manager.shutdown();
  });

  describe('generateAgentId', () => {
    it('should generate correct agentId for direct messages', () => {
      const agentId = manager.generateAgentId('user123', false);
      expect(agentId).toBe('wecom-dm-user123');
    });

    it('should generate correct agentId for groups', () => {
      const agentId = manager.generateAgentId('group456', true);
      expect(agentId).toBe('wecom-group-group456');
    });

    it('should be deterministic', () => {
      const id1 = manager.generateAgentId('user123', false);
      const id2 = manager.generateAgentId('user123', false);
      expect(id1).toBe(id2);
    });
  });

  describe('getAgent', () => {
    it('should create new agent for first request', () => {
      const agent = manager.getAgent('user123', false);
      expect(agent).toBeDefined();
      expect(agent.userId).toBe('user123');
      expect(agent.agentId).toBe('wecom-dm-user123');
      expect(agent.metadata.messageCount).toBe(0);
    });

    it('should reuse existing agent', () => {
      const agent1 = manager.getAgent('user123', false);
      const agent2 = manager.getAgent('user123', false);
      expect(agent1).toBe(agent2);
    });

    it('should create separate agents for different users', () => {
      const agent1 = manager.getAgent('user123', false);
      const agent2 = manager.getAgent('user456', false);
      expect(agent1).not.toBe(agent2);
      expect(agent1.agentId).not.toBe(agent2.agentId);
    });
  });

  describe('updateContext', () => {
    it('should add message to context', () => {
      const agent = manager.getAgent('user123', false);
      manager.updateContext(agent.agentId, 'Hello');

      expect(agent.context).toHaveLength(1);
      expect(agent.context[0].content).toBe('Hello');
      expect(agent.metadata.messageCount).toBe(1);
    });

    it('should limit context length to 50 messages', () => {
      const agent = manager.getAgent('user123', false);

      // Add 60 messages
      for (let i = 0; i < 60; i++) {
        manager.updateContext(agent.agentId, `Message ${i}`);
      }

      expect(agent.context).toHaveLength(50);
      expect(agent.context[0].content).toBe('Message 10'); // First 10 dropped
    });

    it('should update lastAccess timestamp', () => {
      const agent = manager.getAgent('user123', false);
      const initialTime = agent.metadata.lastAccess;

      setTimeout(() => {
        manager.updateContext(agent.agentId, 'Hello');
        expect(agent.metadata.lastAccess).toBeGreaterThan(initialTime);
      }, 100);
    });
  });

  describe('cleanupIdleAgents', () => {
    it('should remove agents idle longer than threshold', async () => {
      manager.getAgent('user123', false);

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1100));

      const stats = manager.getStats();
      expect(stats.totalAgents).toBe(0);
    });

    it('should keep recently accessed agents', async () => {
      const agent = manager.getAgent('user123', false);

      // Update before cleanup
      setTimeout(() => {
        manager.updateContext(agent.agentId, 'Hello');
      }, 500);

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1100));

      const stats = manager.getStats();
      expect(stats.totalAgents).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return correct stats', () => {
      manager.getAgent('user123', false);
      manager.updateContext('wecom-dm-user123', 'Hello');
      manager.updateContext('wecom-dm-user123', 'World');

      const stats = manager.getStats();

      expect(stats.totalAgents).toBe(1);
      expect(stats.totalMessages).toBe(2);
      expect(stats.activeAgents).toBe(1);
    });
  });

  describe('enforceMaxAgents', () => {
    beforeEach(() => {
      manager = new DynamicAgentManager({ maxIdleTime: 10000, maxAgents: 3 });
    });

    it('should evict least recently used agents', () => {
      // Create 5 agents
      for (let i = 1; i <= 5; i++) {
        manager.getAgent(`user${i}`, false);
      }

      const stats = manager.getStats();
      expect(stats.totalAgents).toBe(3); // Should be limited to 3
    });
  });
});
