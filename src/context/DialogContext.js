import React, { createContext, useContext, useState, useRef, useCallback } from "react";
import CustomDialog from "../components/Common/CustomDialog";

const DialogContext = createContext(null);

let globalDialogHandler = null;

export const dialog = {
  confirm: (options) => {
    if (globalDialogHandler) {
      return globalDialogHandler.confirm(options);
    }
    const msg = typeof options === "string" ? options : options?.message || "Are you sure?";
    return Promise.resolve(window.confirm(msg));
  },
  alert: (options) => {
    if (globalDialogHandler) {
      return globalDialogHandler.alert(options);
    }
    const msg = typeof options === "string" ? options : options?.message || "";
    window.alert(msg);
    return Promise.resolve(true);
  },
};

export function DialogProvider({ children }) {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: "",
    message: "",
    note: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    type: "warning",
    isAlert: false,
  });

  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    const opts = typeof options === "string" ? { message: options } : options || {};
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialogState({
        isOpen: true,
        title: opts.title || "Confirmation",
        message: opts.message || "Are you sure you want to proceed?",
        note: opts.note || "",
        confirmText: opts.confirmText || "Confirm",
        cancelText: opts.cancelText || "Cancel",
        type: opts.type || "warning",
        isAlert: false,
      });
    });
  }, []);

  const alert = useCallback((options) => {
    const opts = typeof options === "string" ? { message: options } : options || {};
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialogState({
        isOpen: true,
        title: opts.title || "Notice",
        message: opts.message || "",
        note: opts.note || "",
        confirmText: opts.confirmText || "OK",
        cancelText: null,
        type: opts.type || "info",
        isAlert: true,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  }, []);

  // Keep imperative handler updated
  globalDialogHandler = { confirm, alert };

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      <CustomDialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        note={dialogState.note}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        type={dialogState.type}
        isAlert={dialogState.isAlert}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    return {
      confirm: dialog.confirm,
      alert: dialog.alert,
    };
  }
  return context;
}

export default DialogContext;
