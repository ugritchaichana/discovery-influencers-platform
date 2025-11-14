export type Role = "superadmin" | "admin" | "editor" | "user";
export type RoleAction = "create" | "update" | "delete";

export function canActOnRole(actorRole: Role, targetRole: Role, action: RoleAction): boolean {
  if (actorRole === "superadmin") {
    return targetRole !== "superadmin";
  }

  if (actorRole === "admin") {
    return targetRole === "editor" || targetRole === "user";
  }

  if (actorRole === "editor") {
    return targetRole === "user" && action !== "create";
  }

  if (actorRole === "user") {
    return targetRole === "user" && action === "update";
  }

  return false;
}

export function canCreateRole(actorRole: Role, targetRole: Role): boolean {
  return canActOnRole(actorRole, targetRole, "create");
}

export function canUpdateRole(actorRole: Role, targetRole: Role): boolean {
  return canActOnRole(actorRole, targetRole, "update");
}

export function canDeleteRole(actorRole: Role, targetRole: Role): boolean {
  return canActOnRole(actorRole, targetRole, "delete");
}
