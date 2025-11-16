import { redirect } from "next/navigation";

import { getCurrentUserFromCookies } from "@/lib/auth/current-user";
import type { Role } from "@/lib/auth/permissions";
import { listRecords } from "@/lib/data-store";
import type { PersonRecord, RecordType } from "@/lib/types";

import { DashboardClient } from "./dashboard/dashboard-client";
import { DashboardUserControls } from "./dashboard/user-controls";

export const metadata = {
  title: "Discovery Influencers Platform",
};

const RECORD_TYPES: RecordType[] = ["individual", "influencer"];

function getDashboardPermissions(role: Role) {
  return {
    canCreate: role === "superadmin" || role === "admin",
    canEdit: role === "superadmin" || role === "admin" || role === "editor",
    canDelete: role === "superadmin" || role === "admin",
  };
}

export default async function Home() {
  const currentUser = await getCurrentUserFromCookies();
  if (!currentUser) {
    redirect("/login");
  }

  const recordsByType = await Promise.all(RECORD_TYPES.map((type) => listRecords(type)));
  const records: PersonRecord[] = recordsByType
    .flat()
    .sort((a, b) => a.recordId.localeCompare(b.recordId));

  const permissions = getDashboardPermissions(currentUser.role);

  return (
    <div className="min-h-screen bg-[#050505] px-6 py-10 text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Discovery Influencers Platform
            </h1>
          </div>
          <DashboardUserControls user={currentUser} />
        </header>
          <DashboardClient
            records={records}
            permissions={permissions}
            currentUserRole={currentUser.role}
            currentUserRecordId={currentUser.personRecordId}
          />
      </div>
    </div>
  );
}
