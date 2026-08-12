# إعداد قاعدة بيانات MySQL للمنصة

المشروع يستخدم **MySQL** عبر Drizzle ORM. على Vercel (serverless) الأنسب:

| الخيار | مجاني؟ | مناسب لـ Vercel |
|--------|--------|------------------|
| **TiDB Cloud Serverless** | نعم (~25GB) | ممتاز (MySQL protocol) |
| **Aiven Free MySQL** | نعم (1GB) | جيد |
| MySQL محلي / VPS | حسبك | يحتاج IP عام + SSL |

---

## الطريقة الموصى بها: TiDB Cloud (مجاني)

### 1) إنشاء الحساب والـ Cluster

1. ادخل: https://tidbcloud.com  → **Start Free**
2. أنشئ **Serverless** cluster (بدون بطاقة إن أمكن)
3. اختر منطقة قريبة (مثل `US East` لأن Vercel على `iad1`)
4. بعد الجاهزية: **Connect** → انسخ connection string بصيغة MySQL

مثال الشكل:

```text
mysql://username:password@gateway01.region.prod.aws.tidbcloud.com:4000/test?ssl={"rejectUnauthorized":true}
```

أو:

```text
mysql://username:password@host:4000/agentic_ai
```

> أنشئ قاعدة باسم `agentic_ai` من واجهة TiDB إن لم تكن موجودة:
> `CREATE DATABASE agentic_ai;`

### 2) إنشاء الجداول

من **SQL Editor** في TiDB (أو أي عميل MySQL):

1. افتح الملف في المستودع: [`scripts/schema.sql`](../scripts/schema.sql)
2. نفّذ محتواه كاملاً على قاعدة `agentic_ai`

بديل محلي بعد وضع `DATABASE_URL` في `.env`:

```bash
pnpm db:push
# أو
mysql -h HOST -P 4000 -u USER -p agentic_ai < scripts/schema.sql
```

### 3) ربط Vercel

1. افتح مشروع Vercel: `repository-name-my-ai-platform`
2. **Settings → Environment Variables**
3. أضف (Production + Preview):

| Name | Value |
|------|--------|
| `DATABASE_URL` | رابط الاتصال من TiDB |
| `JWT_SECRET` | سلسلة عشوائية طويلة (مثلاً 32+ حرف) |

توليد سر سريع:

```bash
openssl rand -hex 32
```

4. **Deployments → … على آخر نشر → Redeploy**
   (أو ادفع أي commit فارغ لإعادة البناء)

### 4) التحقق

```bash
curl -s https://repository-name-my-ai-platform.vercel.app/health
```

المتوقع بعد الربط الصحيح:

```json
{
  "status": "ok",
  "env": {
    "database": true,
    "jwt": true,
    "oauth": false,
    "stripe": false,
    "forge": false
  }
}
```

---

## بديل: Aiven Free MySQL

1. https://aiven.io/free-tier → Free MySQL
2. انسخ Service URI / connection string
3. نفّذ `scripts/schema.sql`
4. ضع `DATABASE_URL` و `JWT_SECRET` في Vercel ثم Redeploy

---

## ملاحظات أمان

- لا ترفع `.env` أو كلمات المرور إلى GitHub
- استخدم SSL مع السحابة (`ssl` في الرابط حسب مزود الخدمة)
- `JWT_SECRET` مختلف بين التطوير والإنتاج

## جداول المنصة

`users` · `agents` · `agentExecutions` · `apiKeys` · `subscriptions` · `usageTracking` · `workflows` · `workflowExecutions` · `notifications`
