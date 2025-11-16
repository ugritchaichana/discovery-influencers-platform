"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import {
  Toast,
  ToastClose,
  ToastContainer,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { dismiss, type ToastStatus, useToast } from "@/components/ui/use-toast";

function ToastStatusIndicator({ status }: { status?: ToastStatus }) {
  if (!status) {
    return null;
  }

  const iconClass = "h-4 w-4 text-black";

  if (status === "loading") {
    return (
      <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/10">
        <Loader2 className={`${iconClass} animate-spin`} />
      </span>
    );
  }

  if (status === "success") {
    return (
      <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="h-4 w-4" />
      </span>
    );
  }

  return (
    <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-700">
      <AlertCircle className="h-4 w-4" />
    </span>
  );
}

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider duration={5000} swipeDirection="right">
      {toasts.map(({ id, title, description, action, closeLabel, status, ...props }) => (
        <Toast
          key={id}
          {...props}
          onOpenChange={(open) => {
            props.onOpenChange?.(open);
            if (!open) {
              dismiss(id);
            }
          }}
        >
          <ToastStatusIndicator status={status} />
          <ToastContainer>
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </ToastContainer>
          {action}
          <ToastClose aria-label={closeLabel ?? "Close toast"} />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}

