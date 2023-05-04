import { useEffect, useState } from "react";
import { create } from "zustand";

export interface ToastStore {
  toasts: Map<Toast["id"], Toast>;
  nextId: number;
  add: (toast: ToastOptions) => void;
  remove: (id: number) => void;
}

export type ToastOptions = {
  message: string;
};

export type Toast = ToastOptions & {
  id: number;
};

const useToastStore = create<ToastStore>((set, get) => ({
  nextId: 0,
  toasts: new Map(),
  add(toast: ToastOptions) {
    const { toasts, nextId } = get();
    const newToasts = new Map(toasts);

    const newToast = {
      ...toast,
      id: nextId,
    };

    newToasts.set(nextId, newToast);

    set({
      nextId: nextId + 1,
      toasts: newToasts,
    });

    return newToast;
  },

  remove(id: number) {
    const { toasts } = get();
    const newToasts = new Map(toasts);
    newToasts.delete(id);
    set({
      toasts: newToasts,
    });
  },
}));

export function useToast() {
  const store = useToastStore();
  return function toast(message: string) {
    store.add({ message });
  };
}

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div className="toast-container">
      {[...toasts.values()].map((toast) => (
        <ToastItem key={toast.id} {...toast} />
      ))}
    </div>
  );
}

export function ToastItem(toast: Toast) {
  const [isOpen, setIsOpen] = useState(false);
  const { remove } = useToastStore();

  useEffect(() => {
    setIsOpen(true);
    const timeout = setTimeout(() => {
      setIsOpen(false);
      remove(toast.id);
    }, 3000);
    return () => clearTimeout(timeout);
  }, [remove, toast.id]);

  return (
    <dialog className="toast" role="alert" open={isOpen}>
      {toast.message}
    </dialog>
  );
}
