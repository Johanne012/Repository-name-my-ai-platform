import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, CreditCard, Download, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';

export default function Billing() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const { data: subscription } = trpc.subscriptions.getCurrent.useQuery();
  const createCheckout = trpc.stripe.createCheckoutSession.useMutation();

  const handleUpgrade = async (plan: 'pro' | 'enterprise') => {
    if (!user?.email) {
      toast.error('البريد الإلكتروني مفقود');
      return;
    }

    setLoading(true);
    try {
      const result = await createCheckout.mutateAsync({
        plan,
        interval: billingInterval,
        origin: window.location.origin,
      });

      if (result.url) {
        window.open(result.url, '_blank');
        toast.success('تم فتح صفحة الدفع');
      }
    } catch (error: any) {
      toast.error(`خطأ: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      name: 'مجاني',
      price: 0,
      features: ['5 وكلاء', '100 تنفيذ/شهر', 'دعم أساسي'],
      current: subscription?.plan === 'free',
      plan: null,
    },
    {
      name: 'احترافي',
      price: billingInterval === 'month' ? 99 : 1069,
      features: ['50 وكيل', '10,000 تنفيذ/شهر', 'دعم أولوي', 'API متقدمة'],
      current: subscription?.plan === 'pro',
      highlighted: true,
      plan: 'pro' as const,
    },
    {
      name: 'مؤسسي',
      price: billingInterval === 'month' ? 999 : 10789,
      features: ['وكلاء غير محدودة', 'تنفيذات غير محدودة', 'دعم 24/7', 'SLA مخصص'],
      current: subscription?.plan === 'enterprise',
      plan: 'enterprise' as const,
    },
  ];

  return (
    <DashboardLayout title="الفوترة والاشتراكات">
      <div className="space-y-8">
        {/* Billing Interval Toggle */}
        <Card>
          <CardHeader>
            <CardTitle>فترة الفوترة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button
                variant={billingInterval === 'month' ? 'default' : 'outline'}
                onClick={() => setBillingInterval('month')}
              >
                شهري
              </Button>
              <Button
                variant={billingInterval === 'year' ? 'default' : 'outline'}
                onClick={() => setBillingInterval('year')}
              >
                سنوي (توفير 15%)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle>الخطة الحالية</CardTitle>
            <CardDescription>معلومات اشتراكك</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-slate-600">الخطة</p>
                <p className="text-2xl font-bold capitalize">
                  {subscription?.plan || 'مجاني'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">الحالة</p>
                <p className="text-2xl font-bold capitalize">
                  {subscription?.status || 'نشط'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">تاريخ التجديد</p>
                <p className="text-2xl font-bold">
                  {subscription?.currentPeriodEnd
                    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('ar-SA')
                    : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plans */}
        <div>
          <h3 className="text-2xl font-bold mb-6">خطط الاشتراك</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className={`${
                  plan.highlighted ? 'border-2 border-blue-600 transform scale-105' : ''
                }`}
              >
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="text-3xl font-bold mt-2">
                    ${plan.price}
                    <span className="text-lg text-slate-600">/شهر</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check size={20} className="text-green-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.current ? 'default' : 'outline'}
                    disabled={plan.current || loading}
                    onClick={() => plan.plan && handleUpgrade(plan.plan)}
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {plan.current ? 'الخطة الحالية' : 'الترقية'}
                  </Button>
                  <div className="text-sm text-slate-600 text-center mt-2">
                    {billingInterval === 'month' ? 'شهري' : 'سنوي'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard size={24} />
              طرق الدفع
            </CardTitle>
            <CardDescription>إدارة طرق الدفع الخاصة بك</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">Visa •••• 4242</p>
                  <p className="text-sm text-slate-600">ينتهي في 12/2026</p>
                </div>
                <Button variant="outline" size="sm">
                  تعديل
                </Button>
              </div>
              <Button variant="outline" className="w-full">
                إضافة طريقة دفع جديدة
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download size={24} />
              الفواتير
            </CardTitle>
            <CardDescription>سجل الفواتير والإيصالات</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { date: '2026-02-01', amount: '$99', status: 'مدفوعة' },
                { date: '2026-01-01', amount: '$99', status: 'مدفوعة' },
                { date: '2025-12-01', amount: '$99', status: 'مدفوعة' },
              ].map((invoice, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b pb-3"
                >
                  <div>
                    <p className="font-medium">{invoice.date}</p>
                    <p className="text-sm text-slate-600">{invoice.amount}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      {invoice.status}
                    </span>
                    <Button variant="ghost" size="sm">
                      <Download size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
