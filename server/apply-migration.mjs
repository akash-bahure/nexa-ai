// Apply migration using pg module
import pg from 'pg';
import { readFileSync } from 'fs';

const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:5433/nexa_ai?schema=public'
});

const sql = readFileSync('./prisma/migrations/20261116000001_add_documents/migration.sql', 'utf-8');

async function run() {
  await client.connect();
  console.log('Connected to database');
  
  try {
    // Check if already migrated
    const check = await client.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'Document' LIMIT 1`);
    if (check.rows.length > 0) {
      console.log('Migration already applied');
      await client.end();
      return;
    }
  } catch (e) {
    // ignore
  }
  
  try {
    // Split by statement and execute each
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));
    for (const stmt of statements) {
      console.log('Executing:', stmt.slice(0, 60) + '...');
      await client.query(stmt);
    }
    
    // Record migration in _prisma_migrations table
    await client.query(`
      INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
      VALUES (gen_random_uuid()::text, 'manual', NOW(), '20261116000001_add_documents', NULL, NULL, NOW(), 1)
      ON CONFLICT (migration_name) DO NOTHING
    `).catch(() => console.log('Migration record skipped (table may not exist)'));
    
    console.log('Migration applied successfully!');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
  
  await client.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
