import React from 'react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

export default function Privacy() {
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
          <h1 className="text-4xl font-bold">سياسة الخصوصية</h1>
          <p className="text-slate-300 mt-2">آخر تحديث: فبراير 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="prose prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. مقدمة</h2>
            <p>
              نحن في AgenticAI نلتزم بحماية خصوصيتك. توضح هذه السياسة كيفية جمع واستخدام
              ومعالجة بيانتك الشخصية.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. البيانات التي نجمعها</h2>
            <p>نجمع البيانات التالية:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>معلومات الحساب (الاسم، البريد الإلكتروني)</li>
              <li>بيانات الاستخدام (سجلات الوصول، الأنشطة)</li>
              <li>معلومات الجهاز (عنوان IP، نوع المتصفح)</li>
              <li>بيانات الدفع (معلومات بطاقة الائتمان المشفرة)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. كيفية استخدام البيانات</h2>
            <p>نستخدم بيانتك لـ:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>توفير وتحسين الخدمات</li>
              <li>التواصل معك بشأن حسابك</li>
              <li>معالجة المدفوعات</li>
              <li>منع الاحتيال والأنشطة غير القانونية</li>
              <li>تحليل الاستخدام وتحسين الأداء</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. حماية البيانات</h2>
            <p>
              نستخدم تقنيات التشفير والحماية المتقدمة لحماية بيانتك. نحتفظ بالبيانات
              فقط طالما لزم الأمر لتقديم الخدمات.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. مشاركة البيانات</h2>
            <p>
              لا نشارك بيانتك الشخصية مع أطراف ثالثة دون موافقتك، باستثناء:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>مزودو الخدمات الضروريين (معالجات الدفع)</li>
              <li>الامتثال للقوانين والأوامر القضائية</li>
              <li>حماية حقوقنا والمستخدمين الآخرين</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. حقوقك</h2>
            <p>لديك الحق في:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>الوصول إلى بيانتك الشخصية</li>
              <li>تصحيح البيانات غير الدقيقة</li>
              <li>حذف بيانتك (حق النسيان)</li>
              <li>الاعتراض على معالجة البيانات</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. ملفات تعريف الارتباط</h2>
            <p>
              نستخدم ملفات تعريف الارتباط لتحسين تجربتك. يمكنك التحكم في ملفات تعريف الارتباط
              من خلال إعدادات متصفحك.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. الامتثال للوائح</h2>
            <p>
              نمتثل لـ GDPR وقوانين حماية البيانات الأخرى المعمول بها.
              نحن ملتزمون بمعايير AI Act والمبادئ الأخلاقية.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. التحديثات على السياسة</h2>
            <p>
              قد نحدث هذه السياسة من وقت لآخر. سيتم إخطارك بأي تغييرات مهمة.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. التواصل</h2>
            <p>
              إذا كان لديك أي أسئلة حول سياسة الخصوصية، يرجى الاتصال بنا على:
              <br />
              البريد الإلكتروني: privacy@agenticai.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
