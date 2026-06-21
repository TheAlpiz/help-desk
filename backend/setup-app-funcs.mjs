import pg from "pg";
const admin = new pg.Client({ connectionString: "postgresql://postgres:postgres@localhost:5432/help-desk" });
await admin.connect();
const ROLE = "helpdesk_app";

const fns = await admin.query(`
  select n.nspname as schema, p.proname as name,
         pg_get_function_identity_arguments(p.oid) as args
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
`);
for (const f of fns.rows) {
  await admin.query(`ALTER FUNCTION public."${f.name}"(${f.args}) OWNER TO ${ROLE}`);
}
console.log(`transferred ownership of ${fns.rowCount} functions to ${ROLE}`);
await admin.end();
