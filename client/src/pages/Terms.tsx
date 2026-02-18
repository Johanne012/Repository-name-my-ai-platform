import React from 'react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

export default function Terms() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-slate-900 text-white py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Button
            variant="ghost"
            className="text-white mb-4"
            onClick={() => setLocation('/')}
          >
            ← العودة
          </Button>
          <h1 className="text-4xl font-bold">شروط الخدمة</h1>
          <p className="text-slate-300 mt-2">آخر تحديث: فبراير 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="prose prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. قبول الشروط</h2>
            <p>
              بالوصول إلى واستخدام منصة AgenticAI، فإنك توافق على الالتزام بهذه الشروط والأحكام.
              إذا كنت لا توافق على أي جزء من هذه الشروط، فيرجى عدم استخدام الخدمة.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. الترخيص</h2>
            <p>
              نحن نمنحك ترخيصاً محدوداً وغير حصري لاستخدام منصتنا وفقاً لهذه الشروط.
              لا يمكنك نسخ أو تعديل أو توزيع أي محتوى دون إذن صريح منا.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. مسؤولية المستخدم</h2>
            <p>
              أنت مسؤول عن جميع الأنشطة التي تحدث تحت حسابك. يجب عليك الحفاظ على سرية
              بيانات اعتماد حسابك وإخطارنا فوراً بأي استخدام غير مصرح به.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. استخدام الخدمة</h2>
            <p>
              يجب عليك استخدام الخدمة بطريقة قانونية وأخلاقية. لا يُسمح بـ:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>الأنشطة غير القانونية أو الضارة</li>
              <li>محاولات الوصول غير المصرح به</li>
              <li>نقل البرامج الضارة</li>
              <li>انتهاك حقوق الآخرين</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. عدم الضمان</h2>
            <p>
              يتم توفير الخدمة "كما هي" بدون أي ضمانات. لا نضمن أن الخدمة ستكون خالية من الأخطاء
              أو أن الخدمة ستكون متاحة بشكل مستمر.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. تحديد المسؤولية</h2>
            <p>
              في أي حال من الأحوال، لن نكون مسؤولين عن أي أضرار غير مباشرة أو عرضية أو خاصة
              أو تبعية ناشئة عن استخدامك للخدمة.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. التعديلات على الشروط</h2>
            <p>
              نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم إخطارك بأي تغييرات مهمة عبر البريد الإلكتروني.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. الإنهاء</h2>
            <p>
              يمكننا إنهاء حسابك في أي وقت إذا انتهكت هذه الشروط أو قوانين قابلة للتطبيق.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. القانون الحاكم</h2>
            <p>
              تحكم هذه الشروط والأحكام بموجب القوانين المعمول بها، وتخضع للاختصاص القضائي الحصري للمحاكم المختصة.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. التواصل</h2>
            <p>
              إذا كان لديك أي أسئلة حول هذه الشروط، يرجى الاتصال بنا على:
              <br />
              البريد الإلكتروني: legal@agenticai.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
