import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, TrendingUp, Clock, DollarSign } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function Analytics() {
  const { data: subscription } = trpc.subscriptions.getCurrent.useQuery();

  const executionData = [
    { date: '1 يونيو', executions: 120, successful: 118 },
    { date: '5 يونيو', executions: 240, successful: 235 },
    { date: '10 يونيو', executions: 180, successful: 175 },
    { date: '15 يونيو', executions: 320, successful: 310 },
    { date: '20 يونيو', executions: 280, successful: 270 },
    { date: '25 يونيو', executions: 350, successful: 340 },
  ];

  const costData = [
    { name: 'API Calls', value: 40, color: '#3b82f6' },
    { name: 'Storage', value: 30, color: '#10b981' },
    { name: 'Compute', value: 20, color: '#f59e0b' },
    { name: 'Other', value: 10, color: '#ef4444' },
  ];

  const stats = [
    {
      icon: Activity,
      label: 'إجمالي التنفيذات',
      value: 248,
      change: '+12.5%',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: TrendingUp,
      label: 'معدل النجاح',
      value: '94.5%',
      change: '+2.3%',
      color: 'bg-green-100 text-green-600',
    },
    {
      icon: Clock,
      label: 'متوسط الوقت',
      value: '2,450ms',
      change: '-5.2%',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      icon: DollarSign,
      label: 'التكلفة الشهرية',
      value: '$45.32',
      change: '+8.1%',
      color: 'bg-orange-100 text-orange-600',
    },
  ];

  return (
    <DashboardLayout title="التحليلات والإحصائيات">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-green-600 mt-1">{stat.change}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Execution Trend */}
          <Card>
            <CardHeader>
              <CardTitle>اتجاه التنفيذات</CardTitle>
              <CardDescription>عدد التنفيذات الناجحة والفاشلة</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={executionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="executions" stroke="#3b82f6" name="إجمالي" />
                  <Line type="monotone" dataKey="successful" stroke="#10b981" name="ناجح" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cost Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>توزيع التكاليف</CardTitle>
              <CardDescription>تفصيل التكاليف حسب الخدمة</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={costData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {costData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Usage Details */}
        <Card>
          <CardHeader>
            <CardTitle>تفاصيل الاستخدام</CardTitle>
            <CardDescription>إحصائيات الاستخدام الشهري</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">إجمالي الرموز المستخدمة</p>
                <p className="text-2xl font-bold">1,250,000</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">عدد استدعاءات API</p>
                <p className="text-2xl font-bold">3,450</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">الخطة الحالية</p>
                <p className="text-2xl font-bold capitalize">{subscription?.plan || 'free'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
