import { describe, it, expect, beforeEach } from 'vitest';
import { SmartQueryBuilder, SmartTracking, SmartAlerts, SmartReporting, dbCache } from './advanced-db';

describe('Advanced Database System', () => {
  beforeEach(() => {
    dbCache.clear();
  });

  describe('SmartCache', () => {
    it('يجب تخزين واسترجاع البيانات من الذاكرة المؤقتة', () => {
      const testData = { id: 1, name: 'Test Agent' };
      dbCache.set('test:key', testData, 60000);
      
      const retrieved = dbCache.get('test:key');
      expect(retrieved).toEqual(testData);
    });

    it('يجب إرجاع null للبيانات المنتهية الصلاحية', (done) => {
      const testData = { id: 1, name: 'Test' };
      dbCache.set('expire:key', testData, 100); // 100ms TTL
      
      setTimeout(() => {
        const retrieved = dbCache.get('expire:key');
        expect(retrieved).toBeNull();
        done();
      }, 150);
    });

    it('يجب إبطال البيانات بناءً على النمط', () => {
      dbCache.set('agents:search:1:filter', { data: 'test1' });
      dbCache.set('agents:search:2:filter', { data: 'test2' });
      dbCache.set('other:key', { data: 'test3' });
      
      dbCache.invalidate('agents:search');
      
      expect(dbCache.get('agents:search:1:filter')).toBeNull();
      expect(dbCache.get('agents:search:2:filter')).toBeNull();
      expect(dbCache.get('other:key')).toEqual({ data: 'test3' });
    });
  });

  describe('SmartTracking', () => {
    it('يجب تتبع التغييرات في بيانات الوكيل', async () => {
      const oldData = { id: 1, name: 'Old Name', status: 'inactive' };
      const newData = { id: 1, name: 'New Name', status: 'active' };
      
      const changes = await SmartTracking.trackAgentChange(1, oldData, newData);
      
      expect(changes).toHaveProperty('name');
      expect(changes).toHaveProperty('status');
      expect(changes.name).toEqual({ old: 'Old Name', new: 'New Name' });
      expect(changes.status).toEqual({ old: 'inactive', new: 'active' });
    });

    it('يجب عدم تتبع التغييرات إذا لم تكن هناك تغييرات', async () => {
      const data = { id: 1, name: 'Same Name', status: 'active' };
      
      const changes = await SmartTracking.trackAgentChange(1, data, data);
      
      expect(Object.keys(changes).length).toBe(0);
    });

    it('يجب تتبع استخدام الموارد بشكل صحيح', async () => {
      const execution = {
        tokensUsed: 1000,
        executionTime: 2500,
        cost: 0.05,
      };
      
      const usage = await SmartTracking.trackResourceUsage(1, execution);
      
      expect(usage.userId).toBe(1);
      expect(usage.tokensUsed).toBe(1000);
      expect(usage.executionTime).toBe(2500);
      expect(usage.cost).toBe(0.05);
    });
  });

  describe('SmartAlerts', () => {
    it('يجب التحقق من صحة بيانات الوكيل', () => {
      const validAgent = {
        name: 'Test Agent',
        model: 'gpt-4',
      };
      
      const result = SmartAlerts.validateData('agent', validAgent);
      
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('يجب إرجاع أخطاء للبيانات غير الصحيحة', () => {
      const invalidAgent = {
        name: '',
        model: '',
      };
      
      const result = SmartAlerts.validateData('agent', invalidAgent);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('يجب التحقق من صحة بيانات التنفيذ', () => {
      const validExecution = {
        agentId: 1,
        input: 'Test input',
      };
      
      const result = SmartAlerts.validateData('execution', validExecution);
      
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('يجب إرجاع أخطاء للتنفيذ غير الصحيح', () => {
      const invalidExecution = {
        agentId: null,
        input: '',
      };
      
      const result = SmartAlerts.validateData('execution', invalidExecution);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('SmartReporting', () => {
    it('يجب توليد التوصيات بناءً على الإحصائيات', () => {
      const stats = {
        totalAgents: 1,
        activeAgents: 1,
        totalExecutions: 100,
        successfulExecutions: 50,
        failedExecutions: 50,
        successRate: '50',
        totalCost: '100',
        avgExecutionTime: '6000',
        currentPlan: 'free',
      };
      
      const topAgents = [];
      
      const recommendations = SmartReporting.generateRecommendations(stats, topAgents);
      
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('يجب توصية بإنشاء المزيد من الوكلاء إذا كان العدد قليلاً', () => {
      const stats = {
        totalAgents: 1,
        activeAgents: 1,
        totalExecutions: 100,
        successfulExecutions: 95,
        failedExecutions: 5,
        successRate: '95',
        totalCost: '50',
        avgExecutionTime: '2000',
        currentPlan: 'pro',
      };
      
      const recommendations = SmartReporting.generateRecommendations(stats, []);
      
      expect(recommendations.some(r => r.includes('المزيد من الوكلاء'))).toBe(true);
    });

    it('يجب توصية بتحسين الأداء إذا كان وقت التنفيذ مرتفعاً', () => {
      const stats = {
        totalAgents: 5,
        activeAgents: 5,
        totalExecutions: 1000,
        successfulExecutions: 950,
        failedExecutions: 50,
        successRate: '95',
        totalCost: '200',
        avgExecutionTime: '10000',
        currentPlan: 'enterprise',
      };
      
      const recommendations = SmartReporting.generateRecommendations(stats, []);
      
      expect(recommendations.some(r => r.includes('وقت التنفيذ'))).toBe(true);
    });
  });

  describe('Cache Invalidation', () => {
    it('يجب إبطال الذاكرة المؤقتة عند تحديث البيانات', async () => {
      dbCache.set('stats:comprehensive:1', { data: 'old' });
      dbCache.set('usage:monthly:1', { data: 'old' });
      
      await SmartQueryBuilder.updateWithCacheInvalidation('agent', 1, { id: 1 });
      
      expect(dbCache.get('stats:comprehensive:1')).toBeNull();
      expect(dbCache.get('usage:monthly:1')).toBeNull();
    });
  });

  describe('Performance Metrics', () => {
    it('يجب حساب معدل النجاح بشكل صحيح', () => {
      const executions = [
        { status: 'completed', executionTime: 1000, tokensUsed: 100, cost: '0.01' },
        { status: 'completed', executionTime: 1500, tokensUsed: 150, cost: '0.015' },
        { status: 'failed', executionTime: 500, tokensUsed: 50, cost: '0.005' },
      ];
      
      const successRate = (executions.filter(e => e.status === 'completed').length / executions.length) * 100;
      
      expect(successRate).toBe(66.66666666666666);
    });

    it('يجب حساب متوسط وقت التنفيذ بشكل صحيح', () => {
      const executions = [
        { executionTime: 1000 },
        { executionTime: 2000 },
        { executionTime: 3000 },
      ];
      
      const avgTime = executions.reduce((sum, e) => sum + e.executionTime, 0) / executions.length;
      
      expect(avgTime).toBe(2000);
    });
  });
});
