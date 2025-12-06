# 🚀 Міграція на PostgreSQL + Railway

## Кроки міграції

### 1. Встановлення PostgreSQL на Railway

```bash
# У Railway Dashboard:
# 1. Створіть новий проект
# 2. Додайте PostgreSQL database
# 3. Скопіюйте DATABASE_URL з налаштувань
```

### 2. Налаштування змінних середовища

Додайте до `.env`:
```env
DATABASE_URL=postgresql://user:password@host:5432/railway
NODE_ENV=production
OPENAI_API_KEY=your_key_here
DAILY_TOKEN_LIMIT=512000
```

### 3. Міграція даних з SQLite

```bash
# Запустіть міграцію (якщо у вас є дані в SQLite)
node migrate-to-postgres.js
```

### 4. Відмінності між SQLite та PostgreSQL

#### Параметри запитів
- SQLite: `?` → PostgreSQL: `$1, $2, $3...`
- Всі запити тепер async/await

#### JSON запити
```javascript
// SQLite
json_extract(column, '$.field')

// PostgreSQL
column->>'field'           // Отримати як текст
column->'field'            // Отримати як JSON
CAST(column->>'field' AS NUMERIC)  // Конвертація типів
```

#### Дати
```javascript
// SQLite
datetime(column)
CURRENT_TIMESTAMP

// PostgreSQL
column::timestamp
NOW()
CURRENT_TIMESTAMP  // Працює в обох
```

#### Auto-increment
```javascript
// SQLite
AUTOINCREMENT

// PostgreSQL
SERIAL PRIMARY KEY  // автоматично створює sequence
```

### 5. Основні зміни в коді

#### server.js
- ✅ Змінено import: `./utils/db.js` → `./utils/db-postgres.js`
- ✅ Додано async/await для всіх DB запитів
- ✅ Додано ініціалізацію DB при старті
- ✅ Додано graceful shutdown для connection pool

#### routes/clients.js
- Змінено всі `?` на `$1, $2...`
- Додано `await` перед всіма `get()`, `all()`, `run()`
- Оновлено JSON запити на PostgreSQL синтаксис

#### routes/analyze.js
- Додано async/await
- Оновлено параметри запитів
- Додано фільтр учасників

### 6. Нові можливості

#### Фільтр учасників бесіди
Додано можливість вибрати конкретних учасників для аналізу їх повідомлень

#### Покращений промпт аналізу
- Менш параноїдальний підхід
- Більш збалансована оцінка
- Детальніший контекстний аналіз

### 7. Deployment на Railway

```bash
# 1. Встановіть Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Link до проекту
railway link

# 4. Deploy
railway up

# 5. Перевірте логи
railway logs
```

### 8. Тестування

```bash
# Локально з PostgreSQL
DATABASE_URL="postgresql://localhost/teampulse" npm run dev

# Перевірка health
curl http://localhost:3000/health
curl http://localhost:3000/ready
```

### 9. Rollback план

Якщо щось піде не так:
1. SQLite база залишається в `./data/teampulse.db`
2. Змініть import назад на `./utils/db.js`
3. Перезапустіть сервер

### 10. Performance tips

```javascript
// Використовуйте connection pooling (вже налаштовано)
max: 20  // Maximum 20 connections

// Індекси створюються автоматично при ініціалізації
CREATE INDEX idx_analyses_client ON analyses(client_id);
CREATE INDEX idx_analyses_created ON analyses(created_at DESC);

// Для складних запитів використовуйте EXPLAIN ANALYZE
const result = await get('EXPLAIN ANALYZE SELECT...');
```

## Troubleshooting

### Connection timeout
```javascript
// Збільшіть timeout у db-postgres.js
connectionTimeoutMillis: 10000 → 20000
```

### Too many connections
```javascript
// Зменшіть pool size
max: 20 → 10
```

### SSL errors на Railway
```javascript
ssl: {
  rejectUnauthorized: false  // Вже налаштовано
}
```

## Перевірочний чек-лист

- [ ] PostgreSQL database створено на Railway
- [ ] DATABASE_URL додано до змінних середовища
- [ ] Залежності встановлено (`npm install`)
- [ ] Міграція даних виконана (якщо потрібно)
- [ ] `/health` endpoint повертає `healthy`
- [ ] `/ready` endpoint повертає `ready: true`
- [ ] Можна створити клієнта
- [ ] Можна запустити аналіз
- [ ] Дані зберігаються в PostgreSQL

## Підтримка

Якщо виникли проблеми:
1. Перевірте логи: `railway logs` або локальні в `./logs`
2. Перевірте підключення: `psql $DATABASE_URL`
3. Перевірте змінні: `railway variables`
