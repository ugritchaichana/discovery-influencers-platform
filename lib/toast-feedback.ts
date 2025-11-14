import { toast, updateToast } from "@/components/ui/use-toast";

const TOAST_LOADING_DURATION = 60000;
const TOAST_DEFAULT_DURATION = 4500;

type ResolveOptions = {
  toastId: string;
  title: string;
  description?: string;
  status: "success" | "error";
};

export const createLoadingToast = (title: string, description?: string) =>
  toast({
    title,
    description,
    status: "loading",
    duration: TOAST_LOADING_DURATION,
    closeLabel: "Dismiss",
  });

export const resolveToast = ({ toastId, title, description, status }: ResolveOptions) => {
  updateToast({
    id: toastId,
    title,
    description,
    status,
    variant: status === "error" ? "destructive" : "default",
    duration: TOAST_DEFAULT_DURATION,
  });
};
