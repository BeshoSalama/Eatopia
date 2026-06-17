# Eatopia - التحسينات المطبقة في هذه النسخة

## 1) تثبيت مشكلة الصور والملفات بعد إعادة فتح الموقع
- تم تعديل `frontend-src/src/config/api.js` لإضافة:
  - `normalizeStoredMediaUrl`
  - `resolveMediaUrl`
- الآن الرفع يخزن مسار ثابت مثل:
  `/uploads/posts/2026/04/file.png`
  بدل الاعتماد على `http://localhost:3001/...` داخل قاعدة البيانات.
- تم تطبيق العرض الصحيح للصور في:
  - Community Feed
  - Community Profile
  - Chat images/videos/audio/files
  - Profile Page
  - Navbar
  - Settings blocked users list

## 2) تحسين Upload API
- تم تعديل `UploadsController` ليعيد:
  - `relativeUrl`
  - `storedUrl`
  - `absoluteUrl`
- القيمة المناسبة للتخزين هي `relativeUrl` أو `storedUrl`.

## 3) قائمة ثلاث نقط للأكشنز
- تم إضافة قائمة Actions بثلاث نقط في Community Feed بدل عرض أزرار Edit/Delete/Hide/Report/Block مباشرة.
- تم إضافة قائمة Actions بثلاث نقط بجانب الأشخاص في Find People.
- القائمة تحتوي على Follow/Message/View Profile/Block حسب الحالة.

## 4) تحسين تشغيل الباك عند أخطاء قاعدة البيانات
- تم تغليف Schema Repair و Seeder بـ try/catch في `Program.cs` حتى لا يغلق التطبيق فجأة بدون رسالة واضحة.

## 5) تسهيل التطوير عند عدم ضبط Gmail App Password
- تم إضافة إعداد:
  `Email:BypassWhenMissingInDevelopment = true`
- إذا كان Gmail App Password ما زال Placeholder أثناء التطوير، يتم تأكيد الحساب تلقائيًا بدل حذف الحساب وفشل التسجيل.

## ملاحظة تشغيل مهمة
- فولدر `wwwroot/uploads` لازم يفضل موجود عند النقل أو النشر حتى تفضل الصور القديمة ظاهرة.
- عند تشغيل الفرونت على بورت مختلف، غيّر `REACT_APP_API_BASE_URL` في `.env` لو احتجت.


## دفعة تحسينات إضافية

### 1) فصل الشات عن الصداقة الحقيقية
- الصداقة الحقيقية بقيت معناها Mutual Follow فقط.
- المحادثة المقبولة من غير mutual follow تظهر كـ Chat وليس Friend.
- الرسائل المرسلة قبل القبول تظل في Sent Requests عند المرسل وMessage Requests عند المستلم.

### 2) إلغاء Message Request المرسل
- تم تعديل الباك إند بحيث يمكن للمرسل إلغاء الطلب قبل قبوله.
- زر Cancel request ظهر في الشات للطلبات المرسلة.

### 3) تحسين Sidebar الشات
- إضافة badges: Friend / Chat / Incoming request / Request sent.
- إضافة last seen/active now داخل كل conversation item.
- إضافة empty state داخل المحادثة قبل أول رسالة.

### 4) حماية أفضل قبل رفع الملفات
- الفرونت يفحص حجم الملف قبل الرفع بدل انتظار رد السيرفر.
- الحدود الحالية:
  - الصور: 5MB
  - الفيديو: 25MB
  - الصوت: 10MB
  - الملفات: 8MB

### 5) ملاحظة تشغيل
بعد تشغيل الباك، جرب بسيناريو 2 users:
1. User A يعمل Follow لـ User B.
2. User A يرسل رسالة قبل Follow back.
3. الرسالة تظهر عند A في Sent Requests وعند B في Message Requests.
4. User B يقبل الطلب أو يرد، فتتحول لمحادثة Chat.
5. لا يصبحان Friends إلا بعد Mutual Follow.

## إصلاح إضافي لمشكلة صور البوست والوقت

تم تطبيق Patch جديد لمعالجة المشكلتين الظاهرتين في صفحة الـ Community:

1. **الصورة تظهر كـ broken image أو كلمة Post**
   - تم تحسين `normalizeStoredMediaUrl` في الفرونت بحيث يتعامل مع أي رابط قديم محفوظ في قاعدة البيانات مثل:
     - `http://localhost:3001/uploads/...`
     - `http://localhost:5265/uploads/...`
     - `https://localhost:7265/uploads/...`
     - أو حتى مسارات Windows داخل `wwwroot/uploads`
   - أي رابط localhost قديم يتم تحويله تلقائيًا إلى `/uploads/...` ثم يتم عرضه من الـ API الحالي.
   - تم تحسين `Program.cs` ليخدم ملفات `/uploads` من أكثر من مكان محتمل، حتى لو Visual Studio أو dotnet حفظ الملفات داخل runtime folder مختلف بعد إعادة التشغيل.
   - لو ملف قديم غير موجود فعليًا، الواجهة لن تعرض broken image، بل رسالة واضحة بدل كلمة Post.

2. **مشكلة الوقت**
   - تم إضافة helpers في `frontend-src/src/config/api.js` للتعامل مع تواريخ SQL Server/EF Core التي تصل بدون timezone.
   - أي وقت من السيرفر بدون timezone يتم اعتباره UTC ثم يعرض حسب توقيت جهاز المستخدم.
   - تم تطبيق ذلك على وقت البوستات ووقت رسائل الشات.

### ملاحظة اختبار مهمة
لو عندك بوست قديم صورته اتحفظت في قاعدة البيانات لكن ملف الصورة نفسه اتحذف من فولدر `wwwroot/uploads`، لن يمكن استرجاع الصورة تلقائيًا لأنها غير موجودة على الجهاز. الحل وقتها إعادة رفع الصورة. أما لو المشكلة كانت بسبب اختلاف port أو مسار `/uploads` فهذه النسخة تعالجها.

## إصلاح إضافي لمشكلة صور البوست بعد تغيير نسخة المشروع

في النسخة دي تم تغيير تخزين الملفات المرفوعة ليكون في مكان ثابت خارج فولدر المشروع:

```txt
%LOCALAPPDATA%\Eatopia\uploads
```

السبب: لما تفك ZIP جديد في فولدر جديد، قاعدة البيانات القديمة تفضل محتفظة بمسار `/uploads/...` لكن ملف الصورة نفسه كان موجود داخل فولدر النسخة القديمة `wwwroot/uploads`. لذلك الصورة تظهر كمربع خطأ حتى لو الرابط صحيح.

### المطلوب مرة واحدة فقط لو عندك صور قديمة

انسخ محتويات فولدر:

```txt
Eatopia\src\Eatopia.Api\wwwroot\uploads
```

من النسخة القديمة إلى:

```txt
%LOCALAPPDATA%\Eatopia\uploads
```

أو انسخ فولدر `uploads` القديم بالكامل داخل:

```txt
Eatopia\src\Eatopia.Api\wwwroot
```

والباك إند سيحاول نسخها تلقائيًا للمكان الثابت عند التشغيل.

### اختبار سريع

بعد تشغيل الباك، افتح أي رابط صورة من نوع:

```txt
http://localhost:3001/uploads/posts/2026/04/file.png
```

لو ظهرت الصورة مباشرة في المتصفح، يبقى التخزين تمام. لو ظهر 404، يبقى ملف الصورة نفسه غير موجود ولازم تنسخه من النسخة القديمة أو ترفع الصورة مرة أخرى.

تم أيضًا إضافة endpoint تشخيصي:

```txt
GET /api/uploads/check?path=/uploads/posts/2026/04/file.png
```

يرجع لك أماكن البحث وهل الملف موجود فعليًا أم لا.
