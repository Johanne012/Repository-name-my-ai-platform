# تشغيل المنصة كلياً (Go Live Checklist)

الحالة الحالية على الإنتاج غالباً **degraded** حتى تُضبط المتغيرات التالية.

## ما يعمل الآن بدون إعداد

- الواجهة الثابتة على Vercel
- `/health` و `system.status`
- مسارات AG-UI: `POST /api/ag-ui` و `POST /api/ag-ui/run`
- واجهة اختبار الوكيل مربوطة بالمحرك الحقيقي (وليست mock)

## الحد الأدنى لتشغيل LLM فعلياً

في Vercel → Project → Settings → Environment Variables → **Production**:

| المتغير | مثال | لماذا |
|---------|------|--------|
| `GEMINI_API_KEY` | من [Google AI Studio](https://aistudio.google.com/apikey) | أبسط مزود مجاني قوي |
| أو `GROQ_API_KEY` | من console.groq.com | سرعة عالية |
| أو `OPENROUTER_API_KEY` | من openrouter.ai | تنوع نماذج |

ثم **Redeploy**.

اختبار فوري:

```bash
curl -s -X POST https://repository-name-my-ai-platform.vercel.app/api/ag-ui/run \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"قل مرحبا بالعربية"}]}'
```

المتوقع: `{"ok":true,"output":"...","provider":"gemini",...}`

## الحد الأدنى للوحة التحكم + حفظ الوكلاء

| المتغير | كيف |
|---------|-----|
| `DATABASE_URL` | TiDB Cloud Serverless أو Aiven MySQL — نفّذ `scripts/schema.sql` |
| `JWT_SECRET` | `openssl rand -hex 32` |

دليل مفصل: [DATABASE_SETUP.md](./DATABASE_SETUP.md)

بعدها `/health` يجب أن يعيد `"status":"ok"` و `"database":true` و `"jwt":true`.

## المصادقة (اختياري للبداية)

المنصة مصممة لـ Manus OAuth:

- `OAUTH_SERVER_URL`
- `VITE_APP_ID`
- `OWNER_OPEN_ID` (أدمن)

بدونها: مسارات `protected` (قائمة الوكلاء، API keys) لن تعمل لمستخدم مسجّل، لكن **دردشة AG-UI العامة** تعمل إذا وُجد مفتاح LLM.

## الفوترة (اختياري)

`STRIPE_SECRET_KEY` · `STRIPE_WEBHOOK_SECRET` · `STRIPE_PRICE_PRO` · `STRIPE_PRICE_ENTERPRISE`

## ترتيب مقترح

1. أضف `GEMINI_API_KEY` → Redeploy → اختبر `/api/ag-ui/run`
2. أنشئ TiDB + نفّذ schema → أضف `DATABASE_URL` + `JWT_SECRET` → Redeploy
3. افتح لوحة التحكم وأنشئ وكيلاً وجرّب صفحة اختبار الوكيل
4. لاحقاً: OAuth و Stripe و Channels SDK (Slack)

## روابط

- الإنتاج: https://repository-name-my-ai-platform.vercel.app
- الصحة: https://repository-name-my-ai-platform.vercel.app/health
- AG-UI: [AG_UI.md](./AG_UI.md)
