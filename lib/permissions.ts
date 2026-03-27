import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

export const statement = {
  ...defaultStatements,
  assignments: ["access"],
  exams: ["access"],
  seller: ["access"],
  admin: ["access"],
} as const;

export const ac = createAccessControl(statement);

export const freeRole = ac.newRole({
  exams: ["access"],
});

export const proRole = ac.newRole({
  ...freeRole.statements,
  assignments: ["access"],
});

export const sellerRole = ac.newRole({
  seller: ["access"],
  exams: ["access"],
  assignments: ["access"],
});

export const adminRole = ac.newRole({
  ...adminAc.statements,
  seller: ["access"],
  assignments: ["access"],
  exams: ["access"],
  admin: ["access"],
});
