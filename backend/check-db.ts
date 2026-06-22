import { db } from './src/infra/db/index';
import { sql } from 'drizzle-orm';

db.execute(sql`SELECT * FROM email_branding`)
  .then((res) => {
    console.log("SUCCESS:", res.rows);
  })
  .catch((err) => {
    console.error("ERROR:", err);
  })
  .finally(() => {
    process.exit(0);
  });
