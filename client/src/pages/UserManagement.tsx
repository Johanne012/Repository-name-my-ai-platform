import { useAuth } from '@/_core/hooks/useAuth';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { Mail, Shield, Trash2, Edit2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function UserManagement() {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<number | null>(null);

  const { data: users, isLoading, refetch } = trpc.users.list.useQuery(undefined, {
    enabled: user?.role === 'admin',
  });

  const deleteUserMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success('تم حذف المستخدم بنجاح');
      refetch();
    },
    onError: () => {
      toast.error('فشل حذف المستخدم');
    },
  });

  const promoteUserMutation = trpc.users.promote.useMutation({
    onSuccess: () => {
      toast.success('تم ترقية المستخدم بنجاح');
      refetch();
    },
    onError: () => {
      toast.error('فشل ترقية المستخدم');
    },
  });

  if (!user || user.role !== 'admin') {
    return (
      <DashboardLayout title="إدارة المستخدمين">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">ليس لديك صلاحيات كافية للوصول إلى هذه الصفحة</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="إدارة المستخدمين">
      <div className="space-y-6">
        {/* إحصائيات */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">المسؤولون</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {users?.filter((u) => u.role === 'admin').length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">المستخدمون العاديون</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-600">
                {users?.filter((u) => u.role === 'user').length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* قائمة المستخدمين */}
        <Card>
          <CardHeader>
            <CardTitle>المستخدمون</CardTitle>
            <CardDescription>إدارة المستخدمين والصلاحيات</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">جاري التحميل...</div>
            ) : users && users.length > 0 ? (
              <div className="space-y-3">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{u.name || 'مستخدم بدون اسم'}</h3>
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                          {u.role === 'admin' ? 'مسؤول' : 'مستخدم'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="w-4 h-4" />
                        {u.email || 'بدون بريد'}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        آخر دخول: {new Date(u.lastSignedIn).toLocaleString('ar-SA')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {u.role !== 'admin' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => promoteUserMutation.mutate({ userId: u.id })}
                          disabled={promoteUserMutation.isPending}
                        >
                          <Shield className="w-4 h-4 mr-1" />
                          ترقية
                        </Button>
                      )}
                      {u.id !== user.id && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
                              deleteUserMutation.mutate({ userId: u.id });
                            }
                          }}
                          disabled={deleteUserMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">لا توجد مستخدمون</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
