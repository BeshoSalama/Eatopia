# Eatopia - Privacy / Notifications / Profile Photo Sync Update

هذه النسخة مبنية على آخر نسخة Deep Stabilization، وتركز على تحسينات الخصوصية، الإشعارات، وربط صورة البروفايل الشخصي ببروفايل الكميونتي.

## ما تم إضافته

### 1) Privacy Settings حقيقية
تم إضافة إعدادات خصوصية محفوظة في قاعدة البيانات لكل مستخدم:

- Profile Visibility: Public / Friends / Private
- Posts Visibility: Public / Friends / Private
- Show Online Status
- Show Last Seen
- Allow Message Requests
- Allow Search By Email

المسار الجديد في الباك:

- `GET /api/profile/privacy-settings`
- `PUT /api/profile/privacy-settings`

### 2) التحكم في الإشعارات بزرار On / Off
في صفحة `/settings` تم إضافة Switches احترافية للتحكم في:

- All Notifications
- Community Notifications
- Message Notifications
- Email Notifications

لو المستخدم قفل All Notifications:

- قائمة الإشعارات ترجع فاضية.
- عداد unread يرجع 0.
- الباك يتجنب إنشاء إشعارات جديدة للمستخدم حسب الإعدادات.

### 3) صورة البروفايل الشخصي = صورة بروفايل الكميونتي
صورة البروفايل الآن تُحفظ في `ProfileImageUrl` في جدول `Users`، ويتم استخدامها في:

- صفحة Profile الشخصية.
- Community Home.
- Community Profile.
- Chat users.
- Comments / Posts.

كذلك تم الحفاظ على `id` داخل `eatopiaUser` في localStorage بعد تعديل البروفايل حتى لا يحصل فقدان لمعرف المستخدم في الكميونتي.

### 4) تنظيم رفع الملفات
تم تعديل upload endpoint لدعم purpose:

- `profile` => `uploads/profiles/...`
- `post` => `uploads/posts/...`
- `chat` => `uploads/chat/...`

والفرونت بقى يرسل purpose المناسب عند رفع صورة البروفايل أو صورة بوست أو ميديا شات.

### 5) Privacy Logic في الباك
تم ربط الإعدادات باللوجيك:

- البروفايل private يمنع غير صاحبه من فتحه.
- friends-only يسمح فقط للأصدقاء mutual follow.
- بوستات private لا تظهر إلا لصاحبها.
- بوستات friends-only تظهر للأصدقاء فقط.
- إغلاق Allow Message Requests يمنع غير الأصدقاء من بدء request جديد.
- إغلاق Allow Search By Email يمنع ظهور المستخدم من البحث بالإيميل.
- إغلاق Show Online / Last Seen يخفي حالة النشاط والآخر ظهور.

## مهم بعد فك الضغط

1. اقفل الباك والفرونت.
2. احذف `bin` و `obj` لو Visual Studio ماسك build قديم.
3. اعمل Clean Solution ثم Rebuild Solution.
4. شغل الباك الأول.
5. شغل الفرونت:

```bash
cd frontend-src
npm install
npm start
```

## ملاحظات اختبار مهمة

جرّب الآتي:

1. افتح `/settings` وعدل switches.
2. اقفل All Notifications وتأكد أن عداد الإشعارات لا يظهر إشعارات جديدة.
3. اجعل Profile Visibility = Private وجرب تدخل عليه من حساب آخر.
4. اجعل Posts Visibility = Friends وجرب ظهور البوستات لصديق وغير صديق.
5. اقفل Allow Message Requests وجرب حساب غير صديق يفتح شات معك.
6. غير صورة البروفايل من صفحة Profile ثم افتح Community وتأكد أن نفس الصورة ظهرت.
