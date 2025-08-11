# TeamPulse Turbo v3.0 - Production Ready

## 🚀 Повноцінна продакшн платформа для аналізу переговорів з AI

**TeamPulse Turbo** - це потужна система аналізу переговорів, яка використовує штучний інтелект для виявлення маніпуляцій, когнітивних викривлень та софізмів у переговорних комунікаціях.

### ✨ Основні можливості

- 🤖 **AI-аналіз переговорів** з використанням GPT-4o
- 📊 **Детекція маніпуляцій** в режимі реального часу
- 🎯 **Персоналізовані рекомендації** на основі профілю клієнта
- 📈 **Барометр складності** переговорів
- 🔐 **Корпоративна безпека** з rate limiting та аудитом
- 📝 **Повне логування** всіх операцій
- 🏗️ **Масштабування** з PM2 та кластеризація

### 🛠️ Технологічний стек

- **Backend**: Node.js, Express.js, SQLite
- **AI**: OpenAI GPT-4o API
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Winston з ротацією логів
- **Validation**: Express-validator
- **Process Management**: PM2
- **Frontend**: Vanilla JS, Server-Sent Events

## 📋 Встановлення та налаштування

### 1. Клонування та встановлення залежностей

```bash
git clone <repository-url>
cd "Teampulse Negotiations"
npm install
```

### 2. Налаштування змінних середовища

Створіть файл `.env` та налаштуйте:

```bash
# OpenAI Configuration (ОБОВ'ЯЗКОВО)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o
OPENAI_TEMPERATURE=0.2

# Token Management
DAILY_TOKEN_LIMIT=512000
MAX_HIGHLIGHTS_PER_1000_WORDS=12

# Security
NODE_ENV=production
SESSION_SECRET=your_super_secure_session_secret_here

# Database
DB_PATH=./data/teampulse_production.db

# Server Configuration  
PORT=3000
HOST=0.0.0.0

# Rate Limiting
API_RATE_LIMIT=100
ANALYSIS_RATE_LIMIT=10

# Performance
CACHE_TTL=300
DB_POOL_SIZE=10
```

### 3. Створення необхідних папок

```bash
mkdir -p data logs
```

## 🚀 Запуск

### Development режим

```bash
npm run dev
```

### Production режим

```bash
# Простий запуск
npm start

# З PM2 (рекомендовано для продакшн)
npm run prod

# Керування PM2
npm run stop      # Зупинити
npm run restart   # Перезапустити
npm run logs      # Показати логи
```

## 🔧 API Endpoints

### Аутентифікація
- `POST /api/login` - Вхід в систему
- `POST /api/logout` - Вихід

### Клієнти
- `GET /api/clients` - Список всіх клієнтів
- `GET /api/clients/:id` - Деталі клієнта
- `POST /api/clients` - Створити клієнта
- `PUT /api/clients/:id` - Оновити клієнта
- `DELETE /api/clients/:id` - Видалити клієнта

### Аналіз
- `POST /api/analyze` - Провести аналіз тексту (SSE stream)
- `GET /api/clients/:id/analysis/:analysisId` - Отримати аналіз
- `DELETE /api/clients/:id/analysis/:analysisId` - Видалити аналіз

### Поради
- `POST /api/advice` - Отримати AI рекомендації

### Системні
- `GET /health` - Стан системи
- `GET /api/usage` - Використання токенів

## 🔒 Безпека

### Реалізовані заходи безпеки:

1. **Helmet.js** - Безпечні HTTP заголовки
2. **CORS** - Контроль доступу між доменами
3. **Rate Limiting** - Захист від DDoS атак
4. **Input Validation** - Валідація всіх вхідних даних
5. **SQL Injection Protection** - Parametrized queries
6. **Security Logging** - Аудит всіх подій безпеки
7. **Content Security Policy** - Захист від XSS
8. **File Upload Validation** - Безпечне завантаження файлів

### Rate Limits:
- API запити: 100/15хв на IP
- Аналіз: 10/годину на IP  
- Логін: 5/15хв на IP

## 📊 Моніторинг та логування

### Структура логів:
- `logs/combined.log` - Всі логи
- `logs/error.log` - Тільки помилки
- `logs/api.log` - API запити

### Метрики продуктивності:
- Час відповіді API
- Використання токенів
- Статистика помилок
- Використання пам'яті

## 🎯 Використання

### 1. Створення клієнта

```javascript
const client = {
  company: "Apple Inc.",
  negotiator: "John Smith",
  sector: "IT",
  goal: "Partnership agreement",
  deal_value: "$1,000,000",
  company_size: "large"
};

fetch('/api/clients', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(client)
});
```

### 2. Аналіз переговорів

```javascript
const formData = new FormData();
formData.append('text', 'Текст переговорів...');
formData.append('client_id', '1');

const eventSource = new EventSource('/api/analyze');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Analysis result:', data);
};
```

## 🏭 Production Deployment

### Системні вимоги:
- Node.js 18+ 
- RAM: мінімум 512MB, рекомендовано 2GB+
- Диск: мінімум 1GB вільного місця
- OS: Linux/macOS/Windows

### Docker деплоймент:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Nginx конфігурація:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📈 Масштабування

### PM2 Cluster Mode:
Система автоматично використовує всі ядра процесора в продакшн режимі.

### Load Balancing:
Можна запустити кілька інстансів з різними портами та використовувати Nginx для балансування навантаження.

## 🧪 Тестування

```bash
# Health Check
curl http://localhost:3000/health

# Load Test
npm run test

# API Test
curl -X POST http://localhost:3000/api/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"janeDVDops","password":"jane2210"}'
```

## 📞 Підтримка

- **Автор**: Kaminskyi AI
- **Версія**: 3.0 Production
- **Ліцензія**: MIT

## 🔄 Оновлення

Для оновлення системи:

```bash
git pull origin main
npm install
npm run restart
```

---

**⚡ TeamPulse Turbo v3.0 - Професійний інструмент аналізу переговорів**

*Система готова до промислового використання та може обробляти тисячі аналізів щодня з гарантованою безпекою та надійністю.*