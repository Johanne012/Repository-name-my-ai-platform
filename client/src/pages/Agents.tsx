import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Edit2, Play } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function Agents() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    model: 'gpt-4.1-mini',
  });

  const { data: agents, isLoading, refetch } = trpc.agents.list.useQuery();
  const createAgent = trpc.agents.create.useMutation({
    onSuccess: () => {
      toast.success('تم إنشاء الوكيل بنجاح');
      setOpen(false);
      setFormData({ name: '', description: '', systemPrompt: '', model: 'gpt-4.1-mini' });
      refetch();
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('يرجى إدخال اسم الوكيل');
      return;
    }
    await createAgent.mutateAsync(formData);
  };

  return (
    <DashboardLayout title="إدارة الوكلاء">
      <div className="space-y-6">
        {/* Header with Create Button */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">قائمة الوكلاء</h3>
            <p className="text-sm text-slate-500">إدارة وكلائك الذكيين</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus size={20} />
                إنشاء وكيل جديد
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إنشاء وكيل جديد</DialogTitle>
                <DialogDescription>
                  أدخل تفاصيل الوكيل الجديد
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">اسم الوكيل</Label>
                  <Input
                    id="name"
                    placeholder="مثال: محلل البيانات"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="description">الوصف</Label>
                  <Textarea
                    id="description"
                    placeholder="وصف الوكيل ووظائفه"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="systemPrompt">System Prompt</Label>
                  <Textarea
                    id="systemPrompt"
                    placeholder="التعليمات الأساسية للوكيل"
                    value={formData.systemPrompt}
                    onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createAgent.isPending}>
                  {createAgent.isPending ? 'جاري الإنشاء...' : 'إنشاء الوكيل'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Agents Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : agents && agents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent: any) => (
              <Card key={agent.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      <CardDescription>{agent.description || 'بدون وصف'}</CardDescription>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      agent.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {agent.status === 'active' ? 'نشط' : 'غير نشط'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">النموذج:</span> {agent.model}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 gap-2">
                        <Play size={16} />
                        تشغيل
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 gap-2">
                        <Edit2 size={16} />
                        تعديل
                      </Button>
                      <Button size="sm" variant="destructive" className="flex-1 gap-2">
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
                <p className="text-slate-500 mb-4">لا توجد وكلاء حالياً</p>
                <Button onClick={() => setOpen(true)}>إنشاء وكيل الآن</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
