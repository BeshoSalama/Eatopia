# تقرير اختبار عميق لمشروع Eatopia

التاريخ: 2026-05-01  
المسار: `E:\final version`  
البيئة: Windows + PowerShell، Backend على `http://127.0.0.1:3001`، Frontend على `http://localhost:3000`

## الحكم المختصر

المشروع شغال في أغلب التدفقات الأساسية، لكن **غير جاهز للرفع Production قبل إصلاح 4 نقاط أساسية**:

1. جزء AI Scan يصنف صور غير الطعام كأنها طعام عند سقوط الموديل.
2. اختبار Frontend الآلي واقع.
3. يوجد vulnerabilities عالية في npm و NuGet.
4. Backend يسمح باستدعاء Diet Plan بدون تسجيل دخول رغم أن الفرونت يمنعه.

## ما تم اختباره ونجح

- Backend Release build نجح: `dotnet build Eatopia.sln -c Release`.
- Frontend production build نجح: `npm run build`.
- ملف AI الرئيسي يعمل compile بدون syntax errors: `python -m py_compile ai\eatopia_ai_cli.py`.
- تشغيل السيرفرات محليا نجح:
  - API على `3001`.
  - React على `3000`.
- Swagger يعمل: `/swagger/v1/swagger.json`.
- Recipes API يعمل: `/api/recipes?page=1&pageSize=5`.
- Signup/Login/Profile/Notifications/Meals اشتغلوا مع مستخدم QA مؤقت، وتم حذف المستخدم بعد الاختبار.
- منع المستخدم العادي من Admin API يعمل: `/api/admin/stats` رجع `403`.
- صفحة Diet Plan محمية في الفرونت: الدخول على `/dietplan` بدون login يحول إلى `/login?returnUrl=%2Fdietplan`.
- توليد Diet Plan بعد login نجح، وظهر:
  - `Generated weekly plan`
  - زر `Download PDF`
  - targets للكالوري والبروتين والكارب والدهون.
- ربط Diet Plan بصفحة Recipes يعمل: `View recipe` فتح وصفة مع `grams` و `targetCalories` و macros من الخطة.
- تغيير الجرامات في صفحة الوصفات يغير القيم مباشرة:
  - 100g: `520 kcal / 16g protein / 88g carbs / 12g fats`
  - 50g: `260 kcal / 8g protein / 44g carbs / 6g fats`
- API حفظ وجبة بجرامات مختلفة يحسب macros صح:
  - 50g من وصفة 330 kcal/100g رجعت `165 kcal`, `9g protein`, `23g carbs`, `4g fat`.
- رفع ملف صوت `audio/webm` عبر `/api/uploads` نجح ورجع URL صالح. تم حذف ملف الاختبار بعده.
- إشعار Follow يعمل باسم الشخص ورابط بروفايله:
  - `qanactor... followed you`
  - `action_url: /communityProfile?userId=...`
- إشعار Message Request يعمل باسم الشخص ورابط بروفايله:
  - `qam2actor... sent a message request`
  - `action_url: /communityProfile?userId=...`
- بيانات الإشعار تحتوي `actor`، وبالتالي الفرونت يقدر يعرض الاسم والصورة لو المستخدم عنده صورة.
- وصفات Egyptian seed سليمة من ناحية التكرار:
  - 126 وصفة.
  - لا يوجد duplicate titles.
  - لا يوجد duplicate image paths.
  - لا يوجد صور ناقصة في `frontend-src\public\images\recipes\egyptian`.

## مشاكل حرجة / عالية

### 1. AI Scan يعطي نتيجة طعام لصورة غير طعام

الاختبار على صورة طعام وصورة غير طعام رجع نفس النوع تقريبا:

- `isFood: true`
- `foodName: Balanced Meal Plate`
- `source: image-fallback`
- `modelError: No module named 'torchvision'`

المشكلة أن الموديل الحقيقي لا يعمل لأن `torchvision` غير موجود، ثم fallback يصنف الصورة كطعام دائما تقريبا.

الأماكن المرتبطة:

- `ai\eatopia_ai_cli.py:945` يرجع `isFood: True` داخل fallback.
- `ai\eatopia_ai_cli.py:951` يضع `source: image-fallback`.
- `ai\eatopia_ai_cli.py:989` يعتمد على `torchvision`.
- `ai\eatopia_ai_cli.py:1070` يضيف `modelError` بعد سقوط الموديل.

الأثر: المستخدم يرفع صورة شعار أو بوستر أو أي صورة غير أكل، والتطبيق يطلع تحليل أكل. دي نفس المشكلة اللي ظهرت في الصورة اللي أرسلتها.

الإصلاح المقترح: تثبيت dependencies الخاصة بالموديل، ثم جعل fallback يرفض الصور غير المؤكدة بدلا من إرجاع `isFood: true`. لازم fallback يرجع `isFood: false` عند confidence منخفض أو عند فشل الموديل.

### 2. Test suite للفرونت واقع

الأمر `npx react-scripts test --watchAll=false --runInBand` فشل.

الفشل:

- الملف: `frontend-src\src\CommunityPages\CommunityPages.test.js:105`
- السبب: `screen.getByText("New like")` وجد أكثر من عنصر بنفس النص.

الأثر: CI/CD أو أي رفع فيه اختبار تلقائي سيقف.

الإصلاح المقترح: استخدام query أدق مثل `getAllByText` أو تحديد role/selector للعنوان المطلوب.

### 3. Vulnerabilities في dependencies

نتيجة `npm audit --omit=dev --audit-level=moderate`:

- 28 vulnerabilities:
  - 9 low
  - 5 moderate
  - 14 high

أمثلة مهمة:

- `nth-check` high عبر سلسلة `react-scripts` / `svgo`.
- `serialize-javascript` high.
- `underscore` high.
- `postcss` moderate.
- `uuid` moderate.

نتيجة `dotnet list package --vulnerable --include-transitive` أظهرت حزم transitive متأثرة، منها:

- `Microsoft.Extensions.Caching.Memory 8.0.0` high.
- `System.Text.Json 8.0.4` high.
- `System.Formats.Asn1 5.0.0` high.
- `Azure.Identity 1.10.3` moderate.
- `Microsoft.Identity.Client 4.56.0` low/moderate.

الأثر: غير مناسب للرفع قبل تحديث الحزم أو قبول المخاطر بشكل واعي.

### 4. Diet Plan محمي في الفرونت فقط، وليس في الباك

الفرونت يمنع `/dietplan` بدون login، وهذا نجح. لكن Controller نفسه عليه `[AllowAnonymous]`:

- `Eatopia\src\Eatopia.Api\Controllers\AiController.cs:12`
- endpoint: `POST /api/ai/diet-plan`

الأثر: أي شخص يقدر يستدعي API مباشرة بدون login.

الإصلاح المقترح: إزالة `[AllowAnonymous]` من controller أو وضع `[Authorize]` على `GenerateDietPlan` فقط، مع ترك scan حسب قرارك.

## مشاكل متوسطة

### 5. SignalR يظهر console errors أثناء التنقل

أثناء فتح Community/Diet Plan ظهر في Console:

- `Failed to start the connection`
- `The connection was stopped during negotiation`

الـ negotiate endpoint نفسه رجع `200` عند اختباره، فالمشكلة غالبا race condition أثناء route changes أو unmount.

الملف المرتبط:

- `frontend-src\src\CommunityPages\CommunityContext.js:278`
- `frontend-src\src\CommunityPages\CommunityContext.js:315`

الإصلاح المقترح: حماية start/stop بحالة mounted/ref، وعدم تشغيل connection جديد قبل إيقاف القديم، وتقليل logging للمستخدم.

### 6. اختبار Admin Dashboard الكامل غير مكتمل بسبب بيانات الدخول

جربت الدخول بـ `fadynour194@gmail.com` مع كلمة مرور seed الافتراضية `Admin12345` ورجع `401`.

تم التأكد من:

- المستخدم العادي لا يدخل admin API ويرجع `403`.
- كود حذف/إضافة/تعديل الوصفات موجود ومربوط بـ endpoints محمية بـ Elevated roles.

لكن لم أقدر أعمل E2E كامل كـ Owner/Admin بدون كلمة مرور صحيحة للأونر الحالي.

### 7. بعض صور الوصفات كبيرة جدا

أكبر صور في Egyptian recipes:

- `hawawshi.jpg` حوالي 5.8MB.
- `besara.jpg` حوالي 5.0MB.

الأثر: بطء تحميل صفحة الوصفات خصوصا على الموبايل.

الإصلاح المقترح: ضغط الصور إلى WebP/JPG بحجم أقل من 300-500KB للصورة الواحدة.

### 8. API contract للـ Diet Plan حساس للأسماء

عند إرسال `weightKg` و `heightCm` مباشرة إلى `/api/ai/diet-plan` رجع 400، بينما `weight` و `height` نجحوا.

هذا ليس عيب فرونت حاليا، لكنه مهم للتوثيق أو Postman collection.

## ملاحظات إيجابية مهمة

- تم حذف native browser prompts/alerts من Admin actions، واستخدام dialogs داخل التطبيق موجود.
- Admin recipe delete/edit موجود في:
  - `frontend-src\src\AdminPage\AdminDashboardPage.js:281`
  - `frontend-src\src\AdminPage\AdminDashboardPage.js:290`
  - `frontend-src\src\RecipesPage\RecipesPage.js:2018`
- Backend يحمي recipe create/update/delete:
  - `Eatopia\src\Eatopia.Api\Controllers\RecipesController.cs:45`
  - `Eatopia\src\Eatopia.Api\Controllers\RecipesController.cs:54`
  - `Eatopia\src\Eatopia.Api\Controllers\RecipesController.cs:61`
- Voice upload مدعوم Backend/Frontend:
  - `frontend-src\src\CommunityPages\CommunityChatPage.js:260`
  - `frontend-src\src\CommunityPages\CommunityChatPage.js:287`
  - `Eatopia\src\Eatopia.Api\Controllers\UploadsController.cs:17`
  - `Eatopia\src\Eatopia.Infrastructure\Services\ChatService.cs:591`
- Notification actor/action URL logic موجود ويعمل:
  - `Eatopia\src\Eatopia.Infrastructure\Services\CommunityService.cs:134`
  - `Eatopia\src\Eatopia.Infrastructure\Services\ChatService.cs:196`
  - `frontend-src\src\components\Navbar.js:214`
  - `frontend-src\src\CommunityPages\CommunityNotificationsCard.js:85`

## أولوية الإصلاح قبل الرفع

1. إصلاح AI Scan: تثبيت `torchvision` أو تعطيل fallback الخاطئ وإرجاع `Not a food image`.
2. تحديث/معالجة vulnerabilities.
3. إصلاح test الفاشل في `CommunityPages.test.js`.
4. إضافة `[Authorize]` للـ Diet Plan API.
5. إعادة اختبار Owner/Admin بعد ضبط كلمة مرور الأونر.
6. تقليل SignalR console errors.
7. ضغط الصور الثقيلة.
8. تشغيل E2E كامل بصلاحية Owner بعد توفر credential صحيح.

## أوامر مهمة تم تشغيلها

```powershell
dotnet build "E:\final version\Eatopia\Eatopia.sln" -c Release -v minimal
npm run build
npx react-scripts test --watchAll=false --runInBand
npm audit --omit=dev --audit-level=moderate
dotnet list "E:\final version\Eatopia\Eatopia.sln" package --vulnerable --include-transitive
python -m py_compile "E:\final version\ai\eatopia_ai_cli.py"
```

## حالة بيانات الاختبار

- تم إنشاء مستخدمين QA مؤقتين لاختبار login/meals/notifications.
- تم حذف مستخدمي QA المؤقتين بعد الاختبارات.
- تم رفع ملف صوت صغير لاختبار upload، ثم تم حذفه من `C:\Users\fadyn\AppData\Local\Eatopia\uploads`.

