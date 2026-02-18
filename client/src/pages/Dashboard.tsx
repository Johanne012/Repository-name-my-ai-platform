import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Zap, TrendingUp, Users } from 'lucide-react';
import { useLocation } from 'wouter';

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const stats = [
    {
      title: 'إجمالي الوكلاء',
      value: '12',
      icon: Zap,
      color: 'bg-blue-500',
    },
    {
      title: 'التنفيذات اليوم',
      value: '248',
      icon: BarChart3,
      color: 'bg-green-500',
    },
    {
      title: 'معدل النجاح',
      value: '98.5%',
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
    {
      title: 'المستخدمون النشطون',
      value: '5',
      icon: Users,
      color: 'bg-orange-500',
    },
  ];

  return (
    <DashboardLayout title="لوحة التحكم">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <div className={`${stat.color} p-2 rounded-lg text-white`}>
                    <Icon size={20} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-slate-500 mt-1">آخر 24 ساعة</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>النشاط الأخير</CardTitle>
              <CardDescription>آخر التنفيذات والأنشطة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">تنفيذ الوكيل #{item}</p>
                      <p className="text-xs text-slate-500">منذ {item * 5} دقائق</p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      نجح
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>الإجراءات السريعة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => setLocation('/agents')}
                className="w-full"
                variant="default"
              >
                إنشاء وكيل جديد
              </Button>
              <Button
                onClick={() => setLocation('/api-keys')}
                className="w-full"
                variant="outline"
              >
                إدارة مفاتيح API
              </Button>
              <Button
                onClick={() => setLocation('/billing')}
                className="w-full"
                variant="outline"
              >
                عرض الفوترة
              </Button>
              <Button
                onClick={() => setLocation('/settings')}
                className="w-full"
                variant="outline"
              >
                الإعدادات
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
