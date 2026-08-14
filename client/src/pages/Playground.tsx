import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";

type Agent = {
  id: number;
  name: string;
  description: string;
};

type Msg = { role: "user" | "assistant"; content: string; meta?: string };

export default function Playground() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentId, setAgentId] = useState<number | undefined>();
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "مرحباً! هذه ساحة تجربة حقيقية للمنصة — بدون تسجيل أو مفاتيح. اكتب رسالة وسيعمل الوكيل فوراً.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("loading…");

  useEffect(() => {
    fetch("/api/public/agents")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.agents?.length) {
          setAgents(d.agents);
          setAgentId(d.agents[0].id);
        }
      })
      .catch(() => {});
    fetch("/health")
      .then((r) => r.json())
      .then((d) => setStatus(`${d.status} · ${d.service}`))
      .catch(() => setStatus("online"));
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await fetch("/api/public/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, agentId }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsgs((m) => [
          ...m,
          {
            role: "assistant",
            content: data.output,
            meta: `${data.provider || "?"} · ${data.latencyMs ?? "?"}ms`,
          },
        ]);
      } else {
        setMsgs((m) => [
          ...m,
          { role: "assistant", content: `خطأ: ${data.error || "failed"}` },
        ]);
      }
    } catch (e: any) {
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: `خطأ شبكة: ${e?.message || e}` },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, agentId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">AgenticAI · Playground</h1>
          <p className="text-xs text-slate-400">منصة حقيقية · صفر إعداد · {status}</p>
        </div>
        <Link href="/" className="text-sm text-cyan-400 hover:underline">
          الرئيسية
        </Link>
      </header>

      <div className="px-4 py-2 border-b border-slate-800 flex flex-wrap gap-2 items-center">
        <span className="text-xs text-slate-500">الوكيل:</span>
        {agents.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAgentId(a.id)}
            className={`text-xs px-3 py-1 rounded-full border ${
              agentId === a.id
                ? "bg-cyan-600 border-cyan-500 text-white"
                : "border-slate-700 text-slate-300 hover:border-slate-500"
            }`}
          >
            {a.name}
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-3xl w-full mx-auto">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
              m.role === "user"
                ? "bg-cyan-900/40 ml-8 border border-cyan-800/50"
                : "bg-slate-900 mr-8 border border-slate-800"
            }`}
          >
            {m.content}
            {m.meta && (
              <div className="mt-2 text-[10px] text-slate-500">{m.meta}</div>
            )}
          </div>
        ))}
        {loading && (
          <div className="text-xs text-slate-500 animate-pulse">الوكيل يفكر…</div>
        )}
      </main>

      <footer className="border-t border-slate-800 p-4 max-w-3xl w-full mx-auto">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input
            className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-sm outline-none focus:border-cyan-600"
            placeholder="اكتب رسالتك هنا…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 px-5 py-3 text-sm font-medium"
          >
            إرسال
          </button>
        </form>
      </footer>
    </div>
  );
}
