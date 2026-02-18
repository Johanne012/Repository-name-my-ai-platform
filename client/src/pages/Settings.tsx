import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/_core/hooks/useAuth';
import { toast } from 'sonner';

export default function Settings() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: '',
  });

  const handleSave = () => {
    toast.success('تم حفظ الإعدادات بنجاح');
  };

  return (
    <DashboardLayout title="الإعدادات">
      <div className="space-y-6 max-w-2xl">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle>إعدادات الملف الشخصي</CardTitle>
            <CardDescription>تحديث معلومات حسابك</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">الاسم</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="bio">النبذة الشخصية</Label>
              <Textarea
                id="bio"
                placeholder="اكتب نبذة عن نفسك"
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
              />
            </div>
            <Button onClick={handleSave}>حفظ التغييرات</Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>الإشعارات</CardTitle>
            <CardDescription>إدارة تفضيلات الإشعارات</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'إشعارات البريد الإلكتروني', checked: true },
              { label: 'إشعارات الوكيل', checked: true },
              { label: 'تقارير الأداء', checked: false },
              { label: 'التحديثات الأسبوعية', checked: true },
            ].map((notification, index) => (
              <div key={index} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`notif-${index}`}
                  defaultChecked={notification.checked}
                  className="w-4 h-4"
                />
                <Label htmlFor={`notif-${index}`} className="cursor-pointer">
                  {notification.label}
                </Label>
              </div>
            ))}
            <Button>حفظ الإشعارات</Button>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle>الأمان</CardTitle>
            <CardDescription>إدارة أمان حسابك</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">تغيير كلمة المرور</h4>
              <Button variant="outline">تغيير كلمة المرور</Button>
            </div>
            <div>
              <h4 className="font-semibold mb-2">المصادقة الثنائية</h4>
              <p className="text-sm text-slate-600 mb-2">
                أضف طبقة أمان إضافية لحسابك
              </p>
              <Button variant="outline">تفعيل المصادقة الثنائية</Button>
            </div>
            <div>
              <h4 className="font-semibold mb-2">الجلسات النشطة</h4>
              <p className="text-sm text-slate-600 mb-2">
                إدارة الأجهزة المتصلة بحسابك
              </p>
              <Button variant="outline">عرض الجلسات</Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">منطقة الخطر</CardTitle>
            <CardDescription>إجراءات لا يمكن التراجع عنها</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">حذف الحساب</h4>
              <p className="text-sm text-slate-600 mb-3">
                حذف حسابك وجميع البيانات المرتبطة به بشكل دائم
              </p>
              <Button variant="destructive">حذف الحساب</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
