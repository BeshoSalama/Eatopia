import React, { useState } from "react";
import "./ConfirmDialog.css";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  tone = "danger",
  onCancel,
  onConfirm,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onConfirm?.();
      onCancel?.();
    } catch (confirmError) {
      setError(
        confirmError?.response?.data?.message ||
          confirmError?.response?.data?.error?.message ||
          confirmError?.message ||
          "Could not complete this action."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="confirm-dialog-backdrop" role="presentation" onMouseDown={busy ? undefined : onCancel}>
      <div className="confirm-dialog-card" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className={`confirm-dialog-icon confirm-dialog-icon-${tone}`}>{tone === "danger" ? "!" : "?"}</div>
        <div className="confirm-dialog-content">
          <h3 id="confirm-dialog-title">{title}</h3>
          {message && <p>{message}</p>}
          {error && <p className="confirm-dialog-error">{error}</p>}
        </div>
        <div className="confirm-dialog-actions">
          <button type="button" className="confirm-dialog-cancel" onClick={onCancel} disabled={busy}>{cancelText}</button>
          <button type="button" className={`confirm-dialog-confirm confirm-dialog-confirm-${tone}`} onClick={handleConfirm} disabled={busy}>{busy ? "Working..." : confirmText}</button>
        </div>
      </div>
    </div>
  );
}
