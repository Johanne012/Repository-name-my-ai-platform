import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Copy, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

interface ApiKey {
  id: number;
  name: string;
  key: string;
  createdAt: Date;
  lastUsed: Date | null;
  isActive: boolean;
}

export default function ApiKeys() {
  const [open, setOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [showKeys, setShowKeys] = useState<{ [key: number]: boolean }>({});

  const { data: apiKeys, isLoading, refetch } = trpc.apiKeys.list.useQuery();
  const createKey = trpc.apiKeys.create.useMutation({
    onSuccess: () => {
      toast.success('تم إنشاء مفتاح API بنجاح');
      setOpen(false);
      setKeyName('');
      refetch();
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) {
      toast.error('يرجى إدخال اسم المفتاح');
      return;
    }
    await createKey.mutateAsync({ name: keyName });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('تم نسخ المفتاح');
  };

  const toggleShowKey = (id: number) => {
    setShowKeys((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <DashboardLayout title="مفاتيح API">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">مفاتيح API</h3>
            <p className="text-sm text-slate-500">إدارة مفاتيح الوصول إلى API</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus size={20} />
                إنشاء مفتاح جديد
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إنشاء مفتاح API جديد</DialogTitle>
                <DialogDescription>
                  أنشئ مفتاح API جديد للوصول إلى الخدمات
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateKey} className="space-y-4">
                <div>
                  <Label htmlFor="keyName">اسم المفتاح</Label>
                  <Input
                    id="keyName"
                    placeholder="مثال: مفتاح الإنتاج"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createKey.isPending}>
                  {createKey.isPending ? 'جاري الإنشاء...' : 'إنشاء المفتاح'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* API Keys List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6">
                  <div className="h-12 bg-slate-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : apiKeys && apiKeys.length > 0 ? (
          <div className="space-y-3">
            {apiKeys.map((key: ApiKey) => (
              <Card key={key.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{key.name}</h4>
                      <div className="flex items-center gap-2 mt-2">
                        <code className="bg-slate-100 px-3 py-1 rounded text-sm font-mono">
                          {showKeys[key.id] ? key.key : key.key.substring(0, 10) + '...'}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleShowKey(key.id)}
                          className="h-8 w-8 p-0"
                        >
                          {showKeys[key.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(key.key)}
                          className="h-8 w-8 p-0"
                        >
                          <Copy size={16} />
                        </Button>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        تم الإنشاء: {new Date(key.createdAt).toLocaleDateString('ar-SA')}
                        {key.lastUsed && ` • آخر استخدام: ${new Date(key.lastUsed).toLocaleDateString('ar-SA')}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-3 py-1 text-xs rounded-full ${
                        key.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {key.isActive ? 'نشط' : 'معطل'}
                      </span>
                      <Button size="sm" variant="destructive" className="gap-2">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-slate-500 mb-4">لا توجد مفاتيح API حالياً</p>
                <Button onClick={() => setOpen(true)}>إنشاء مفتاح الآن</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documentation */}
        <Card>
          <CardHeader>
            <CardTitle>وثائق API</CardTitle>
            <CardDescription>كيفية استخدام مفاتيح API</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">المصادقة</h4>
              <code className="block bg-slate-100 p-3 rounded text-sm overflow-x-auto">
                curl -H "Authorization: Bearer YOUR_API_KEY" https://api.agenticai.com/v1/agents
              </code>
            </div>
            <div>
              <h4 className="font-semibold mb-2">الأمان</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                <li>لا تشارك مفاتيحك مع أحد</li>
                <li>احذف المفاتيح القديمة التي لا تستخدمها</li>
                <li>استخدم مفاتيح منفصلة للإنتاج والاختبار</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
