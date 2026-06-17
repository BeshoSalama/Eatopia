import React, { useEffect, useState } from "react";
import "./TextInputDialog.css";

export default function TextInputDialog({
  open,
  title,
  message,
  label,
  placeholder,
  initialValue = "",
  confirmText = "Save",
  cancelText = "Cancel",
  required = false,
  requiredMessage = "Please enter a value.",
  onCancel,
  onSubmit,
}) {
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setValue(initialValue || "");
      setError("");
    }
  }, [open, initialValue]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (busy) return;
    const trimmedValue = value.trim();
    if (required && !trimmedValue) {
      setError(requiredMessage);
      return;
    }

    setBusy(true);
    setError("");
    try {
      await onSubmit?.(trimmedValue);
      onCancel?.();
    } catch (submitError) {
      setError(
        submitError?.response?.data?.message ||
          submitError?.response?.data?.error?.message ||
          submitError?.message ||
          "Could not complete this action."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="text-dialog-backdrop" role="presentation" onMouseDown={busy ? undefined : onCancel}>
      <div className="text-dialog-card" role="dialog" aria-modal="true" aria-labelledby="text-dialog-title" onMouseDown={(e) => e.stopPropagation()}>
        <h3 id="text-dialog-title">{title}</h3>
        {message && <p className="text-dialog-message">{message}</p>}
        {label && <label className="text-dialog-label" htmlFor="text-dialog-input">{label}</label>}
        <input
          id="text-dialog-input"
          className="text-dialog-input"
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") onCancel?.();
          }}
          autoFocus
        />
        {error && <p className="text-dialog-error">{error}</p>}
        <div className="text-dialog-actions">
          <button type="button" className="text-dialog-cancel" onClick={onCancel} disabled={busy}>{cancelText}</button>
          <button type="button" className="text-dialog-confirm" onClick={handleSubmit} disabled={busy}>{busy ? "Working..." : confirmText}</button>
        </div>
      </div>
    </div>
  );
}
