import { cn } from "@/lib/utils";

export type SeparatorProps = React.HTMLAttributes<HTMLDivElement> & {
  orientation?: "horizontal" | "vertical";
};

export const Separator = ({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorProps) => (
  <div
    role="presentation"
    className={cn(
      "bg-gray-200",
      orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
      className
    )}
    {...props}
  />
);
