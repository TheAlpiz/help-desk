import * as argon2 from "argon2";
import { withSuperAdminTransaction } from "./index";
import { organization } from "../../modules/organization/organization.schema";
import { user } from "../../modules/user/user.schema";
import { PermissionService } from "../../modules/permission/permission.service";
import { logger } from "../logger";

export async function runSeed() {
  try {
    await withSuperAdminTransaction(async (tx) => {
      // Check if any organization exists
      const existingOrgs = await tx.select().from(organization).limit(1);

      if (existingOrgs.length > 0) {
        logger.info("[Seed] Database already seeded. Skipping.");
        return;
      }

      logger.info("[Seed] Commencing initial database seed...");

      // 1. Create Platform Organization
      const [platformOrg] = await tx
        .insert(organization)
        .values({
          domain: "yerliva.com",
          subdomain: "helpdesk",
          name: "Yerliva",
          status: "active",
        })
        .returning();

      // 2. Seed the system roles (REQUESTER / AGENT / SUPERVISOR / ADMIN) for the org
      await PermissionService.seedSystemRoles(tx, platformOrg.id);

      // 3. Create Super Admin User (globalRole grants wildcard, no org role needed)
      const passwordHash = await argon2.hash("eTKbG@3&KyKf5z");

      await tx.insert(user).values({
        organizationId: platformOrg.id,
        email: "admin@yerliva.com",
        firstName: "System",
        lastName: "Admin",
        passwordHash,
        globalRole: "SUPER_ADMIN",
        status: "active",
      });

      logger.info(
        "[Seed] Successfully created Platform organization and SUPER_ADMIN user.",
      );
    });
  } catch (err) {
    logger.error({ err }, "[Seed] Failed to execute database seed.");
  }
}
