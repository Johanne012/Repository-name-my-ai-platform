import React, { useState, useRef, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Copy, Download } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface ReActLog {
  step: number;
  thought: string;
  action: string;
  observation: string;
}

export default function AgentTest() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reactLogs, setReactLogs] = useState<ReActLog[]>([]);
  const [showReactLogs, setShowReactLogs] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate agent response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `تم استقبال طلبك: "${input}". جاري معالجة الطلب...`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Simulate ReAct logs
      setReactLogs([
        {
          step: 1,
          thought: 'يجب أن أفهم الطلب أولاً',
          action: 'تحليل النص',
          observation: 'الطلب واضح ومفهوم',
        },
        {
          step: 2,
          thought: 'الآن سأبحث عن المعلومات',
          action: 'البحث في قاعدة البيانات',
          observation: 'تم العثور على 5 نتائج',
        },
        {
          step: 3,
          thought: 'سأقوم بتجميع النتائج',
          action: 'معالجة النتائج',
          observation: 'تم تجميع النتائج بنجاح',
        },
      ]);

      setIsLoading(false);
    }, 1500);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('تم النسخ');
  };

  const downloadLogs = () => {
    const content = JSON.stringify(reactLogs, null, 2);
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', 'react-logs.json');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('تم تحميل السجلات');
  };

  return (
    <DashboardLayout title="اختبار الوكيل">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Chat Interface */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle>واجهة الاختبار</CardTitle>
            <CardDescription>اختبر الوكيل مباشرة هنا</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col overflow-hidden">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500">
                  <div className="text-center">
                    <p className="text-lg font-medium mb-2">ابدأ محادثة جديدة</p>
                    <p className="text-sm">أرسل رسالة للبدء في اختبار الوكيل</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {message.timestamp.toLocaleTimeString('ar-SA')}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-200 text-slate-900 px-4 py-2 rounded-lg">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                placeholder="أرسل رسالة..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="gap-2"
              >
                <Send size={20} />
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ReAct Logs Sidebar */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>سجلات ReAct</CardTitle>
                <CardDescription>خطوات التفكير والعمل</CardDescription>
              </div>
              {reactLogs.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadLogs}
                  className="gap-1"
                >
                  <Download size={16} />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-3">
            {reactLogs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                السجلات ستظهر هنا
              </p>
            ) : (
              reactLogs.map((log) => (
                <div
                  key={log.step}
                  className="border border-slate-200 rounded-lg p-3 bg-slate-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">الخطوة {log.step}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        copyToClipboard(
                          `${log.thought}\n${log.action}\n${log.observation}`
                        )
                      }
                      className="h-6 w-6 p-0"
                    >
                      <Copy size={14} />
                    </Button>
                  </div>
                  <div className="space-y-1 text-xs">
                    <p>
                      <span className="font-medium">الفكرة:</span> {log.thought}
                    </p>
                    <p>
                      <span className="font-medium">الإجراء:</span> {log.action}
                    </p>
                    <p>
                      <span className="font-medium">الملاحظة:</span>{' '}
                      {log.observation}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
