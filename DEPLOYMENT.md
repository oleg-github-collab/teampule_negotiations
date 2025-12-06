# 🚀 TeamPulse Turbo - Production Deployment Guide

## Зміни в проекті ✅

### 1. PostgreSQL Migration (Завершено)
- ✅ Всі routes мігровані на PostgreSQL
- ✅ Async/await для всіх DB операцій
- ✅ Connection pooling з pg
- ✅ Graceful shutdown
- ✅ Auto-initialization схеми при старті

### 2. Покращений Prompt (Завершено)
- ✅ Збалансований підхід (не параноїдальний)
- ✅ Контекстуальний аналіз
- ✅ Градація severity 1-3
- ✅ Фокус на якості, не кількості

### 3. Фільтр Учасників (Backend готовий)
- ✅ Функції extractParticipants() та filterTextByParticipants()
- ✅ Збереження в participants_filter (JSONB)
- ✅ Обробка в analyze route

## Deployment на Railway

### Крок 1: Створення проекту

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Init project
railway init
```

### Крок 2: Додання PostgreSQL

```bash
# Add PostgreSQL database
railway add postgresql
```

Railway автоматично створить:
- PostgreSQL database
- DATABASE_URL змінну середовища
- SSL з'єднання

### Крок 3: Налаштування змінних

```bash
# Set environment variables
railway variables set OPENAI_API_KEY="sk-..."
railway variables set NODE_ENV="production"
railway variables set DAILY_TOKEN_LIMIT="512000"
railway variables set OPENAI_MODEL="gpt-4o"
railway variables set MAX_HIGHLIGHTS_PER_1000_WORDS="50"
railway variables set LOG_LEVEL="info"

# Verify
railway variables
```

### Крок 4: Deploy

```bash
# Deploy from current directory
railway up

# Or link to GitHub and auto-deploy
railway link
git push origin main
```

### Крок 5: Верифікація

```bash
# Check logs
railway logs
railway logs --follow

# Check status
railway status

# Open in browser
railway open
```

## Endpoints для перевірки

```bash
# Health check
curl https://your-app.up.railway.app/health

# Ready check
curl https://your-app.up.railway.app/ready

# Ping
curl https://your-app.up.railway.app/ping
```

## Структура проекту

```
/
├── server.js              (✅ PostgreSQL)
├── routes/
│   ├── analyze.js        (✅ PostgreSQL + Participant Filter + Improved Prompt)
│   ├── clients.js        (✅ PostgreSQL)
│   └── advice.js         (✅ PostgreSQL)
├── utils/
│   ├── db-postgres.js    (✅ New)
│   └── db.js             (старий SQLite, можна видалити)
├── migrate-to-postgres.js (✅ Migration script)
├── nixpacks.toml         (✅ Railway config)
└── package.json

Documentation:
├── POSTGRESQL_MIGRATION_GUIDE.md
├── IMPROVED_ANALYSIS_PROMPT.md
├── MIGRATION_TODO.md
├── MIGRATION_SUMMARY.md
└── DEPLOYMENT.md (цей файл)
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| DATABASE_URL | ✅ | - | PostgreSQL connection string (автоматично від Railway) |
| OPENAI_API_KEY | ✅ | - | OpenAI API ключ |
| NODE_ENV | ✅ | development | Середовище (production/development) |
| PORT | ❌ | 3000 | Порт (автоматично від Railway) |
| DAILY_TOKEN_LIMIT | ❌ | 512000 | Денний ліміт токенів |
| OPENAI_MODEL | ❌ | gpt-4o | AI модель |
| MAX_HIGHLIGHTS_PER_1000_WORDS | ❌ | 50 | Макс знахідок на 1000 слів |
| LOG_LEVEL | ❌ | info | Рівень логування |

## Моніторинг

### Railway Dashboard
- CPU/Memory usage
- Request metrics
- Error logs
- Database connections

### Application Logs
```bash
# Real-time logs
railway logs --follow

# Filter by level
railway logs | grep ERROR
railway logs | grep WARNING
```

### Health Endpoints
- `/health` - Детальна інформація (DB, AI, memory)
- `/ready` - Готовність для load balancer
- `/ping` - Швидка перевірка

## Troubleshooting

### Database connection errors
```bash
# Check DATABASE_URL
railway variables | grep DATABASE_URL

# Test connection
railway run psql $DATABASE_URL
```

### Too many connections
Зменшіть max pool size у [db-postgres.js](utils/db-postgres.js):
```javascript
max: 20 → max: 10
```

### Slow queries
```bash
# Check indexes
railway run psql $DATABASE_URL -c "\d+ analyses"
railway run psql $DATABASE_URL -c "\d+ clients"
```

### Memory issues
```bash
# Check memory usage
railway logs | grep "memory"

# Restart
railway restart
```

## Scaling

### Horizontal Scaling
Railway автоматично масштабує при навантаженні

### Database Scaling
```bash
# Upgrade plan in Railway dashboard
# або CLI:
railway up --pro
```

### Optimization Tips
1. Enable connection pooling (вже налаштовано)
2. Add indexes для heavy queries (вже є)
3. Use EXPLAIN ANALYZE для повільних запитів
4. Monitor slow query log

## Backup Strategy

### Automated Backups (Railway)
- Щоденні автоматичні backup
- Point-in-time recovery
- 7 днів retention (free plan)

### Manual Backup
```bash
# Export database
railway run pg_dump $DATABASE_URL > backup.sql

# Import
railway run psql $DATABASE_URL < backup.sql
```

## Security

### Best Practices ✅
- ✅ SSL/TLS для PostgreSQL
- ✅ Environment variables для secrets
- ✅ Rate limiting на endpoints
- ✅ Input validation
- ✅ SQL injection prevention (prepared statements)
- ✅ Error logging без sensitive data

### Firewall
Railway автоматично:
- HTTPS only
- DDoS protection
- IP filtering (pro plan)

## Performance Metrics

### Target Metrics
- Response time: < 2s (analysis) < 200ms (API)
- Uptime: 99.9%
- Error rate: < 0.1%
- DB connections: < 80% pool

### Monitoring
```bash
# Response times
railway logs | grep "X-Response-Time"

# Token usage
railway logs | grep "tokens_used"

# Errors
railway logs | grep "ERROR"
```

## Rollback Plan

### If deployment fails:
```bash
# Revert to previous deployment
railway rollback

# Or specific deployment
railway rollback <deployment-id>
```

### If database migration fails:
1. Backup наразі не працює, але SQLite залишається
2. Змініть import на `./utils/db.js`
3. Redeploy

## Cost Estimation

### Railway Pricing (approximated)
- Starter: $5/month (500 hours)
- Developer: $20/month (unlimited)
- PostgreSQL: включено

### OpenAI API
- GPT-4o: ~$5-15/day (залежить від використання)
- Ліміт: 512K токенів/день

## Next Steps

1. ✅ Deploy to Railway
2. ✅ Verify all endpoints
3. ⏳ Add participant filter UI (frontend)
4. ⏳ Load testing
5. ⏳ Setup monitoring alerts

## Support

- Railway Docs: https://docs.railway.app
- PostgreSQL Docs: https://www.postgresql.org/docs/
- Project Docs: див. `MIGRATION_SUMMARY.md`

---

**Status:** ✅ Ready for Production
**Last Updated:** 2025-12-05
