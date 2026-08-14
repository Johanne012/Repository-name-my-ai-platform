import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Zap, Brain, Workflow, Shield, TrendingUp, Rocket } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      <nav className="border-b border-slate-700/50 backdrop-blur-md bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-8 h-8 text-blue-400" />
            <span className="text-2xl font-bold">AgenticAI</span>
          </div>
          <Button
            onClick={() => setLocation("/playground")}
            className="bg-cyan-600 hover:bg-cyan-500"
          >
            جرّب الآن — بدون تسجيل
          </Button>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center space-y-8">
          <div className="inline-block rounded-full bg-emerald-500/20 border border-emerald-500/40 px-4 py-1 text-sm text-emerald-300">
            يعمل الآن · صفر إعداد · بدون مفاتيح
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            منصة وكلاء حقيقية
            <span className="block text-cyan-400 mt-2">تعمل فوراً</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            دردش مع وكلاء جاهزين، أنشئ وكيلاً، وشغّل AG-UI — كل ذلك بدون قاعدة
            بيانات أو مفاتيح API. المنصة حية على الإنتاج.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              size="lg"
              onClick={() => setLocation("/playground")}
              className="bg-cyan-600 hover:bg-cyan-500 text-lg px-8"
            >
              افتح ساحة التجربة
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-slate-400 text-white hover:bg-slate-800"
              onClick={() => setLocation("/api-docs")}
            >
              وثائق API
            </Button>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">ما يعمل الآن</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Brain,
              title: "وكلاء جاهزون",
              description: "مساعد عام · كاتب محتوى · مساعد برمجة",
            },
            {
              icon: Workflow,
              title: "API عامة",
              description: "/api/public/chat و /api/ag-ui/run بدون مصادقة",
            },
            {
              icon: Rocket,
              title: "وضع Demo ذكي",
              description: "مزود مدمج يعمل بدون مفاتيح خارجية",
            },
            {
              icon: Shield,
              title: "نشر على Vercel",
              description: "إنتاج حي مع health و status",
            },
            {
              icon: TrendingUp,
              title: "تخزين مؤقت",
              description: "وكلاء وتنفيذات في الذاكرة بدون DB",
            },
            {
              icon: Zap,
              title: "ترقية اختيارية",
              description: "أضف مفتاح LLM لاحقاً للردود الحقيقية",
            },
          ].map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-cyan-500 transition-colors"
              >
                <Icon className="w-10 h-10 text-cyan-400 mb-3" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-slate-700 bg-slate-900/50 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-slate-400 text-sm">
          <p>AgenticAI · مسار مجاني مفتوح · يعمل بدون تدخل إعدادات</p>
          <p className="mt-2">
            <a href="/playground" className="text-cyan-400 hover:underline">
              /playground
            </a>
            {" · "}
            <a href="/health" className="text-cyan-400 hover:underline">
              /health
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
