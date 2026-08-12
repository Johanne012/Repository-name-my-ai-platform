# AgenticAI — منصة الوكلاء الذكيين

[![CI](https://github.com/Johanne012/Repository-name-my-ai-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/Johanne012/Repository-name-my-ai-platform/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./package.json)
[![Production](https://img.shields.io/badge/production-live-brightgreen)](https://repository-name-my-ai-platform.vercel.app)

منصة لإدارة وتشغيل وكلاء ذكيين (AI Agents) مع لوحة تحكم، مفاتيح API، فوترة Stripe، وتتبع استخدام.

> **ملاحظة:** اسم المستودع على GitHub ما زال `Repository-name-my-ai-platform` — يُفضَّل إعادة تسميته إلى `agentic-ai` من إعدادات المستودع.

## الإنتاج (Live)

| | |
|---|---|
| **URL** | https://repository-name-my-ai-platform.vercel.app |
| **Health** | https://repository-name-my-ai-platform.vercel.app/health |
| **tRPC** | `/api/trpc/*` |
| **OAuth** | `/api/oauth/callback` |
| **Host** | Vercel (static frontend + serverless Express) |

### متغيرات البيئة المطلوبة على Vercel

Project → Settings → Environment Variables (Production):

| المتغير | مطلوب | الوصف |
|---------|--------|--------|
| `DATABASE_URL` | نعم | MySQL/TiDB connection string |
| `JWT_SECRET` | نعم | سر توقيع الجلسات (طويل وعشوائي) |
| `OAUTH_SERVER_URL` | للمصادقة | خادم OAuth (Manus) |
| `VITE_APP_ID` | للمصادقة | معرّف تطبيق OAuth |
| `OWNER_OPEN_ID` | اختياري | openId للمالك/أدمن |
| `STRIPE_SECRET_KEY` | للفوترة | مفتاح Stripe |
| `STRIPE_WEBHOOK_SECRET` | للفوترة | سر webhook |
| `STRIPE_PRICE_PRO` | للفوترة | معرّف سعر Pro |
| `STRIPE_PRICE_ENTERPRISE` | للفوترة | معرّف سعر Enterprise |
| `BUILT_IN_FORGE_API_URL` | للـ LLM | بوابة الـ forge |
| `BUILT_IN_FORGE_API_KEY` | للـ LLM | مفتاح الـ forge |
| `NODE_ENV` | تلقائي | `production` على Vercel |

بدون `DATABASE_URL` و `JWT_SECRET` المنصة تعمل بحالة **degraded** (واجهة + health + tRPC بدون بيانات مستمرة).

## المميزات

- إدارة الوكلاء (CRUD) مع فحص ملكية (مضاد IDOR)
- واجهة اختبار تفاعلية وسجلات ReAct
- مفاتيح API آمنة (hash في الخادم + عرض لمرة واحدة)
- اشتراكات Stripe وخطط استخدام
- Workflows متعددة الوكلاء (حفظ في DB؛ محرك التشغيل الكامل قيد التطوير)
- رؤوس أمان HTTP + `/health` موسّع + `system.status`

## المتطلبات

- Node.js 22+
- pnpm 10+
- MySQL / TiDB

## التثبيت المحلي

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
├── api/             # Vercel serverless entry (يُبنى بـ esbuild)
├── client/          # React 19 + Tailwind + tRPC client
├── server/          # Express + tRPC + middleware
├── drizzle/         # Schema + migrations
├── shared/          # أنواع مشتركة
└── .github/workflows/ci.yml
```

تفاصيل أكثر: [ARCHITECTURE.md](./ARCHITECTURE.md) · [SECURITY.md](./SECURITY.md)

## النشر على Vercel

البناء ينتج:
1. واجهة ثابتة في `dist/public` (CDN)
2. حزمة Express كاملة في `api/index.js` (serverless)

```bash
pnpm run build   # vite + esbuild API bundle + server bundle
```

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
- رؤوس أمان على مستوى التطبيق و Vercel

## المصادقة

الوضع الافتراضي يعتمد على **Manus OAuth**. للتشغيل المحلي تحتاج قيم `VITE_APP_ID` و `OAUTH_SERVER_URL` من بيئة Manus، أو توسيع طبقة المصادقة لاحقاً.

## الترخيص

MIT — انظر `package.json`

## المساهمة

[CONTRIBUTING.md](./CONTRIBUTING.md)
