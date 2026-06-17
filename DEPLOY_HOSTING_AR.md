# رفع Eatopia على Host

## أفضل اختيار بسيط

ارفع المشروع كـ ASP.NET Core واحد على Windows/IIS أو أي Host يدعم .NET 8.
السكريبت سيبني React ويضعه داخل `wwwroot` ثم يعمل `dotnet publish` للباك.

## قبل الرفع

1. جهز SQL Server database على الاستضافة.
2. جهز Domain مثل `https://your-domain.com`.
3. جهز Python 3 على السيرفر لأن جزء الـ AI يستخدم `ai/eatopia_ai_cli.py`.
4. لا ترفع أسرار حقيقية على GitHub. استخدم Environment Variables في الاستضافة.

## بناء نسخة الرفع

من PowerShell داخل فولدر المشروع:

```powershell
cd "E:\final version"
.\deploy\build-production.ps1 -PublicOrigin "https://your-domain.com"
```

الناتج سيكون هنا:

```text
E:\final version\artifacts\eatopia-hosting\api
E:\final version\artifacts\eatopia-hosting\eatopia-hosting.zip
```

## إعدادات الاستضافة المطلوبة

ضع Environment Variables على السيرفر:

```text
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection=Server=...;Database=Eatopia;User Id=...;Password=...;Encrypt=True;TrustServerCertificate=True;MultipleActiveResultSets=true
Jwt__Key=LONG_RANDOM_SECRET_AT_LEAST_32_CHARS
Jwt__Issuer=Eatopia
Jwt__Audience=EatopiaUsers
Frontend__BaseUrl=https://your-domain.com
Cors__AllowedOrigins__0=https://your-domain.com
Authentication__Google__ClientId=YOUR_GOOGLE_CLIENT_ID
Email__Username=YOUR_EMAIL
Email__Password=YOUR_EMAIL_APP_PASSWORD
Email__FromEmail=YOUR_EMAIL
MediaStorage__UploadsRoot=C:\Eatopia\uploads
AI__RootPath=.\ai
AI__PythonExecutable=python
```

لو قاعدة البيانات جديدة ومفيهاش Owner، فعل ده لأول تشغيل فقط:

```text
Seed__Owner__Enabled=true
Seed__Owner__Email=fadynour194@gmail.com
Seed__Owner__Password=STRONG_FIRST_PASSWORD
Seed__Owner__Username=fadynour194
Seed__Owner__Name=Fady Nour
```

بعد أول Login ناجح للـ Owner، خليه:

```text
Seed__Owner__Enabled=false
```

## على IIS

1. ثبت .NET 8 Hosting Bundle على السيرفر.
2. اعمل Website أو Application جديد.
3. اجعل Physical Path هو فولدر:

```text
artifacts\eatopia-hosting\api
```

4. اجعل Application Pool: `No Managed Code`.
5. اضف Environment Variables من IIS Configuration Editor أو من لوحة الاستضافة.
6. افتح الموقع وتأكد أن:

```text
https://your-domain.com
https://your-domain.com/api/auth/login
https://your-domain.com/hubs/chat
```

## لو هتفصل الفرونت عن الباك

1. ارفع `frontend-src/build` على Netlify/Vercel/Static host.
2. ارفع الباك منفصل على Host يدعم .NET 8.
3. في بناء الفرونت استخدم:

```text
REACT_APP_API_BASE_URL=https://api.your-domain.com/api
REACT_APP_CHAT_HUB_URL=https://api.your-domain.com/hubs/chat
```

4. في الباك اضبط:

```text
Frontend__BaseUrl=https://your-frontend-domain.com
Cors__AllowedOrigins__0=https://your-frontend-domain.com
```

## ملاحظات مهمة

- أول تشغيل سيعمل migrations وschema repair تلقائيا.
- حساب الـ Owner في Production اختياري من `Seed__Owner__...`، فعله لأول تشغيل فقط ثم اقفله.
- حافظ على فولدر `MediaStorage__UploadsRoot` خارج فولدر النشر حتى لا تضيع الصور عند تحديث الموقع.
- لو AI لا يعمل على السيرفر، تأكد أن Python موجود وأن `AI__RootPath` يشير لفولدر `ai`.
