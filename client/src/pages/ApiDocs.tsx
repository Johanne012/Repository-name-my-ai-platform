import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, Code } from 'lucide-react';
import { toast } from 'sonner';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  auth: boolean;
  params?: { name: string; type: string; required: boolean; description: string }[];
  requestBody?: { name: string; type: string; description: string }[];
  response: { code: number; description: string; example: string }[];
}

const apiEndpoints: ApiEndpoint[] = [
  {
    method: 'GET',
    path: '/api/trpc/agents.list',
    description: 'الحصول على قائمة جميع الوكلاء',
    auth: true,
    response: [
      {
        code: 200,
        description: 'قائمة الوكلاء',
        example: JSON.stringify([
          { id: 1, name: 'Wokeil 1', description: 'وكيل ذكي', status: 'active' },
          { id: 2, name: 'Wokeil 2', description: 'وكيل متقدم', status: 'active' },
        ], null, 2),
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/trpc/agents.create',
    description: 'إنشاء وكيل جديد',
    auth: true,
    requestBody: [
      { name: 'name', type: 'string', description: 'اسم الوكيل' },
      { name: 'description', type: 'string', description: 'وصف الوكيل' },
      { name: 'systemPrompt', type: 'string', description: 'التعليمات النظامية' },
      { name: 'model', type: 'string', description: 'نموذج الذكاء الاصطناعي' },
    ],
    response: [
      {
        code: 201,
        description: 'تم إنشاء الوكيل بنجاح',
        example: JSON.stringify({ id: 3, name: 'Wokeil 3', status: 'active' }, null, 2),
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/trpc/executions.list',
    description: 'الحصول على سجل التنفيذات',
    auth: true,
    params: [
      { name: 'agentId', type: 'number', required: true, description: 'معرف الوكيل' },
      { name: 'limit', type: 'number', required: false, description: 'عدد النتائج' },
    ],
    response: [
      {
        code: 200,
        description: 'سجل التنفيذات',
        example: JSON.stringify([
          { id: 1, agentId: 1, input: 'مرحبا', output: 'مرحبا بك', status: 'completed' },
        ], null, 2),
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/trpc/executions.create',
    description: 'تنفيذ وكيل',
    auth: true,
    requestBody: [
      { name: 'agentId', type: 'number', description: 'معرف الوكيل' },
      { name: 'input', type: 'string', description: 'المدخل للوكيل' },
    ],
    response: [
      {
        code: 201,
        description: 'تم بدء التنفيذ',
        example: JSON.stringify({ id: 1, status: 'pending' }, null, 2),
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/trpc/apiKeys.list',
    description: 'الحصول على مفاتيح API',
    auth: true,
    response: [
      {
        code: 200,
        description: 'قائمة مفاتيح API',
        example: JSON.stringify([
          { id: 1, name: 'Production Key', key: 'sk_***', isActive: true },
        ], null, 2),
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/trpc/apiKeys.create',
    description: 'إنشاء مفتاح API جديد',
    auth: true,
    requestBody: [
      { name: 'name', type: 'string', description: 'اسم المفتاح' },
    ],
    response: [
      {
        code: 201,
        description: 'تم إنشاء المفتاح',
        example: JSON.stringify({ id: 2, name: 'New Key', key: 'sk_***', isActive: true }, null, 2),
      },
    ],
  },
];

const methodColors: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-800',
  POST: 'bg-green-100 text-green-800',
  PUT: 'bg-yellow-100 text-yellow-800',
  DELETE: 'bg-red-100 text-red-800',
};

export default function ApiDocs() {
  const [expandedEndpoint, setExpandedEndpoint] = useState<number | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('تم النسخ إلى الحافظة');
  };

  return (
    <DashboardLayout title="توثيق API">
      <div className="space-y-6">
        {/* Introduction */}
        <Card>
          <CardHeader>
            <CardTitle>مرحباً بك في توثيق API</CardTitle>
            <CardDescription>
              توثيق شامل لجميع endpoints المتاحة في منصة AgenticAI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">المصادقة</h3>
              <p className="text-sm text-slate-600 mb-3">
                جميع الطلبات تتطلب مصادقة. استخدم مفتاح API الخاص بك في رأس الطلب:
              </p>
              <div className="bg-slate-900 text-slate-50 p-3 rounded-lg font-mono text-sm overflow-x-auto">
                Authorization: Bearer sk_your_api_key_here
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Base URL</h3>
              <div className="bg-slate-900 text-slate-50 p-3 rounded-lg font-mono text-sm">
                https://api.agenticai.com/api/trpc
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">معدل التحديد</h3>
              <p className="text-sm text-slate-600">
                الخطة المجانية: 100 طلب/ساعة | الخطة الاحترافية: 10,000 طلب/ساعة | الخطة المؤسسية: بدون حد
              </p>
            </div>
          </CardContent>
        </Card>

        {/* API Endpoints */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Endpoints</h2>

          {apiEndpoints.map((endpoint, index) => (
            <Card key={index} className="overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedEndpoint(expandedEndpoint === index ? null : index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Badge className={methodColors[endpoint.method]}>
                      {endpoint.method}
                    </Badge>
                    <div>
                      <p className="font-mono text-sm font-semibold">{endpoint.path}</p>
                      <p className="text-sm text-slate-600">{endpoint.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {endpoint.auth && (
                      <Badge variant="outline" className="text-xs">
                        🔒 مصادقة مطلوبة
                      </Badge>
                    )}
                    <Code className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              {expandedEndpoint === index && (
                <CardContent className="border-t pt-4 space-y-4">
                  {/* Parameters */}
                  {endpoint.params && endpoint.params.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">المعاملات</h4>
                      <div className="space-y-2">
                        {endpoint.params.map((param, i) => (
                          <div key={i} className="bg-slate-50 p-3 rounded text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <code className="font-mono font-semibold">{param.name}</code>
                              <Badge variant="outline" className="text-xs">
                                {param.type}
                              </Badge>
                              {param.required && (
                                <Badge className="text-xs bg-red-100 text-red-800">
                                  مطلوب
                                </Badge>
                              )}
                            </div>
                            <p className="text-slate-600">{param.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Request Body */}
                  {endpoint.requestBody && endpoint.requestBody.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">جسم الطلب</h4>
                      <div className="space-y-2">
                        {endpoint.requestBody.map((field, i) => (
                          <div key={i} className="bg-slate-50 p-3 rounded text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <code className="font-mono font-semibold">{field.name}</code>
                              <Badge variant="outline" className="text-xs">
                                {field.type}
                              </Badge>
                            </div>
                            <p className="text-slate-600">{field.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Response */}
                  <div>
                    <h4 className="font-semibold mb-2">الاستجابة</h4>
                    <div className="space-y-2">
                      {endpoint.response.map((resp, i) => (
                        <div key={i} className="bg-slate-50 p-3 rounded">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-green-100 text-green-800">
                                {resp.code}
                              </Badge>
                              <span className="text-sm font-semibold">{resp.description}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(resp.example)}
                              className="gap-2"
                            >
                              <Copy className="w-4 h-4" />
                              نسخ
                            </Button>
                          </div>
                          <pre className="bg-slate-900 text-slate-50 p-3 rounded text-xs overflow-x-auto">
                            {resp.example}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Example cURL */}
                  <div>
                    <h4 className="font-semibold mb-2">مثال cURL</h4>
                    <div className="bg-slate-900 text-slate-50 p-3 rounded text-xs overflow-x-auto">
                      <pre>
                        {`curl -X ${endpoint.method} \\
  https://api.agenticai.com/api/trpc${endpoint.path} \\
  -H "Authorization: Bearer sk_your_api_key" \\
  -H "Content-Type: application/json"`}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* SDKs */}
        <Card>
          <CardHeader>
            <CardTitle>مكتبات العملاء (SDKs)</CardTitle>
            <CardDescription>استخدم إحدى مكتباتنا الرسمية</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'JavaScript/TypeScript', icon: '📘', url: '#' },
                { name: 'Python', icon: '🐍', url: '#' },
                { name: 'Go', icon: '🐹', url: '#' },
              ].map((sdk, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => window.open(sdk.url)}
                >
                  <span className="text-2xl">{sdk.icon}</span>
                  <span className="font-semibold">{sdk.name}</span>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
