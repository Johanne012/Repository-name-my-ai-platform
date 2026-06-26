import { getDb } from './db';
import { eq, and, or, like, gt, lt, gte, lte, desc, asc, inArray, sql } from 'drizzle-orm';
import { agents, agentExecutions, workflows, subscriptions, usageTracking } from '../drizzle/schema';

/**
 * نظام التخزين المؤقت الذكي (Smart Caching System)
 */
class SmartCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 دقائق

  set(key: string, data: any, ttl: number = this.DEFAULT_TTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(pattern: string) {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  clear() {
    this.cache.clear();
  }
}

export const dbCache = new SmartCache();

/**
 * نظام الاستعلامات الذكية (Smart Query System)
 */
export class SmartQueryBuilder {
  /**
   * بحث متقدم عن الوكلاء مع فلاتر متعددة
   */
  static async searchAgents(
    userId: number,
    filters: {
      name?: string;
      status?: string;
      model?: string;
      limit?: number;
      offset?: number;
      sortBy?: 'name' | 'created' | 'updated';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ) {
    const cacheKey = `agents:search:${userId}:${JSON.stringify(filters)}`;
    const cached = dbCache.get(cacheKey);
    if (cached) return cached;

    const db = await getDb();
    if (!db) return [];

    const conditions: any[] = [eq(agents.userId, userId)];

    // تطبيق الفلاتر
    if (filters.name) {
      conditions.push(like(agents.name, `%${filters.name}%`));
    }

    if (filters.status) {
      conditions.push(eq(agents.status, filters.status as any));
    }

    if (filters.model) {
      conditions.push(eq(agents.model, filters.model));
    }

    // الترتيب
    const sortField = filters.sortBy === 'created' ? agents.createdAt : 
                     filters.sortBy === 'updated' ? agents.updatedAt : agents.name;
    const sortDirection = filters.sortOrder === 'desc' ? desc : asc;

    // بناء الاستعلام
    let baseQuery = db
      .select()
      .from(agents)
      .where(and(...conditions))
      .orderBy(sortDirection(sortField));

    const result = filters.limit
      ? await baseQuery.limit(filters.limit).offset(filters.offset || 0)
      : await baseQuery;

    dbCache.set(cacheKey, result, 10 * 60 * 1000); // 10 دقائق
    return result;
  }

  /**
   * تحليل الأداء (Performance Analytics)
   */
  static async getAgentPerformance(agentId: number, days: number = 30) {
    const cacheKey = `performance:${agentId}:${days}`;
    const cached = dbCache.get(cacheKey);
    if (cached) return cached;

    const db = await getDb();
    if (!db) return null;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const executions = await db
      .select()
      .from(agentExecutions)
      .where(
        and(
          eq(agentExecutions.agentId, agentId),
          gte(agentExecutions.createdAt, startDate)
        )
      );

    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(e => e.status === 'completed').length;
    const failedExecutions = executions.filter(e => e.status === 'failed').length;
    const avgExecutionTime = executions.reduce((sum, e) => sum + (e.executionTime || 0), 0) / totalExecutions || 0;
    const totalCost = executions.reduce((sum, e) => sum + (parseFloat(e.cost?.toString() || '0')), 0);
    const avgTokensPerExecution = executions.reduce((sum, e) => sum + (e.tokensUsed || 0), 0) / totalExecutions || 0;

    const performance = {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions * 100).toFixed(2) : 0,
      avgExecutionTime: avgExecutionTime.toFixed(0),
      totalCost: totalCost.toFixed(6),
      avgTokensPerExecution: avgTokensPerExecution.toFixed(0),
      trend: successfulExecutions > failedExecutions ? 'up' : 'down',
    };

    dbCache.set(cacheKey, performance, 30 * 60 * 1000); // 30 دقائق
    return performance;
  }

  /**
   * تحليل الاستخدام الشهري (Monthly Usage Analytics)
   */
  static async getMonthlyUsageAnalytics(userId: number) {
    const cacheKey = `usage:monthly:${userId}`;
    const cached = dbCache.get(cacheKey);
    if (cached) return cached;

    const db = await getDb();
    if (!db) return null;

    const usage = await db
      .select()
      .from(usageTracking)
      .where(eq(usageTracking.userId, userId));

    const currentMonth = usage.find(u => {
      const period = u.period;
      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return period === currentPeriod;
    });

    const analytics = {
      currentMonth: currentMonth || {
        agentExecutions: 0,
        tokensUsed: 0,
        apiCallsCount: 0,
        costAccumulated: '0',
      },
      totalUsage: {
        agentExecutions: usage.reduce((sum, u) => sum + (u.agentExecutions || 0), 0),
        tokensUsed: usage.reduce((sum, u) => sum + (u.tokensUsed || 0), 0),
        apiCallsCount: usage.reduce((sum, u) => sum + (u.apiCallsCount || 0), 0),
        costAccumulated: usage.reduce((sum, u) => sum + parseFloat(u.costAccumulated?.toString() || '0'), 0).toFixed(6),
      },
    };

    dbCache.set(cacheKey, analytics, 60 * 60 * 1000); // ساعة واحدة
    return analytics;
  }

  /**
   * البحث المتقدم عن التنفيذات (Advanced Execution Search)
   */
  static async searchExecutions(
    userId: number,
    filters: {
      agentId?: number;
      status?: string;
      dateFrom?: Date;
      dateTo?: Date;
      minCost?: number;
      maxCost?: number;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const db = await getDb();
    if (!db) return [];

    const conditions: any[] = [eq(agentExecutions.userId, userId)];

    if (filters.agentId) {
      conditions.push(eq(agentExecutions.agentId, filters.agentId));
    }

    if (filters.status) {
      conditions.push(eq(agentExecutions.status, filters.status as any));
    }

    if (filters.dateFrom) {
      conditions.push(gte(agentExecutions.createdAt, filters.dateFrom));
    }

    if (filters.dateTo) {
      conditions.push(lte(agentExecutions.createdAt, filters.dateTo));
    }

    let baseQuery = db
      .select()
      .from(agentExecutions)
      .where(and(...conditions))
      .orderBy(desc(agentExecutions.createdAt));

    const result = filters.limit 
      ? await baseQuery.limit(filters.limit).offset(filters.offset || 0)
      : await baseQuery;

    return result;
  }

  /**
   * الحصول على أفضل الوكلاء (Top Performing Agents)
   */
  static async getTopAgents(userId: number, limit: number = 5) {
    const cacheKey = `top-agents:${userId}:${limit}`;
    const cached = dbCache.get(cacheKey);
    if (cached) return cached;

    const db = await getDb();
    if (!db) return [];

    const userAgents = await db
      .select()
      .from(agents)
      .where(eq(agents.userId, userId));

    const agentPerformance = await Promise.all(
      userAgents.map(async (agent) => ({
        agent,
        performance: await this.getAgentPerformance(agent.id),
      }))
    );

    const topAgents = agentPerformance
      .sort((a, b) => {
        const aRate = parseFloat(a.performance?.successRate?.toString() || '0');
        const bRate = parseFloat(b.performance?.successRate?.toString() || '0');
        return bRate - aRate;
      })
      .slice(0, limit)
      .map(({ agent, performance }) => ({ agent, performance }));

    dbCache.set(cacheKey, topAgents, 60 * 60 * 1000); // ساعة واحدة
    return topAgents;
  }

  /**
   * الحصول على الإحصائيات الشاملة (Comprehensive Statistics)
   */
  static async getComprehensiveStats(userId: number) {
    const cacheKey = `stats:comprehensive:${userId}`;
    const cached = dbCache.get(cacheKey);
    if (cached) return cached;

    const db = await getDb();
    if (!db) return null;

    const [agents_data, executions, subscription] = await Promise.all([
      db.select().from(agents).where(eq(agents.userId, userId)),
      db.select().from(agentExecutions).where(eq(agentExecutions.userId, userId)),
      db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1),
    ]);

    const stats = {
      totalAgents: agents_data.length,
      activeAgents: agents_data.filter(a => a.status === 'active').length,
      totalExecutions: executions.length,
      successfulExecutions: executions.filter(e => e.status === 'completed').length,
      failedExecutions: executions.filter(e => e.status === 'failed').length,
      successRate: executions.length > 0 
        ? ((executions.filter(e => e.status === 'completed').length / executions.length) * 100).toFixed(2)
        : 0,
      totalCost: executions.reduce((sum, e) => sum + parseFloat(e.cost?.toString() || '0'), 0).toFixed(6),
      avgExecutionTime: executions.length > 0
        ? (executions.reduce((sum, e) => sum + (e.executionTime || 0), 0) / executions.length).toFixed(0)
        : 0,
      currentPlan: subscription?.[0]?.plan || 'free',
    };

    dbCache.set(cacheKey, stats, 60 * 60 * 1000); // ساعة واحدة
    return stats;
  }

  /**
   * تحديث البيانات مع إبطال الذاكرة المؤقتة (Update with Cache Invalidation)
   */
  static async updateWithCacheInvalidation(
    entity: 'agent' | 'execution' | 'workflow',
    userId: number,
    data: any
  ) {
    // إبطال الذاكرة المؤقتة ذات الصلة
    dbCache.invalidate(`${entity}s:search:${userId}`);
    dbCache.invalidate(`stats:comprehensive:${userId}`);
    dbCache.invalidate(`usage:monthly:${userId}`);
    dbCache.invalidate(`top-agents:${userId}`);
    dbCache.invalidate(`performance:${data.id}`);

    return data;
  }
}

/**
 * نظام التتبع الذكي (Smart Tracking System)
 */
export class SmartTracking {
  /**
   * تتبع تغييرات الوكيل
   */
  static async trackAgentChange(agentId: number, oldData: any, newData: any) {
    const changes: Record<string, { old: any; new: any }> = {};

    for (const key in newData) {
      if (oldData[key] !== newData[key]) {
        changes[key] = { old: oldData[key], new: newData[key] };
      }
    }

    if (Object.keys(changes).length > 0) {
      console.log(`[Agent ${agentId}] Changes detected:`, changes);
      // يمكن إضافة تخزين التغييرات في جدول التدقيق (Audit Log)
    }

    return changes;
  }

  /**
   * تتبع استخدام الموارد
   */
  static async trackResourceUsage(userId: number, execution: any) {
    const usage = {
      userId,
      tokensUsed: execution.tokensUsed || 0,
      executionTime: execution.executionTime || 0,
      cost: execution.cost || 0,
      timestamp: new Date(),
    };

    console.log(`[Resource Usage] User ${userId}:`, usage);
    return usage;
  }
}

/**
 * نظام التنبيهات الذكية (Smart Alerts System)
 */
export class SmartAlerts {
  /**
   * التحقق من تجاوز الحدود
   */
  static async checkLimits(userId: number, subscription: any) {
    const usage = await SmartQueryBuilder.getMonthlyUsageAnalytics(userId);
    const alerts = [];

    // حدود الخطة المجانية
    if (subscription.plan === 'free') {
      if (usage?.currentMonth.agentExecutions > 100) {
        alerts.push({
          type: 'execution_limit',
          message: 'لقد تجاوزت حد التنفيذات الشهري (100)',
          severity: 'high',
        });
      }
    }

    // حدود الخطة الاحترافية
    if (subscription.plan === 'pro') {
      if (usage?.currentMonth.agentExecutions > 10000) {
        alerts.push({
          type: 'execution_limit',
          message: 'لقد تجاوزت حد التنفيذات الشهري (10,000)',
          severity: 'high',
        });
      }
    }

    return alerts;
  }

  /**
   * التحقق من صحة البيانات
   */
  static validateData(entity: 'agent' | 'execution', data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (entity === 'agent') {
      if (!data.name || data.name.length < 1) errors.push('اسم الوكيل مطلوب');
      if (!data.model) errors.push('نموذج الذكاء الاصطناعي مطلوب');
    }

    if (entity === 'execution') {
      if (!data.agentId) errors.push('معرف الوكيل مطلوب');
      if (!data.input) errors.push('المدخل مطلوب');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * نظام التقارير الذكية (Smart Reporting System)
 */
export class SmartReporting {
  /**
   * إنشاء تقرير الأداء الشهري
   */
  static async generateMonthlyReport(userId: number) {
    const stats = await SmartQueryBuilder.getComprehensiveStats(userId);
    const topAgents = await SmartQueryBuilder.getTopAgents(userId, 5);
    const usage = await SmartQueryBuilder.getMonthlyUsageAnalytics(userId);

    return {
      generatedAt: new Date(),
      userId,
      summary: stats,
      topPerformers: topAgents,
      usage: usage?.currentMonth,
      recommendations: this.generateRecommendations(stats, topAgents),
    };
  }

  /**
   * توليد التوصيات الذكية
   */
  static generateRecommendations(stats: any, topAgents: any): string[] {
    const recommendations = [];

    if (stats.failedExecutions > stats.successfulExecutions * 0.1) {
      recommendations.push('معدل الفشل مرتفع. يرجى مراجعة إعدادات الوكلاء.');
    }

    if (stats.totalAgents < 3) {
      recommendations.push('يمكنك إنشاء المزيد من الوكلاء لتحسين الإنتاجية.');
    }

    if (parseFloat(stats.avgExecutionTime) > 5000) {
      recommendations.push('وقت التنفيذ مرتفع. حاول تحسين الأداء.');
    }

    return recommendations;
  }
}
