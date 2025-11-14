"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createLoadingToast, resolveToast } from "@/lib/toast-feedback";
import type { Role } from "@/lib/auth/permissions";

type DashboardUserControlsProps = {
  role: Role;
};

export function DashboardUserControls({ role }: DashboardUserControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    const toastId = createLoadingToast("Logging out", "Ending your session...");
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/logout", { method: "POST" });
        if (!response.ok) {
          resolveToast({
            toastId,
            title: "Logout failed",
            description: "Something went wrong. Please try again.",
            status: "error",
          });
          return;
        }
      } catch (error) {
        console.error("Failed to log out", error);
        resolveToast({
          toastId,
          title: "Logout failed",
          description: "Network issue. Please retry.",
          status: "error",
        });
        return;
      }
      resolveToast({
        toastId,
        title: "Logged out",
        description: "Redirecting you to the login screen.",
        status: "success",
      });
      router.push("/login");
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-4 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-white">
      <div className="text-right">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">Role</p>
        <p className="text-sm font-semibold text-white">{role}</p>
      </div>
      <Button
        variant="outline"
        className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white disabled:border-white/15 disabled:text-white/50"
        onClick={handleLogout}
        disabled={isPending}
      >
        {isPending ? "Logging out..." : "Logout"}
      </Button>
    </div>
  );
}
