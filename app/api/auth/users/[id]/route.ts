import { NextRequest, NextResponse } from "next/server";

import {
  deleteAccount,
  findAccountByEmail,
  getAccountById,
  updateAccount,
} from "@/lib/auth/account-service";
import { canCreateRole, canDeleteRole, canUpdateRole, type Role } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id: accountId } = await context.params;
  const target = await getAccountById(accountId);
  if (!target) {
    return NextResponse.json({ message: "Account not found" }, { status: 404 });
  }

  const isSelf = currentUser.id === target.id;

  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      role?: Role;
    };

    const desiredRole = body.role ?? undefined;

    if (desiredRole && desiredRole === "superadmin" && currentUser.role !== "superadmin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (!isSelf && !canUpdateRole(currentUser.role, target.role)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (isSelf && desiredRole && desiredRole !== target.role) {
      return NextResponse.json({ message: "You cannot change your own role" }, { status: 403 });
    }

    if (desiredRole && !canCreateRole(currentUser.role, desiredRole)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    let email = body.email?.trim().toLowerCase();
    if (email && email !== target.email) {
      const existing = await findAccountByEmail(email);
      if (existing && existing.id !== target.id) {
        return NextResponse.json({ message: "Email already in use" }, { status: 409 });
      }
    } else {
      email = undefined;
    }

    const password = body.password ?? undefined;

    const updated = await updateAccount({
      id: target.id,
      email,
      password,
      role: desiredRole,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Update account error", error);
    return NextResponse.json({ message: "Unable to update account" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id: accountId } = await context.params;
  const target = await getAccountById(accountId);
  if (!target) {
    return NextResponse.json({ message: "Account not found" }, { status: 404 });
  }

  if (currentUser.id === target.id) {
    return NextResponse.json({ message: "You cannot delete your own account" }, { status: 400 });
  }

  if (!canDeleteRole(currentUser.role, target.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    await deleteAccount(target.id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Delete account error", error);
    return NextResponse.json({ message: "Unable to delete account" }, { status: 500 });
  }
}
