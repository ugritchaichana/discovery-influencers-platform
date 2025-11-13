import * as React from "react";
import { cn } from "@/lib/utils";

export type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "success" | "error" | "info";
};

const variantClasses: Record<NonNullable<AlertProps["variant"]>, string> = {
  success: "border-green-200 bg-green-50 text-green-900",
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-blue-200 bg-blue-50 text-blue-900",
};

export const Alert = ({ variant = "info", className, ...props }: AlertProps) => (
  <div
    role="status"
    className={cn(
      "flex items-start gap-3 rounded-lg border px-3 py-2 text-sm",
      variantClasses[variant],
      className
    )}
    {...props}
  />
);

export const AlertTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("font-semibold", className)} {...props} />
);

export const AlertDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm", className)} {...props} />
);
