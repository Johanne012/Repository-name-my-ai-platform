import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function ApiKeys() {
  const [open, setOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [justCreatedKey, setJustCreatedKey] = useState<string | null>(null);

  const { data: apiKeys, isLoading, refetch } = trpc.apiKeys.list.useQuery();
  const createKey = trpc.apiKeys.create.useMutation({
    onSuccess: (data) => {
      setJustCreatedKey(data.rawKey);
      toast.success("تم إنشاء مفتاح API — احفظه الآن، لن يظهر مجدداً");
      setKeyName("");
      refetch();
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const revokeKey = trpc.apiKeys.revoke.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء المفتاح");
      refetch();
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) {
      toast.error("يرجى إدخال اسم المفتاح");
      return;
    }
    setJustCreatedKey(null);
    await createKey.mutateAsync({ name: keyName });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم نسخ المفتاح");
  };

  return (
    <DashboardLayout title="مفاتيح API">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">مفاتيح API</h3>
            <p className="text-sm text-slate-500">
              المفتاح الكامل يُعرض مرة واحدة فقط عند الإنشاء (يُخزَّن كـ hash في الخادم)
            </p>
          </div>
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setJustCreatedKey(null);
            }}
          >
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
                  بعد الإنشاء انسخ المفتاح فوراً — لن نتمكن من إظهاره لاحقاً.
                </DialogDescription>
              </DialogHeader>
              {justCreatedKey ? (
                <div className="space-y-3">
                  <p className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
                    احفظ هذا المفتاح الآن. لن يظهر مرة أخرى.
                  </p>
                  <code className="block bg-slate-100 p-3 rounded text-sm font-mono break-all">
                    {justCreatedKey}
                  </code>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => copyToClipboard(justCreatedKey)}
                  >
                    نسخ المفتاح
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setOpen(false);
                      setJustCreatedKey(null);
                    }}
                  >
                    تم الحفظ
                  </Button>
                </div>
              ) : (
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
                    {createKey.isPending ? "جاري الإنشاء..." : "إنشاء المفتاح"}
                  </Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>

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
            {apiKeys.map((key) => (
              <Card key={key.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold">{key.name}</h4>
                      <code className="bg-slate-100 px-3 py-1 rounded text-sm font-mono inline-block mt-2">
                        {key.keyPrefix}…
                      </code>
                      <p className="text-xs text-slate-500 mt-2">
                        تم الإنشاء:{" "}
                        {key.createdAt
                          ? new Date(key.createdAt).toLocaleDateString("ar-SA")
                          : "—"}
                        {key.lastUsed &&
                          ` • آخر استخدام: ${new Date(key.lastUsed).toLocaleDateString("ar-SA")}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-3 py-1 text-xs rounded-full ${
                          key.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {key.isActive ? "نشط" : "ملغى"}
                      </span>
                      {key.isActive && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-2"
                          disabled={revokeKey.isPending}
                          onClick={() => {
                            if (confirm("إلغاء هذا المفتاح؟ لن يعمل بعدها.")) {
                              revokeKey.mutate({ id: key.id });
                            }
                          }}
                        >
                          <Trash2 size={16} />
                          إلغاء
                        </Button>
                      )}
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

        <Card>
          <CardHeader>
            <CardTitle>وثائق API</CardTitle>
            <CardDescription>كيفية استخدام مفاتيح API</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">المصادقة</h4>
              <code className="block bg-slate-100 p-3 rounded text-sm overflow-x-auto">
                {`curl -H "Authorization: Bearer YOUR_API_KEY" https://YOUR_HOST/api/...`}
              </code>
            </div>
            <div>
              <h4 className="font-semibold mb-2">الأمان</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                <li>لا تشارك مفاتيحك مع أحد</li>
                <li>ألغِ المفاتيح القديمة التي لا تستخدمها</li>
                <li>الخادم يخزّن hash فقط — لا يمكن استرجاع المفتاح الكامل لاحقاً</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
