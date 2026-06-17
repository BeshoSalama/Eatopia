# Eatopia - Deep Stabilization Review

هذه النسخة مبنية على آخر Hotfix، وتمت مراجعتها بهدف تقليل الأخطاء التي ظهرت أثناء التشغيل، خصوصًا أخطاء الـ 401، ومشاكل Schema Repair، وإرسال الرسائل في الشات.

## أهم الإصلاحات في هذه النسخة

### 1) إصلاحات الشات والرسائل
- تثبيت إرسال الرسائل بحيث يتم إرسال `IsDeleted = false` صراحة في كل مسارات إنشاء الرسائل.
- إصلاح مسار مشاركة البوست كرسالة، لأنه كان يستطيع إنشاء `ChatMessage` بدون قيم مهمة مثل `IsDeleted` و `DeliveredAt`.
- إصلاح إنشاء محادثات مشاركة البوست بحيث يحترم حالة الـ Message Request ولا ينشئ محادثات وهمية قدر الإمكان.
- إضافة `JoinedAt` في Schema Repair الخاص بـ `ChatParticipants` حتى لا يحدث تعارض مع قواعد البيانات القديمة.

### 2) إصلاحات Schema Repair
- تقليل احتمالات خطأ SQL Server من نوع `Invalid column name` باستخدام Dynamic SQL في الأماكن الحساسة.
- إضافة/تثبيت default constraint لعمود `ChatMessages.IsDeleted` في قواعد البيانات القديمة.
- إنشاء مجلدات `wwwroot/uploads` تلقائيًا قبل تشغيل static files.

### 3) إصلاحات ربط الفرونت بالباك
- إضافة `JsonPropertyName` لعدد من DTOs التي كانت معرضة لمشكلة camelCase/snake_case، مثل:
  - Water
  - Meals
  - Food
  - Diet plans
  - Recipes
  - User preferences
- تعديل رفع صورة البروفايل في الفرونت ليستخدم Upload API ويحفظ URL بدل Base64.

### 4) إصلاحات Auth/Profile
- منع تعارض usernames المولدة من نفس الإيميل أثناء التسجيل.
- عند تغيير الإيميل، لو فشل إرسال رسالة التفعيل يتم إيقاف العملية بدل حفظ إيميل غير قابل للتفعيل.
- الحفاظ على مسار Refresh Token/Session Hotfix السابق.

### 5) تنظيف الفرونت
- إزالة console.log المتبقي.
- التأكد من عدم وجود alert/confirm/prompt داخل ملفات src الأساسية.
- مراجعة imports المحلية داخل React ولم تظهر imports مفقودة في الفحص الثابت.

### 6) تنظيف الداتا الوهمية
- تعديل Seeder حتى لا ينشئ User One/User Two في قاعدة بيانات جديدة.
- يتم إنشاء Admin فقط عند عدم وجود أي مستخدمين.
- ملاحظة: لو قاعدة بياناتك الحالية فيها User One/User Two من نسخة قديمة، لن يتم حذفهم تلقائيًا حمايةً من حذف بيانات حقيقية. يمكن حذفهم يدويًا من Admin Dashboard أو SQL.

## ملاحظات تشغيل مهمة

1. أغلق الباك والفرونت.
2. احذف مجلدات `bin` و `obj` لو Visual Studio ماسك نسخة قديمة.
3. اعمل Clean Solution ثم Rebuild Solution.
4. شغل الباك وانتظر ظهور Swagger بدون Exceptions.
5. شغل الفرونت:

```bash
cd frontend-src
npm install
npm start
```

## سيناريوهات يجب تجربتها بعد التشغيل

- Signup ثم Email Activation.
- Login بعد التفعيل فقط.
- Forgot Password / Reset Password.
- إرسال رسالة text في الشات.
- إرسال image/video/file/voice في الشات.
- Share post to message.
- Message request: Accept / Delete / Block.
- Follow / Unfollow.
- Delete/Edit message.
- Delete/Edit post.
- Upload profile image.
- Delete account.

## حدود المراجعة

تمت مراجعة الملفات والتعديلات static review داخل بيئة لا تحتوي على dotnet، لذلك لم يتم تنفيذ build فعلي للباك هنا. كذلك `npm install` لم يكتمل داخل البيئة، فاختبار الفرونت كان فحصًا ثابتًا للملفات والـ imports وليس تشغيلًا كاملًا.
