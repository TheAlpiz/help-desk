import { db } from "./index";

export async function setupDatabaseTriggers() {
  console.log("Setting up Postgres Database Triggers...");

  const rawSql = `
    -- Create the trigger function
    CREATE OR REPLACE FUNCTION check_ticket_tasks_before_close()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.status IN ('resolved', 'closed') THEN
        IF EXISTS (
          SELECT 1 FROM task 
          WHERE ticket_id = NEW.id 
          AND status NOT IN ('DONE', 'CANCELED')
        ) THEN
          RAISE EXCEPTION 'Database Constraint Violation: Cannot resolve or close ticket % because it has incomplete tasks.', NEW.id;
        END IF;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Attach the trigger to the ticket table
    DROP TRIGGER IF EXISTS ticket_tasks_check_trigger ON ticket;
    CREATE TRIGGER ticket_tasks_check_trigger
    BEFORE UPDATE OF status ON ticket
    FOR EACH ROW
    EXECUTE FUNCTION check_ticket_tasks_before_close();
  `;

  try {
    await db.execute(rawSql);
    console.log("Database triggers successfully installed.");
  } catch (error) {
    console.error("Failed to install database triggers:", error);
  }
}
