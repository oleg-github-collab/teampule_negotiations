# 🚂 Railway Deployment Guide

## Кроки для деплойменту на Railway:

### 1. Налаштування змінних середовища в Railway Dashboard:
```
NODE_ENV=production
OPENAI_API_KEY=your_actual_openai_key_here
OPENAI_MODEL=gpt-4o
DAILY_TOKEN_LIMIT=512000
SESSION_SECRET=your_secure_session_secret
```

### 2. Перевірте, що файли готові:
- ✅ `railway.toml` - конфігурація Railway
- ✅ `Procfile` - команда запуску
- ✅ `package.json` - з правильним start script
- ✅ `.railwayignore` - виключення тестових файлів

### 3. Деплой команди:
```bash
# Локально перевіряємо що все працює
npm start

# Деплоймо на Railway
railway login
railway link
railway up
```

### 4. Після деплойменту перевіряємо:
```
https://your-app.railway.app/ready
https://your-app.railway.app/ping
https://your-app.railway.app/health
```

### 5. Якщо щось не працює, перевіряємо логи:
```bash
railway logs
```

## Важливі зміни для Railway:

1. **Спрощений health check** - `/ready` тепер не залежить від бази даних
2. **Правильний PORT handling** - Railway автоматично встановлює PORT
3. **Production налаштування** - всі тестові файли виключені
4. **Мінімальні залежності** - тільки production dependencies

## URL после деплойменту:
Railway надасть URL типу: `https://teampulse-turbo-production-xxxx.railway.app`