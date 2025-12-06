#!/bin/bash

echo "🔄 Converting SQL queries to PostgreSQL syntax..."

# Backup original files
echo "📦 Creating backups..."
cp routes/clients.js routes/clients.js.backup
cp routes/analyze.js routes/analyze.js.backup
cp routes/advice.js routes/advice.js.backup

# Change imports
echo "1️⃣ Updating imports..."
sed -i '' "s|from '../utils/db.js'|from '../utils/db-postgres.js'|g" routes/*.js

# Find all db calls that need await
echo "2️⃣ Finding DB calls that need 'await'..."
echo "   Please manually add 'await' before these calls:"
grep -n "= get(\|= all(\|run(" routes/*.js | head -20

# Find SQL queries with ? parameters
echo ""
echo "3️⃣ Finding SQL queries with ? parameters..."
echo "   Please manually replace ? with \$1, \$2, \$3..."
grep -n '?' routes/*.js | grep "SELECT\|INSERT\|UPDATE\|DELETE" | head -20

# Find JSON queries that need conversion
echo ""
echo "4️⃣ Finding json_extract() calls..."
echo "   Replace with: column->>'field' or CAST(column->>'field' AS NUMERIC)"
grep -n "json_extract" routes/*.js

# Find datetime functions
echo ""
echo "5️⃣ Finding datetime() calls..."
echo "   Replace with: column::timestamp or just remove datetime()"
grep -n "datetime(" routes/*.js

echo ""
echo "✅ Automatic changes completed!"
echo "⚠️  Manual changes required:"
echo "   1. Add 'await' before all get(), all(), run() calls"
echo "   2. Replace ? with \$1, \$2, \$3... in queries"
echo "   3. Convert json_extract() to ->>'field'"
echo "   4. Remove datetime() wrapping"
echo "   5. Ensure all functions using DB calls are async"
echo ""
echo "📁 Backups saved as: routes/*.js.backup"
echo "🔍 Check MIGRATION_TODO.md for detailed instructions"
