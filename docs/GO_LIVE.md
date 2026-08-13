# تشغيل المنصة كلياً (Go Live Checklist)

## وضع Demo — بدون أي إعداد (يعمل الآن)

المنصة تحتوي على **مزود Demo مدمج** يعمل تلقائياً عندما لا توجد مفاتيح LLM.

| الميزة | الحالة بدون مفاتيح |
|--------|---------------------|
| الواجهة على Vercel | ✅ |
| `/health` و `system.status` | ✅ (`status: "demo"`) |
| `POST /api/ag-ui/run` | ✅ ردود Demo فورية |
| `POST /api/ag-ui` (SSE) | ✅ |
| صفحة اختبار الوكيل | ✅ |
| حفظ مستخدمين/وكلاء في DB | ❌ يحتاج `DATABASE_URL` |
| نماذج LLM حقيقية | ❌ يحتاج مفتاح واحد |

اختبار فوري (بدون أي متغيرات):

```bash
curl -s -X POST https://repository-name-my-ai-platform.vercel.app/api/ag-ui/run \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"قل مرحبا بالعربية"}]}'
```

المتوقع: `{"ok":true,"output":"...","provider":"demo",...}`

بعد نشر آخر commits (Demo provider) قد تحتاج Vercel دقيقة لإعادة البناء التلقائي من `main`.

---

## ترقية إلى LLM حقيقي (اختياري — تدخل بسيط منك)

في Vercel → Settings → Environment Variables → Production:

| المتغير | مصدر مجاني |
|---------|-------------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| أو `GROQ_API_KEY` | console.groq.com |
| أو `OPENROUTER_API_KEY` | openrouter.ai |

ثم **Redeploy**. المزود الحقيقي يُفضَّل تلقائياً؛ Demo يبقى كـ fallback.

---

## ترقية للحفظ + لوحة التحكم

| المتغير | كيف |
|---------|-----|
| `DATABASE_URL` | TiDB Cloud Serverless أو Aiven MySQL — نفّذ `scripts/schema.sql` |
| `JWT_SECRET` | `openssl rand -hex 32` |

دليل: [DATABASE_SETUP.md](./DATABASE_SETUP.md)

---

## المصادقة والفوترة (لاحقاً)

- OAuth: `OAUTH_SERVER_URL` · `VITE_APP_ID` · `OWNER_OPEN_ID`
- Stripe: `STRIPE_SECRET_KEY` · webhooks · price ids

---

## روابط

- الإنتاج: https://repository-name-my-ai-platform.vercel.app
- الصحة: https://repository-name-my-ai-platform.vercel.app/health
- AG-UI: [AG_UI.md](./AG_UI.md)
