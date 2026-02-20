# AgenticAI Platform - Architecture Documentation

## نظرة عامة

منصة AgenticAI هي منصة متكاملة لإدارة وتنسيق الوكلاء الذكيين (AI Agents). تم بناؤها باستخدام:

- **Frontend:** React 19 + Tailwind CSS 4 + TypeScript
- **Backend:** Express 4 + tRPC 11 + Node.js
- **Database:** MySQL/TiDB + Drizzle ORM
- **Authentication:** Manus OAuth
- **Real-time:** Socket.io (للمستقبل)

## البنية المعمارية

```
agentic-ai-startup/
├── client/                 # Frontend (React)
│   ├── src/
│   │   ├── pages/         # صفحات التطبيق
│   │   ├── components/    # مكونات قابلة لإعادة الاستخدام
│   │   ├── lib/           # مكتبات مساعدة (tRPC client)
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   └── App.tsx        # Router الرئيسي
│   └── public/            # Assets ثابتة
├── server/                # Backend (Express + tRPC)
│   ├── routers.ts         # tRPC procedures
│   ├── db.ts              # Database queries
│   ├── _core/             # Core utilities
│   └── *.test.ts          # Unit tests
├── drizzle/               # Database schema
│   ├── schema.ts          # جداول قاعدة البيانات
│   └── migrations/        # Database migrations
├── shared/                # Shared types & constants
└── storage/               # S3 helpers
```

## قاعدة البيانات

### الجداول الرئيسية

#### 1. **users** - المستخدمون
- `id` (PK): معرف فريد
- `openId`: معرف Manus OAuth
- `name`: اسم المستخدم
- `email`: البريد الإلكتروني
- `role`: (user | admin)
- `subscriptionPlan`: (free | pro | enterprise)

#### 2. **agents** - الوكلاء الذكيين
- `id` (PK): معرف فريد
- `userId` (FK): معرف المستخدم
- `name`: اسم الوكيل
- `description`: وصف الوكيل
- `systemPrompt`: التعليمات الأساسية للوكيل
- `model`: نموذج LLM المستخدم
- `status`: (active | inactive | archived)
- `tools`: JSON array للأدوات المتاحة
- `config`: JSON للإعدادات الإضافية

#### 3. **agentExecutions** - تنفيذات الوكلاء
- `id` (PK): معرف فريد
- `agentId` (FK): معرف الوكيل
- `userId` (FK): معرف المستخدم
- `input`: المدخلات
- `output`: المخرجات
- `reactLogs`: JSON لسجلات ReAct (Reasoning & Acting)
- `status`: (pending | running | completed | failed)
- `executionTime`: وقت التنفيذ بالميلي ثانية
- `tokensUsed`: عدد الـ tokens المستخدمة
- `cost`: تكلفة التنفيذ

#### 4. **apiKeys** - مفاتيح API
- `id` (PK): معرف فريد
- `userId` (FK): معرف المستخدم
- `key`: المفتاح الفريد
- `name`: اسم المفتاح
- `isActive`: حالة النشاط
- `lastUsed`: آخر استخدام

#### 5. **subscriptions** - الاشتراكات
- `id` (PK): معرف فريد
- `userId` (FK): معرف المستخدم
- `plan`: (free | pro | enterprise)
- `status`: (active | canceled | past_due)
- `currentPeriodStart`: بداية الفترة الحالية
- `currentPeriodEnd`: نهاية الفترة الحالية

#### 6. **usageTracking** - تتبع الاستخدام
- `id` (PK): معرف فريد
- `userId` (FK): معرف المستخدم
- `agentExecutions`: عدد التنفيذات
- `tokensUsed`: عدد الـ tokens المستخدمة
- `apiCallsCount`: عدد استدعاءات API
- `costAccumulated`: التكلفة المتراكمة
- `period`: الفترة الزمنية (مثلاً: 2026-02)

#### 7. **workflows** - سير العمل متعدد الوكلاء
- `id` (PK): معرف فريد
- `userId` (FK): معرف المستخدم
- `name`: اسم سير العمل
- `agents`: JSON array لمعرفات الوكلاء
- `config`: JSON للإعدادات

#### 8. **workflowExecutions** - تنفيذات سير العمل
- `id` (PK): معرف فريد
- `workflowId` (FK): معرف سير العمل
- `userId` (FK): معرف المستخدم
- `status`: (pending | running | completed | failed)
- `executionLogs`: JSON لسجلات التنفيذ

## API Endpoints (tRPC)

### Authentication
- `auth.me` - الحصول على بيانات المستخدم الحالي
- `auth.logout` - تسجيل الخروج

### Agents Management
- `agents.list` - قائمة الوكلاء
- `agents.get` - الحصول على وكيل معين
- `agents.create` - إنشاء وكيل جديد
- `agents.update` - تحديث وكيل
- `agents.delete` - حذف وكيل

### Executions
- `executions.list` - قائمة التنفيذات
- `executions.create` - إنشاء تنفيذ جديد

### API Keys
- `apiKeys.list` - قائمة مفاتيح API
- `apiKeys.create` - إنشاء مفتاح API جديد

### Subscriptions
- `subscriptions.getCurrent` - الحصول على الاشتراك الحالي

### Usage
- `usage.getCurrent` - الحصول على بيانات الاستخدام الحالية

## الصفحات الرئيسية

### صفحات عامة
- `/` - الصفحة الرئيسية (Landing Page)
- `/terms` - شروط الخدمة
- `/privacy` - سياسة الخصوصية

### صفحات محمية (تتطلب تسجيل دخول)
- `/dashboard` - لوحة التحكم الرئيسية
- `/agents` - إدارة الوكلاء
- `/agents/:id/test` - اختبار الوكيل
- `/api-keys` - إدارة مفاتيح API
- `/billing` - الفوترة والاشتراكات
- `/settings` - الإعدادات

## تدفق المصادقة

1. المستخدم ينقر على "تسجيل الدخول"
2. يتم إعادة التوجيه إلى Manus OAuth
3. بعد المصادقة، يتم إعادة التوجيه إلى `/api/oauth/callback`
4. يتم إنشاء جلسة (session cookie)
5. يتم حفظ بيانات المستخدم في قاعدة البيانات

## نموذج ReAct (Reasoning & Acting)

الوكلاء يتبعون نموذج ReAct الذي يتضمن:

1. **Thought** (الفكرة): ما يفكر به الوكيل
2. **Action** (الإجراء): الإجراء الذي سيتخذه
3. **Observation** (الملاحظة): نتيجة الإجراء

يتم حفظ هذه السجلات في `reactLogs` في جدول `agentExecutions`.

## نظام الفوترة

### خطط الاشتراك

| الخطة | السعر | الوكلاء | التنفيذات/شهر | الميزات |
|------|------|--------|--------------|--------|
| مجاني | $0 | 5 | 100 | دعم أساسي |
| احترافي | $99 | 50 | 10,000 | دعم أولوي، API متقدمة |
| مؤسسي | $999 | غير محدود | غير محدود | دعم 24/7، SLA مخصص |

### نظام التتبع

يتم تتبع:
- عدد التنفيذات
- عدد الـ tokens المستخدمة
- عدد استدعاءات API
- التكلفة المتراكمة

## الأمان

- **Authentication**: Manus OAuth
- **Authorization**: Role-based (admin/user)
- **Data Encryption**: SSL/TLS
- **API Keys**: معرفات فريدة مع تشفير
- **CORS**: محدود للنطاقات المسموحة

## الامتثال القانوني

- **GDPR**: امتثال كامل لحماية البيانات
- **AI Act**: الامتثال للوائح الاتحاد الأوروبي
- **Terms of Service**: شروط واضحة
- **Privacy Policy**: سياسة خصوصية شاملة

## التوسع المستقبلي

### المميزات المخطط لها
1. Multi-Agent Orchestration المتقدمة
2. Real-time Notifications
3. Webhook Support
4. Advanced Analytics
5. Custom Training Models
6. Team Collaboration
7. Audit Logs
8. Advanced Monitoring

## الاختبار

يتم استخدام Vitest للاختبار:

```bash
pnpm test
```

الاختبارات تغطي:
- API endpoints
- Validation
- Database queries
- Authentication flow

## النشر

للنشر على Manus:
1. انقر على زر "Publish" في لوحة التحكم
2. تأكد من وجود checkpoint
3. سيتم نشر التطبيق على النطاق المخصص

## الدعم والتوثيق

- **API Documentation**: `/api/docs` (Swagger)
- **Knowledge Base**: `/docs`
- **Support Email**: support@agenticai.com
- **Status Page**: `/status`
