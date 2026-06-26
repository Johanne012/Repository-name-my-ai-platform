import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Info, Trash2, Eye, EyeOff } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface Notification {
  id: number;
  type: 'execution_completed' | 'execution_failed' | 'workflow_completed' | 'subscription_updated' | 'alert';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  data?: Record<string, any>;
}

const typeIcons: Record<string, React.ReactNode> = {
  execution_completed: <CheckCircle className="w-5 h-5 text-green-600" />,
  execution_failed: <AlertCircle className="w-5 h-5 text-red-600" />,
  workflow_completed: <CheckCircle className="w-5 h-5 text-blue-600" />,
  subscription_updated: <Info className="w-5 h-5 text-purple-600" />,
  alert: <AlertCircle className="w-5 h-5 text-orange-600" />,
};

const typeColors: Record<string, string> = {
  execution_completed: 'bg-green-50 border-green-200',
  execution_failed: 'bg-red-50 border-red-200',
  workflow_completed: 'bg-blue-50 border-blue-200',
  subscription_updated: 'bg-purple-50 border-purple-200',
  alert: 'bg-orange-50 border-orange-200',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data: notificationsData, isLoading, refetch } = trpc.notifications.list.useQuery();
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation();
  const deleteMutation = trpc.notifications.delete.useMutation();

  useEffect(() => {
    if (notificationsData) {
      setNotifications(notificationsData as Notification[]);
    }
  }, [notificationsData]);

  const handleMarkAsRead = async (id: number, read: boolean) => {
    if (!read) {
      try {
        await markAsReadMutation.mutateAsync({ id });
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
        toast.success('تم تحديد الإشعار كمقروء');
      } catch (error) {
        toast.error('فشل تحديث الإشعار');
      }
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('تم حذف الإشعار');
    } catch (error) {
      toast.error('فشل حذف الإشعار');
    }
  };

  const filteredNotifications = notifications.filter(n =>
    filter === 'unread' ? !n.read : true
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <DashboardLayout title="الإشعارات">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">الإشعارات</h2>
            <p className="text-slate-600">
              لديك {unreadCount} إشعار غير مقروء
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              الكل ({notifications.length})
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              onClick={() => setFilter('unread')}
            >
              غير مقروء ({unreadCount})
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-slate-600">لا توجد إشعارات</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`border-l-4 ${typeColors[notification.type]} ${
                  !notification.read ? 'border-l-blue-500' : 'border-l-slate-200'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {typeIcons[notification.type]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{notification.title}</h3>
                          {!notification.read && (
                            <Badge className="text-xs bg-blue-100 text-blue-800">
                              جديد
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(notification.createdAt).toLocaleString('ar-SA')}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {!notification.read && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleMarkAsRead(notification.id, notification.read)}
                          title="تحديد كمقروء"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(notification.id)}
                        title="حذف"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
