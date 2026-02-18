import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { Zap, Brain, Workflow, Shield, TrendingUp, Rocket } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user) {
    setLocation("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-700/50 backdrop-blur-md bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-8 h-8 text-blue-400" />
            <span className="text-2xl font-bold">AgenticAI</span>
          </div>
          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            className="bg-blue-600 hover:bg-blue-700"
          >
            تسجيل الدخول
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            منصة الوكلاء الذكيين
            <span className="block text-blue-400 mt-2">للمستقبل</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            بناء وتشغيل وكلاء ذكيين متقدمين يعملون بدلاً عنك. منصة متكاملة لإدارة وتنسيق الوكلاء الذكيين مع قدرات Multi-Agent Orchestration.
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => (window.location.href = getLoginUrl())}
              className="bg-blue-600 hover:bg-blue-700 text-lg px-8"
            >
              ابدأ الآن
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-slate-400 text-white hover:bg-slate-800"
            >
              اعرف المزيد
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">المميزات الرئيسية</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: Brain,
              title: "وكلاء ذكيين متقدمين",
              description: "بناء وكلاء باستخدام أحدث نماذج الذكاء الاصطناعي",
            },
            {
              icon: Workflow,
              title: "تنسيق متعدد الوكلاء",
              description: "تنسيق عمل عدة وكلاء معاً لتنفيذ مهام معقدة",
            },
            {
              icon: Shield,
              title: "أمان عالي",
              description: "حماية كاملة للبيانات والامتثال للوائح",
            },
            {
              icon: TrendingUp,
              title: "تحليلات مفصلة",
              description: "تتبع أداء الوكلاء والحصول على رؤى عميقة",
            },
            {
              icon: Rocket,
              title: "سرعة فائقة",
              description: "تنفيذ فوري للمهام مع أداء عالي",
            },
            {
              icon: Zap,
              title: "API قوية",
              description: "تكامل سهل مع أنظمتك الموجودة",
            },
          ].map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-blue-500 transition-colors"
              >
                <Icon className="w-12 h-12 text-blue-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">خطط الأسعار</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              name: "مجاني",
              price: "0",
              features: ["5 وكلاء", "100 تنفيذ/شهر", "دعم أساسي"],
            },
            {
              name: "احترافي",
              price: "99",
              features: ["50 وكيل", "10,000 تنفيذ/شهر", "دعم أولوي", "API متقدمة"],
              highlighted: true,
            },
            {
              name: "مؤسسي",
              price: "999",
              features: ["وكلاء غير محدودة", "تنفيذات غير محدودة", "دعم 24/7", "SLA مخصص"],
            },
          ].map((plan, index) => (
            <div
              key={index}
              className={`rounded-lg p-8 ${
                plan.highlighted
                  ? "bg-blue-600 border-2 border-blue-400 transform scale-105"
                  : "bg-slate-800/50 border border-slate-700"
              }`}
            >
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="text-4xl font-bold mb-6">
                ${plan.price}
                <span className="text-lg text-slate-400">/شهر</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-blue-400">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={plan.highlighted ? "default" : "outline"}
              >
                اختر الخطة
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-4xl font-bold mb-6">جاهز للبدء؟</h2>
        <p className="text-xl text-slate-300 mb-8">
          انضم إلى آلاف المطورين الذين يستخدمون AgenticAI
        </p>
        <Button
          size="lg"
          onClick={() => (window.location.href = getLoginUrl())}
          className="bg-blue-600 hover:bg-blue-700 text-lg px-8"
        >
          ابدأ مجاناً الآن
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50 backdrop-blur-md mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold mb-4">المنتج</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white">الميزات</a></li>
                <li><a href="#" className="hover:text-white">الأسعار</a></li>
                <li><a href="#" className="hover:text-white">الوثائق</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">الشركة</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white">حول</a></li>
                <li><a href="#" className="hover:text-white">المدونة</a></li>
                <li><a href="#" className="hover:text-white">الوظائف</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">قانوني</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="/terms" className="hover:text-white">شروط الخدمة</a></li>
                <li><a href="/privacy" className="hover:text-white">سياسة الخصوصية</a></li>
                <li><a href="/compliance" className="hover:text-white">الامتثال</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">التواصل</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="mailto:support@agenticai.com" className="hover:text-white">البريد الإلكتروني</a></li>
                <li><a href="#" className="hover:text-white">تويتر</a></li>
                <li><a href="#" className="hover:text-white">لينكدإن</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-8 text-center text-slate-400">
            <p>&copy; 2026 AgenticAI. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
