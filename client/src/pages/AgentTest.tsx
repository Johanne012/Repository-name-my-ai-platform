import React, { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  meta?: string;
}

interface ReActLog {
  step: number;
  thought: string;
  action: string;
  observation: string;
}

export default function AgentTest() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [reactLogs, setReactLogs] = useState<ReActLog[]>([]);
  const [agentId, setAgentId] = useState<number | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: agents } = trpc.agents.list.useQuery(undefined, {
    retry: false,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (agents && agents.length > 0 && agentId === undefined) {
      setAgentId(agents[0].id);
    }
  }, [agents, agentId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setReactLogs([
      {
        step: 1,
        thought: "إرسال الطلب إلى محرك AG-UI / multi-provider LLM",
        action: "POST /api/ag-ui/run",
        observation: "جاري الانتظار...",
      },
    ]);

    try {
      const body: Record<string, unknown> = {
        messages: [{ role: "user", content: userText }],
      };
      if (agentId) body.agentId = agentId;

      const res = await fetch("/api/ag-ui/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.ok === false) {
        const errMsg =
          data.error ||
          data.message ||
          `فشل الطلب (${res.status}). تأكد من إعداد مفاتيح LLM على Vercel.`;
        throw new Error(errMsg);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.output || "(لا يوجد رد نصي)",
        timestamp: new Date(),
        meta: [data.provider, data.model, data.latencyMs ? `${data.latencyMs}ms` : null]
          .filter(Boolean)
          .join(" · "),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setReactLogs([
        {
          step: 1,
          thought: "تم اختيار مزود LLM تلقائياً",
          action: `provider=${data.provider || "?"}`,
          observation: data.model || "",
        },
        {
          step: 2,
          thought: "اكتمل التشغيل",
          action: "RUN_FINISHED",
          observation: data.latencyMs
            ? `الزمن ${data.latencyMs}ms · tokens=${data.tokensUsed ?? "?"}`
            : "تم",
        },
      ]);
    } catch (err: any) {
      const msg = err?.message || String(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          role: "system",
          content: `خطأ: ${msg}`,
          timestamp: new Date(),
        },
      ]);
      setReactLogs([
        {
          step: 1,
          thought: "فشل التشغيل",
          action: "error",
          observation: msg,
        },
      ]);
      toast.error(msg.slice(0, 120));
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ");
  };

  const downloadLogs = () => {
    const content = JSON.stringify(reactLogs, null, 2);
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(content),
    );
    element.setAttribute("download", "react-logs.json");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("تم تحميل السجلات");
  };

  return (
    <DashboardLayout title="اختبار الوكيل">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle>واجهة الاختبار (حقيقية)</CardTitle>
            <CardDescription>
              تتصل بمحرك AG-UI و multi-provider LLM على الخادم
            </CardDescription>
            {agents && agents.length > 0 && (
              <div className="pt-2">
                <label className="text-xs text-slate-500 block mb-1">الوكيل</label>
                <select
                  className="w-full border rounded-md px-2 py-1.5 text-sm bg-white"
                  value={agentId ?? ""}
                  onChange={(e) =>
                    setAgentId(e.target.value ? Number(e.target.value) : undefined)
                  }
                >
                  <option value="">بدون وكيل (افتراضي النظام)</option>
                  {agents.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (#{a.id})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500">
                  <div className="text-center">
                    <p className="text-lg font-medium mb-2">ابدأ محادثة حقيقية</p>
                    <p className="text-sm">
                      يلزم مفتاح LLM واحد على الأقل في Vercel (مثل GEMINI_API_KEY)
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.role === "user"
                          ? "bg-blue-600 text-white"
                          : message.role === "system"
                            ? "bg-red-50 text-red-800 border border-red-200"
                            : "bg-slate-200 text-slate-900"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.meta && (
                        <p className="text-xs mt-1 opacity-70">{message.meta}</p>
                      )}
                      <p className="text-xs mt-1 opacity-70">
                        {message.timestamp.toLocaleTimeString("ar-SA")}
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

        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>سجلات التشغيل</CardTitle>
                <CardDescription>مزود LLM والزمن</CardDescription>
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
                السجلات ستظهر هنا بعد أول رد
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
                          `${log.thought}\n${log.action}\n${log.observation}`,
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
                      <span className="font-medium">الملاحظة:</span> {log.observation}
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
