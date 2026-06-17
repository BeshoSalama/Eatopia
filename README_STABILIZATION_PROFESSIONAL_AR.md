# Eatopia - Stabilization Professional Release

هذه النسخة مخصصة لتثبيت المشروع وتقليل الباجات قبل إضافة Features جديدة. تم العمل على الباك والفرونت معًا، مع تنظيف ملفات التسليم القديمة والمكررة.

## أهم التعديلات

### 1) Stabilization عام
- مراجعة ربط الـ APIs الأساسية بالفرونت.
- توحيد سلوك رسائل النجاح والخطأ في Community/Chat/Auth قدر الإمكان.
- إزالة استخدام `alert / confirm / prompt` من صفحات Community الأساسية واستبدالها بـ Dialogs من الفرونت.
- تقليل مشاكل رعشة الشات والتنقل الخاطئ عند فتح Message Requests.
- استمرار إصلاح Schema Repair الخاص بتفعيل الإيميل حتى لا يظهر خطأ `Invalid column name EmailConfirmationTokenHash`.

### 2) Message Requests
- إضافة منطق واضح للـ Request Status داخل `ChatThread`:
  - `Pending`
  - `Accepted`
  - `Deleted`
  - `Blocked`
- إضافة أزرار في الشات:
  - Accept
  - Delete Request
  - Block
- عند قبول الطلب ينتقل من Message Requests إلى Chats.
- عند حذف الطلب يختفي من الطلبات.
- عند Block لا يستطيع الطرف الآخر مراسلتك أو الظهور لك في البحث.

### 3) الرسائل
- تعديل الرسائل النصية التي أرسلتها.
- حذف الرسائل أصبح Soft Delete ويظهر مكانها: `This message was deleted`.
- إضافة Seen/Delivered metadata في الباك.
- إضافة Typing Indicator عن طريق SignalR.
- إضافة Unread Count لكل محادثة.
- الرسائل المعدلة يظهر بجانبها `edited`.

### 4) Community Safety
- Block User.
- Report Post.
- Report Comment.
- Report Message.
- Hide Post.
- منع ظهور المستخدمين المحظورين في البحث والبوستات والبروفايلات.

### 5) Notifications
تم توسيع الإشعارات لتشمل:
- Follow.
- Follow back / friendship.
- Like على بوست.
- Comment على بوست.
- Message Request.
- Message Request Accepted.
- رسائل جديدة.

### 6) Account Security
- Password strength في الفرونت والباك.
- منع login قبل تفعيل الإيميل.
- Login lockout بعد محاولات فاشلة كثيرة.
- Refresh Tokens.
- Logout all devices.
- عند حذف الحساب يجب إدخال الباسورد وكتابة:
  `DELETE MY ACCOUNT`
- عند تغيير الإيميل يتم جعله غير مفعل وإرسال Activation جديد.

### 7) Settings Page
تمت إضافة صفحة:

```txt
/settings
```

وتحتوي على:
- Privacy rules.
- Notification settings placeholders.
- Manage blocked users.
- Unblock user.

### 8) Admin Dashboard
تمت إضافة صفحة:

```txt
/admin
```

وتحتاج أن يكون المستخدم Role = Admin.

الـ Dashboard تعرض:
- Stats.
- Users.
- Reports.
- تحديث حالة البلاغ.
- حذف بوست أو كومنت مخالف.

لتجربة Admin محليًا يمكنك تعديل المستخدم في قاعدة البيانات:

```sql
UPDATE Users SET Role = 'Admin' WHERE Email = 'your-email@example.com';
```

### 9) Performance / Upload Protection
- Pagination للبوستات والرسائل.
- `AsNoTracking()` في استعلامات قراءة متعددة.
- Indexes إضافية في Schema Repair للجداول الجديدة والمحادثات.
- منع رفع ملفات خطيرة.
- تحديد أحجام الملفات حسب النوع:
  - Image: 5 MB
  - Video: 25 MB
  - Audio: 10 MB
  - Documents: 8 MB
- منع إرسال Base64 في الشات؛ لازم ترفع الملف أولًا ثم ترسل URL.

## طريقة التشغيل

### Backend
1. افتح:

```txt
Eatopia/Eatopia.sln
```

2. تأكد من إعدادات الاتصال في:

```txt
Eatopia/src/Eatopia.Api/appsettings.json
```

3. تأكد من إعدادات الإيميل:

```json
"Email": {
  "Username": "yourgmail@gmail.com",
  "Password": "GMAIL_APP_PASSWORD",
  "FromEmail": "yourgmail@gmail.com"
}
```

4. من Visual Studio:

```txt
Clean Solution
Rebuild Solution
Run Eatopia.Api
```

### Frontend
من داخل فولدر:

```txt
frontend-src
```

شغل:

```bash
npm install
npm start
```

## سيناريوهات لازم تجربها بعد التشغيل

- Signup ثم فتح activation link من الإيميل.
- Login قبل التفعيل يجب أن يترفض.
- Login بعد التفعيل يجب أن يعمل.
- Forgot Password ثم Reset Password.
- Follow / Unfollow.
- Send Message Request لشخص غير Friend.
- Accept / Delete / Block للـ Message Request.
- إرسال صورة/فيديو/ملف/voice note في الشات.
- Edit/Delete للرسائل.
- Delete Post / Hide / Report.
- Delete Account بعد إدخال password و `DELETE MY ACCOUNT`.
- Settings page و Admin Dashboard.

## ملاحظات مهمة

- لو ظهر خطأ Migration قديم، امسح `bin` و `obj` ثم Rebuild.
- لو قاعدة البيانات عندك قديمة جدًا، Schema Repair سيحاول إضافة الأعمدة والجداول الناقصة تلقائيًا عند تشغيل الباك.
- يفضل أخذ Backup من قاعدة البيانات قبل تجربة نسخة كبيرة كهذه.
