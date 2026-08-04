# AgenticAI — منصة الوكلاء الذكيين

[![CI](https://github.com/Johanne012/Repository-name-my-ai-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/Johanne012/Repository-name-my-ai-platform/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./package.json)

منصة لإدارة وتشغيل وكلاء ذكيين (AI Agents) مع لوحة تحكم، مفاتيح API، فوترة Stripe، وتتبع استخدام.

> **ملاحظة:** اسم المستودع على GitHub ما زال `Repository-name-my-ai-platform` — يُفضَّل إعادة تسميته إلى `agentic-ai` من إعدادات المستودع.

## المميزات

- إدارة الوكلاء (CRUD) مع فحص ملكية (مضاد IDOR)
- واجهة اختبار تفاعلية وسجلات ReAct
- مفاتيح API آمنة (hash في الخادم + عرض لمرة واحدة)
- اشتراكات Stripe وخطط استخدام
- Workflows متعددة الوكلاء (حفظ في DB؛ محرك التشغيل الكامل قيد التطوير)
- رؤوس أمان HTTP + `/health`

## المتطلبات

- Node.js 22+
- pnpm 10+
- MySQL / TiDB

## التثبيت

```bash
git clone https://github.com/Johanne012/Repository-name-my-ai-platform.git
cd Repository-name-my-ai-platform
cp .env.example .env
# عدّل DATABASE_URL و JWT_SECRET

pnpm install
pnpm db:push
pnpm dev
```

- التطبيق: `http://localhost:3000`
- الصحة: `http://localhost:3000/health`

## البنية

```
├── client/          # React 19 + Tailwind + tRPC client
├── server/          # Express + tRPC + middleware
├── drizzle/         # Schema + migrations
├── shared/          # أنواع مشتركة
└── .github/workflows/ci.yml
```

تفاصيل أكثر: [ARCHITECTURE.md](./ARCHITECTURE.md) · [SECURITY.md](./SECURITY.md)

## الاختبار

```bash
pnpm test
```

يشمل اختبارات ملكية الموارد وتوليد مفاتيح API.

## الأمان

- مفاتيح API: SHA-256 فقط في قاعدة البيانات
- عمليات الوكلاء/التنفيذات/الإشعارات مربوطة بـ `userId`
- كوكي الجلسة: `httpOnly` + `secure` حسب HTTPS
- حد جسم الطلب: 2MB

## المصادقة

الوضع الافتراضي يعتمد على **Manus OAuth**. للتشغيل المحلي تحتاج قيم `VITE_APP_ID` و `OAUTH_SERVER_URL` من بيئة Manus، أو توسيع طبقة المصادقة لاحقاً.

## الترخيص

MIT — انظر `package.json`

## المساهمة

[CONTRIBUTING.md](./CONTRIBUTING.md)
