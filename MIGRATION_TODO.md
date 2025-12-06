# ✅ Завершення міграції на PostgreSQL + Нові фічі

## 🎯 Що вже зроблено

### 1. PostgreSQL Infrastructure ✅
- [x] `utils/db-postgres.js` - Connection pool, async/await interface
- [x] `migrate-to-postgres.js` - Migration script
- [x] `server.js` - Оновлено для PostgreSQL
- [x] Database initialization при старті
- [x] Graceful shutdown з закриттям пулу

### 2. Documentation ✅
- [x] `POSTGRESQL_MIGRATION_GUIDE.md` - Повна інструкція
- [x] `IMPROVED_ANALYSIS_PROMPT.md` - Новий підхід до аналізу

## 🔧 Що потрібно завершити

### 1. Routes Migration (Автоматична заміна)

Для КОЖНОГО файлу в `routes/`:

#### A. Змінити import
```javascript
// ❌ Старий
import { run, get, all } from '../utils/db.js';

// ✅ Новий
import { run, get, all } from '../utils/db-postgres.js';
```

#### B. Додати await до всіх DB викликів
```javascript
// ❌ Старий
const client = get(`SELECT * FROM clients WHERE id = ?`, [id]);
const clients = all(`SELECT * FROM clients`);
run(`DELETE FROM clients WHERE id = ?`, [id]);

// ✅ Новий
const client = await get(`SELECT * FROM clients WHERE id = $1`, [id]);
const clients = await all(`SELECT * FROM clients`);
await run(`DELETE FROM clients WHERE id = $1`, [id]);
```

#### C. Замінити ? на $1, $2, $3...
```javascript
// ❌ Старий
WHERE id = ? AND client_id = ?

// ✅ Новий
WHERE id = $1 AND client_id = $2
```

#### D. Оновити JSON queries
```javascript
// ❌ SQLite
json_extract(a.barometer_json, '$.score')

// ✅ PostgreSQL
CAST(a.barometer_json->>'score' AS NUMERIC)
```

#### E. Оновити datetime functions
```javascript
// ❌ SQLite
datetime(created_at)
ORDER BY datetime(updated_at) DESC

// ✅ PostgreSQL
created_at::timestamp
ORDER BY updated_at DESC
```

### 2. Скрипт автоматичної конвертації

Створіть файл `convert-to-postgres.sh`:

```bash
#!/bin/bash

# Конвертація routes/clients.js
sed -i '' "s|from '../utils/db.js'|from '../utils/db-postgres.js'|g" routes/*.js

# Додати await перед DB calls (потребує ручного додавання async до функцій)
echo "⚠️  Додайте 'await' перед всіма get(), all(), run() вручну"

# Показати де потрібні зміни
grep -n "get(\|all(\|run(" routes/*.js

echo "✅ Import змінено. Тепер:"
echo "1. Додайте 'await' перед всіма DB викликами"
echo "2. Замініть ? на \$1, \$2... в SQL запитах"
echo "3. Оновіть JSON та datetime функції"
```

### 3. Покращений промпт аналізу

У `routes/analyze.js` замініть `buildSystemPrompt()`:

```javascript
function buildSystemPrompt() {
  return `
Ти — експерт-аналітик переговорів з 15-річним досвідом.
Твоя місія — провести ПРОФЕСІЙНИЙ, ЗБАЛАНСОВАНИЙ та КОНТЕКСТУАЛЬНИЙ аналіз.

🎯 МЕТА: Виявити РЕАЛЬНО ЗНАЧУЩІ маніпуляції, що можуть вплинути на результат.
Фокус на ЯКОСТІ, а не кількості.

⚖️ ПРИНЦИПИ:

1. КОНТЕКСТ - враховуй культуру, стандартні практики
2. ГРАДАЦІЯ - severity 1 (легко) → 3 (критично)
3. ДОКАЗОВІСТЬ - обґрунтовуй ЧОМУ це проблема

🔍 ПРІОРИТЕТИ:

ВИСОКИЙ (Severity 2-3):
- Приховування критичної інформації
- Емоційний шантаж
- Штучний тиск часу для важливих рішень
- Газлайтинг
- Фінансові маніпуляції

СЕРЕДНІЙ (Severity 1-2):
- Соціальний тиск
- Anchoring effects
- Апеляції до емоцій

❌ НЕ ПОЗНАЧАЙ:
- Ввічливості
- Стандартні бізнес-фрази
- Професійну термінологію

ФОРМАТ: NDJSON
{"type":"highlight","paragraph_index":N,"char_start":S,"char_end":E,"category":"...",
"label":"...","text":"цитата","explanation":"детальне пояснення ЧОМУ та ЯК",
"severity":1-3}

`.trim();
}
```

### 4. Фільтр учасників - Frontend

У `public/index.html` додайте перед кнопкою "Розпочати аналіз":

```html
<!-- Participant Filter -->
<div class="participant-filter" id="participant-filter" style="display: none;">
    <div class="section-header">
        <i class="fas fa-users section-icon"></i>
        <h3>Фільтр учасників</h3>
    </div>
    <div class="filter-options">
        <label class="radio-option">
            <input type="radio" name="participant-mode" value="all" checked>
            <span>Аналізувати всіх учасників</span>
        </label>
        <label class="radio-option">
            <input type="radio" name="participant-mode" value="selected">
            <span>Вибрати конкретних учасників</span>
        </label>
    </div>
    <div class="participants-list" id="participants-list" style="display: none;">
        <!-- Dynamic checkboxes will be added here -->
    </div>
</div>
```

### 5. Фільтр учасників - Backend

У `routes/analyze.js` додайте функцію витягування учасників:

```javascript
function extractParticipants(text) {
  // Шукаємо патерни: "Ім'я:", "Ім'я -", "[Ім'я]"
  const patterns = [
    /^([А-ЯA-Z][а-яa-z\s]+):/gm,
    /^([А-ЯA-Z][а-яa-z\s]+)\s+-/gm,
    /\[([А-ЯA-Z][а-яa-z\s]+)\]/g
  ];

  const participants = new Set();
  patterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      participants.add(match[1].trim());
    }
  });

  return Array.from(participants);
}

function filterTextByParticipants(text, selectedParticipants) {
  if (!selectedParticipants || selectedParticipants.length === 0) {
    return text; // Повернути весь текст
  }

  const lines = text.split('\n');
  const filtered = [];
  let currentParticipant = null;

  for (const line of lines) {
    // Перевірити чи це початок реплік учасника
    const participantMatch = line.match(/^([А-ЯA-Z][а-яa-z\s]+):/);
    if (participantMatch) {
      currentParticipant = participantMatch[1].trim();
    }

    // Додати рядок якщо це обраний учасник
    if (selectedParticipants.includes(currentParticipant)) {
      filtered.push(line);
    }
  }

  return filtered.join('\n');
}
```

Використання:
```javascript
// У parseMultipart додайте
let selectedParticipants = null;

busboy.on('field', (name, val) => {
  if (name === 'participants') {
    try {
      selectedParticipants = JSON.parse(val);
    } catch {}
  }
});

// Після отримання тексту
const allParticipants = extractParticipants(text);
const filteredText = filterTextByParticipants(text, selectedParticipants);

// Зберігайте в DB
participants_filter: JSON.stringify({
  all: allParticipants,
  selected: selectedParticipants || allParticipants
})
```

### 6. Railway Deployment

```bash
# 1. Створіть PostgreSQL на Railway
railway add postgresql

# 2. Додайте змінні
railway variables set OPENAI_API_KEY=xxx
railway variables set NODE_ENV=production
railway variables set DAILY_TOKEN_LIMIT=512000

# 3. Deploy
git add .
git commit -m "Migrate to PostgreSQL"
railway up
```

### 7. Testing Checklist

- [ ] `npm install` - всі залежності встановлені
- [ ] DATABASE_URL налаштовано
- [ ] `npm run dev` - сервер стартує
- [ ] `/health` - database = healthy
- [ ] Створити клієнта - працює
- [ ] Запустити аналіз - працює
- [ ] Дані зберігаються в PostgreSQL
- [ ] Фільтр учасників відображається
- [ ] Аналіз з фільтром працює

## 📝 Швидкий старт

```bash
# 1. Встановити залежності
npm install

# 2. Налаштувати .env
cp .env.example .env
# Додати DATABASE_URL

# 3. (Опціонально) Мігрувати дані
node migrate-to-postgres.js

# 4. Запустити
npm run dev
```

## 🐛 Troubleshooting

### "relation does not exist"
```bash
# DB не ініціалізована - перезапустіть сервер
npm run dev
```

### "too many connections"
```javascript
// У db-postgres.js зменшіть
max: 20 → max: 10
```

### Slow queries
```javascript
// Додайте індекси (вже є в initializeDatabase)
CREATE INDEX idx_name ON table(column);
```

## 🎉 Результат

Після завершення ви матимете:
- ✅ PostgreSQL база на Railway
- ✅ Збалансований аналіз (не параноїдальний)
- ✅ Фільтр учасників бесіди
- ✅ Production-ready deployment
- ✅ Автоматична міграція даних
- ✅ Повна документація
