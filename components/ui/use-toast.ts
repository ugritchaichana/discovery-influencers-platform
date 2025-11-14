"use client";

import * as React from "react";

import { type ToastProps } from "@/components/ui/toast";

type ToastActionElement = React.ReactElement;

type ToastStatus = "loading" | "success" | "error";

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  closeLabel?: string;
  status?: ToastStatus;
};

type ToastState = {
  toasts: ToasterToast[];
};

type ToastAction =
  | { type: "ADD_TOAST"; toast: ToasterToast }
  | { type: "UPDATE_TOAST"; toast: Partial<ToasterToast> & { id: string } }
  | { type: "DISMISS_TOAST"; toastId?: string }
  | { type: "REMOVE_TOAST"; toastId?: string };

const TOAST_LIMIT = 4;
const TOAST_REMOVE_DELAY = 1000;

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
const listeners = new Set<(state: ToastState) => void>();

let memoryState: ToastState = { toasts: [] };

const updateListeners = () => {
  listeners.forEach((listener) => listener(memoryState));
};

const reducer = (state: ToastState, action: ToastAction): ToastState => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };
    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((toast) =>
          toast.id === action.toast.id ? { ...toast, ...action.toast } : toast
        ),
      };
    case "DISMISS_TOAST": {
      const toasts = state.toasts.map((toast) =>
        toast.id === action.toastId || action.toastId === undefined
          ? { ...toast, open: false }
          : toast
      );

      if (action.toastId) {
        addToRemoveQueue(action.toastId);
      } else {
        toasts.forEach((toast) => addToRemoveQueue(toast.id));
      }

      return { ...state, toasts };
    }
    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((toast) => toast.id !== action.toastId),
      };
    default:
      return state;
  }
};

const dispatch = (action: ToastAction) => {
  memoryState = reducer(memoryState, action);
  updateListeners();
};

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: "REMOVE_TOAST", toastId });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

const generateId = (() => {
  let count = 0;
  return () => {
    count += 1;
    return `${Date.now()}-${count}`;
  };
})();

const toast = ({ ...props }: Omit<ToasterToast, "id"> & { id?: string }) => {
  const id = props.id ?? generateId();

  const displayToast: ToasterToast = {
    ...props,
    id,
    open: true,
  };

  dispatch({ type: "ADD_TOAST", toast: displayToast });
  return id;
};

const updateToast = (toast: Partial<ToasterToast> & { id: string }) => {
  dispatch({ type: "UPDATE_TOAST", toast });
};

const dismiss = (toastId?: string) => {
  dispatch({ type: "DISMISS_TOAST", toastId });
};

const useToast = () => {
  const [state, setState] = React.useState<ToastState>(memoryState);

  React.useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss,
    updateToast,
  };
};

export { dismiss, toast, updateToast, useToast };
export type { ToasterToast, ToastActionElement, ToastStatus };
