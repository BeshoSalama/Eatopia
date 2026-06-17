# Eatopia Deployment Checklist

## قبل النشر
- لا تترك Gmail App Password أو JWT Secret الحقيقي داخل GitHub.
- استخدم User Secrets أو Environment Variables.
- اضبط CORS على دومين الفرونت الحقيقي بدل السماح العشوائي.
- فعّل HTTPS.
- عطّل Swagger في Production أو احمه.
- اضبط حجم الملفات المرفوعة من IIS/Kestrel أيضًا، وليس من الكود فقط.
- اعمل Backup من قاعدة البيانات قبل أي Migration.
- تأكد أن فولدر `wwwroot/uploads` قابل للكتابة على السيرفر.

## متغيرات مهمة

Backend:
```txt
ConnectionStrings__DefaultConnection
Jwt__Key
Email__Username
Email__Password
Email__FromEmail
Authentication__Google__ClientId
Frontend__BaseUrl
```

Frontend:
```txt
REACT_APP_API_BASE_URL
REACT_APP_CHAT_HUB_URL
REACT_APP_GOOGLE_CLIENT_ID
```
