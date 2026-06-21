import pg from "pg";

// Run as the superuser (postgres) to create a restricted runtime role.
const admin = new pg.Client({ connectionString: "postgresql://postgres:postgres@localhost:5432/help-desk" });
await admin.connect();

const ROLE = "helpdesk_app";
const PASS = "helpdesk_app";

// 1. Create the role: NOT superuser, NOT bypassrls — so RLS is enforced.
const exists = await admin.query(`select 1 from pg_roles where rolname = $1`, [ROLE]);
if (exists.rowCount === 0) {
  await admin.query(`CREATE ROLE ${ROLE} LOGIN PASSWORD '${PASS}' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`);
  console.log("created role", ROLE);
} else {
  await admin.query(`ALTER ROLE ${ROLE} NOSUPERUSER NOBYPASSRLS LOGIN PASSWORD '${PASS}'`);
  console.log("role exists; ensured NOSUPERUSER NOBYPASSRLS");
}

// 2. Let it connect + use the schema, and create objects (so drizzle-kit migrate works as this role).
await admin.query(`GRANT CONNECT ON DATABASE "help-desk" TO ${ROLE}`);
await admin.query(`GRANT USAGE, CREATE ON SCHEMA public TO ${ROLE}`);

// 3. Transfer ownership of existing public-schema tables + sequences to the app role.
//    A non-superuser OWNER still respects FORCE ROW LEVEL SECURITY, so isolation holds.
const tables = await admin.query(`
  select tablename from pg_tables where schemaname = 'public'
`);
for (const { tablename } of tables.rows) {
  await admin.query(`ALTER TABLE public."${tablename}" OWNER TO ${ROLE}`);
}
const seqs = await admin.query(`
  select sequencename from pg_sequences where schemaname = 'public'
`);
for (const { sequencename } of seqs.rows) {
  await admin.query(`ALTER SEQUENCE public."${sequencename}" OWNER TO ${ROLE}`);
}
console.log(`transferred ownership: ${tables.rowCount} tables, ${seqs.rowCount} sequences`);

// 4. Functions used by RLS policies are owned by postgres (STABLE sql) — grant execute.
await admin.query(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO ${ROLE}`);

await admin.end();
console.log("done. Update DATABASE_URL to use", ROLE);
