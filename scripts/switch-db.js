/**
 * Switch database provider between PostgreSQL and SQLite easily.
 * Usage: node scripts/switch-db.js [sqlite|postgres]
 */
const fs = require('fs');
const path = require('path');

const target = process.argv[2];
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const envPath = path.join(__dirname, '..', '.env');

if (target === 'postgres') {
  const content = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'schema.postgresql.prisma'), 'utf-8');
  fs.writeFileSync(schemaPath, content);
  console.log('✅ Switched Prisma schema to PostgreSQL (provider = "postgresql")');
  console.log('Ensure DATABASE_URL in .env points to your PostgreSQL instance.');
} else if (target === 'sqlite') {
  let content = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'schema.postgresql.prisma'), 'utf-8');
  content = content.replace('provider = "postgresql"', 'provider = "sqlite"');
  fs.writeFileSync(schemaPath, content);
  console.log('✅ Switched Prisma schema to SQLite (provider = "sqlite")');
  console.log('Ensure DATABASE_URL in .env is "file:./dev.db"');
} else {
  console.log('Usage: node scripts/switch-db.js [sqlite|postgres]');
}
