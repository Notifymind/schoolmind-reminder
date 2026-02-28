import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

export const statement = {
  ...defaultStatements,
  code: ["generate", "delete", "list"],
} as const;

export const ac = createAccessControl(statement);

export const sellerRole = ac.newRole({
  code: ["generate", "delete", "list"],
});

export const adminRole = ac.newRole({
  ...adminAc.statements,
  code: ["generate", "delete", "list"],
});
