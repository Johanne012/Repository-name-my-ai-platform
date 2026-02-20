# AgenticAI - منصة الوكلاء الذكيين

منصة متكاملة وشاملة لبناء وإدارة وتشغيل الوكلاء الذكيين (AI Agents) مع قدرات Multi-Agent Orchestration متقدمة.

## المميزات الرئيسية

**إدارة الوكلاء:** بناء وتعديل وحذف الوكلاء الذكيين مع واجهة سهلة الاستخدام.

**اختبار تفاعلي:** واجهة دردشة متقدمة لاختبار الوكلاء مع عرض سجلات ReAct (Reasoning & Acting).

**تنسيق متعدد الوكلاء:** تنسيق عمل عدة وكلاء معاً لتنفيذ مهام معقدة.

**إدارة مفاتيح API:** إنشاء وإدارة مفاتيح API للتكامل مع الأنظمة الخارجية.

**نظام الفوترة:** خطط اشتراك مرنة (مجاني، احترافي، مؤسسي) مع تتبع الاستخدام.

**لوحة تحكم احترافية:** عرض إحصائيات شاملة وتتبع أداء الوكلاء.

**وثائق قانونية:** شروط خدمة وسياسة خصوصية شاملة مع امتثال كامل للوائح.

**أمان عالي:** مصادقة Manus OAuth، تشفير البيانات، وإدارة الأدوار.

## البدء السريع

### المتطلبات

- Node.js 22+
- pnpm 10+
- قاعدة بيانات MySQL/TiDB

### التثبيت

```bash
# استنساخ المشروع
git clone <repo-url>
cd agentic-ai-startup

# تثبيت المكتبات
pnpm install

# إعداد قاعدة البيانات
pnpm db:push

# تشغيل خادم التطوير
pnpm dev
```

الآن يمكنك الوصول إلى التطبيق على `http://localhost:3000`.

## البنية المعمارية

```
agentic-ai-startup/
├── client/          # Frontend (React + Tailwind)
├── server/          # Backend (Express + tRPC)
├── drizzle/         # Database schema
├── shared/          # Shared types
└── storage/         # S3 helpers
```

للمزيد من التفاصيل، انظر [ARCHITECTURE.md](./ARCHITECTURE.md).

## الصفحات الرئيسية

### صفحات عامة

- **الصفحة الرئيسية** (`/`): عرض المميزات والأسعار
- **شروط الخدمة** (`/terms`): الشروط والأحكام
- **سياسة الخصوصية** (`/privacy`): سياسة حماية البيانات

### صفحات محمية

- **لوحة التحكم** (`/dashboard`): عرض الإحصائيات والأنشطة
- **إدارة الوكلاء** (`/agents`): إنشاء وتعديل الوكلاء
- **اختبار الوكيل** (`/agents/:id/test`): واجهة اختبار تفاعلية
- **مفاتيح API** (`/api-keys`): إدارة مفاتيح الوصول
- **الفوترة** (`/billing`): إدارة الاشتراكات والفواتير
- **الإعدادات** (`/settings`): إعدادات الحساب والأمان

## API Endpoints

جميع الـ endpoints مبنية باستخدام tRPC:

### المصادقة
```typescript
trpc.auth.me.useQuery()              // الحصول على المستخدم الحالي
trpc.auth.logout.useMutation()       // تسجيل الخروج
```

### الوكلاء
```typescript
trpc.agents.list.useQuery()          // قائمة الوكلاء
trpc.agents.get.useQuery({ id })     // الحصول على وكيل
trpc.agents.create.useMutation()     // إنشاء وكيل
trpc.agents.update.useMutation()     // تحديث وكيل
trpc.agents.delete.useMutation()     // حذف وكيل
```

### التنفيذات
```typescript
trpc.executions.list.useQuery()      // قائمة التنفيذات
trpc.executions.create.useMutation() // تنفيذ جديد
```

### مفاتيح API
```typescript
trpc.apiKeys.list.useQuery()         // قائمة المفاتيح
trpc.apiKeys.create.useMutation()    // إنشاء مفتاح
```

## الاختبار

تشغيل الاختبارات:

```bash
pnpm test
```

الاختبارات تغطي جميع الـ API endpoints والتحقق من الصحة.

## النشر

### على Manus

1. تأكد من وجود checkpoint
2. انقر على زر "Publish" في لوحة التحكم
3. سيتم نشر التطبيق على النطاق المخصص

### على خادم خارجي

```bash
# بناء التطبيق
pnpm build

# تشغيل الإنتاج
pnpm start
```

## متغيرات البيئة

يتم تعيين المتغيرات التالية تلقائياً:

- `DATABASE_URL`: اتصال قاعدة البيانات
- `JWT_SECRET`: مفتاح توقيع الجلسات
- `VITE_APP_ID`: معرف تطبيق OAuth
- `OAUTH_SERVER_URL`: خادم OAuth
- `BUILT_IN_FORGE_API_KEY`: مفتاح API المدمج

## الامتثال والأمان

**GDPR:** امتثال كامل لحماية البيانات الشخصية.

**AI Act:** الامتثال للوائح الاتحاد الأوروبي للذكاء الاصطناعي.

**SSL/TLS:** تشفير جميع الاتصالات.

**Role-based Access:** إدارة الأدوار والصلاحيات.

## المساهمة

نرحب بالمساهمات! يرجى:

1. Fork المشروع
2. إنشاء فرع للميزة الجديدة
3. Commit التغييرات
4. Push إلى الفرع
5. فتح Pull Request

## الترخيص

هذا المشروع مرخص تحت MIT License.

## الدعم

للمساعدة والدعم:

- **البريد الإلكتروني:** support@agenticai.com
- **الموقع:** https://agenticai.com
- **الوثائق:** https://docs.agenticai.com

## الخريطة الطريقية

### المرحلة الحالية (Q1 2026)
- ✅ لوحة تحكم أساسية
- ✅ إدارة الوكلاء
- ✅ اختبار الوكلاء
- ✅ نظام الفوترة

### المرحلة القادمة (Q2 2026)
- 🔄 Multi-Agent Orchestration متقدمة
- 🔄 Webhooks والإشعارات
- 🔄 Advanced Analytics
- 🔄 Team Collaboration

### المرحلة المستقبلية (Q3-Q4 2026)
- 📋 Custom Training Models
- 📋 Real-time Monitoring
- 📋 Audit Logs
- 📋 Enterprise Features

---

تم بناء هذا المشروع بـ ❤️ لتمكين الذكاء الاصطناعي المستقل.
