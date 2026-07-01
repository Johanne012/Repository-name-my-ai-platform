import { useAuth } from '@/_core/hooks/useAuth';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { Clock, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { useState } from 'react';

export default function ExecutionHistory() {
  const { user } = useAuth();
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);

  const { data: executions, isLoading } = trpc.executions.list.useQuery(
    { agentId: selectedAgent || undefined },
    { enabled: !!user }
  );

  const { data: agents } = trpc.agents.list.useQuery(undefined, { enabled: !!user });

  if (!user) return null;

  return (
    <DashboardLayout title="سجل التنفيذات">
      <div className="space-y-6">
        {/* الفلاتر */}
        <Card>
          <CardHeader>
            <CardTitle>تصفية التنفيذات</CardTitle>
            <CardDescription>اختر وكيل لعرض تنفيذاته</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedAgent === null ? 'default' : 'outline'}
                onClick={() => setSelectedAgent(null)}
              >
                الكل
              </Button>
              {agents?.map((agent) => (
                <Button
                  key={agent.id}
                  variant={selectedAgent === agent.id ? 'default' : 'outline'}
                  onClick={() => setSelectedAgent(agent.id)}
                >
                  {agent.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* قائمة التنفيذات */}
        <Card>
          <CardHeader>
            <CardTitle>التنفيذات الأخيرة</CardTitle>
            <CardDescription>سجل جميع تنفيذات الوكلاء</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">جاري التحميل...</div>
            ) : executions && executions.length > 0 ? (
              <div className="space-y-4">
                {executions.map((execution) => (
                  <div
                    key={execution.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">تنفيذ #{execution.id}</h3>
                        <Badge
                          variant={
                            execution.status === 'completed'
                              ? 'default'
                              : execution.status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {execution.status === 'completed'
                            ? 'مكتمل'
                            : execution.status === 'failed'
                              ? 'فشل'
                              : 'قيد التنفيذ'}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">
                        الإدخال: {execution.input?.substring(0, 100)}...
                      </p>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(execution.createdAt).toLocaleString('ar-SA')}
                        </div>
                        {execution.executionTime && (
                          <div className="flex items-center gap-1">
                            <Zap className="w-4 h-4" />
                            {execution.executionTime}ms
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {execution.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : execution.status === 'failed' ? (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">لا توجد تنفيذات</div>
            )}
          </CardContent>
        </Card>

        {/* إحصائيات */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">إجمالي التنفيذات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{executions?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">التنفيذات الناجحة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {executions?.filter((e) => e.status === 'completed').length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">التنفيذات الفاشلة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {executions?.filter((e) => e.status === 'failed').length || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
