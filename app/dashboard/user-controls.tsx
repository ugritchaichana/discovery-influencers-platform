"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AuthenticatedUser } from "@/lib/auth/current-user";
import { createLoadingToast, resolveToast } from "@/lib/toast-feedback";
import { DASHBOARD_ACCOUNT_EVENT } from "./account-event";

type DashboardUserControlsProps = {
  user: AuthenticatedUser;
};

export function DashboardUserControls({ user }: DashboardUserControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);

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

  const handleAccountClick = () => {
    setIsMenuOpen(false);
    if (user.personRecordId) {
      window.dispatchEvent(
        new CustomEvent(DASHBOARD_ACCOUNT_EVENT, {
          detail: { recordId: user.personRecordId },
        })
      );
      return;
    }
    setIsAccountDialogOpen(true);
  };

  const handleLogoutClick = () => {
    setIsMenuOpen(false);
    handleLogout();
  };

  return (
    <>
      <div className="flex items-center gap-4 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-white">
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">Role</p>
          <p className="text-sm font-semibold text-white">{user.role}</p>
        </div>

        <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white disabled:border-white/15 disabled:text-white/50"
              disabled={isPending}
            >
              Account
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 border-white/15 bg-[#0d0d0d] p-3 text-sm text-white">
            <div className="flex flex-col gap-2">
              <Button
                variant="ghost"
                className="justify-start rounded-xl bg-white/5 text-left text-white hover:bg-white/10"
                onClick={handleAccountClick}
              >
                My account
              </Button>
              <Button
                variant="destructive"
                className="justify-start rounded-xl border border-white/10 bg-red-500/10 text-left text-red-200 hover:bg-red-500/20"
                onClick={handleLogoutClick}
                disabled={isPending}
              >
                {isPending ? "Logging out..." : "Logout"}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <AlertDialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Account overview</AlertDialogTitle>
            <AlertDialogDescription>
              Quick reference of the account that is currently signed in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white">
            <div className="flex items-center justify-between text-white/70">
              <span className="uppercase tracking-[0.3em] text-[11px]">Email</span>
              <span className="font-semibold text-white">{user.email}</span>
            </div>
            <div className="flex items-center justify-between text-white/70">
              <span className="uppercase tracking-[0.3em] text-[11px]">Role</span>
              <span className="font-semibold text-white">{user.role}</span>
            </div>
            {user.personRecordId && (
              <div className="flex items-center justify-between text-white/70">
                <span className="uppercase tracking-[0.3em] text-[11px]">Record</span>
                <span className="font-mono text-white">{user.personRecordId}</span>
              </div>
            )}
          </div>
          <AlertDialogFooter className="mt-6">
            <AlertDialogAction
              className="bg-white text-black hover:bg-white/90"
              onClick={() => setIsAccountDialogOpen(false)}
            >
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
