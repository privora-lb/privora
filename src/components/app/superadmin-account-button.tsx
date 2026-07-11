"use client";

import { KeyRound, Loader2, X } from "lucide-react";
import { useRef, useState, useTransition, type FormEvent } from "react";

import { changeCurrentPasswordAction } from "@/app/(app)/account/actions";
import { CmsToastStack } from "@/components/cms/CmsToastStack";
import { useCmsToasts } from "@/components/cms/use-cms-toasts";
import { PasswordInput } from "@/components/ui/password-input";
import type { AppUser } from "@/lib/types";
import { cn } from "@/lib/ui";

type PasswordField = "confirmPassword" | "currentPassword" | "newPassword";

const inputClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#C0964E] focus:ring-4 focus:ring-[#EACC84]/20 disabled:cursor-wait disabled:bg-slate-50";

const invalidInputClassName =
  "border-rose-300 bg-rose-50/70 focus:border-rose-400 focus:ring-rose-100";

export function SuperadminAccountButton({
  compact,
  user,
}: {
  compact?: boolean;
  user: AppUser;
}) {
  const { dismissToast, pushToast, toasts } = useCmsToasts();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <CmsToastStack onDismiss={dismissToast} toasts={toasts} />
      <button
        aria-label="Change password"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-full border border-[#EACC84]/35 bg-[#FCFCF0] text-left text-slate-950 shadow-[0_10px_24px_rgba(0,0,0,0.14)] transition hover:bg-[#F6E4AE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EACC84]/45",
          compact ? "p-1.5 sm:px-2" : "px-3 py-1.5",
        )}
        onClick={() => setIsOpen(true)}
        title="Change password"
        type="button"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#C0964E] text-[11px] font-black text-[#123C36]">
          {getInitials(user.name)}
        </span>
        <span className={cn("min-w-0", compact && "hidden sm:block")}>
          <span className="block max-w-56 truncate text-sm font-black leading-tight text-slate-950">
            {user.email ?? user.phoneNumber}
          </span>
          <span className="block text-[11px] font-bold capitalize leading-tight text-[#967230]">
            {user.role}
          </span>
        </span>
      </button>
      {isOpen ? (
        <ChangePasswordModal
          onClose={() => setIsOpen(false)}
          pushToast={pushToast}
        />
      ) : null}
    </>
  );
}

function ChangePasswordModal({
  onClose,
  pushToast,
}: {
  onClose: () => void;
  pushToast: (type: "error" | "success", message: string) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<PasswordField, string>>
  >({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const validationErrors = validatePasswordForm(formData);

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      pushToast(
        "error",
        Object.values(validationErrors)[0] ?? "Fix the highlighted fields.",
      );
      return;
    }

    setFieldErrors({});
    startTransition(async () => {
      const result = await changeCurrentPasswordAction(formData);

      if (!result.ok) {
        if (result.field) {
          setFieldErrors({ [result.field]: result.message });
        }
        pushToast("error", result.message);
        return;
      }

      formRef.current?.reset();
      pushToast("success", result.message);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <section
        aria-labelledby="change-password-title"
        aria-modal="true"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.24)]"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#C0964E]/35 bg-[#123C36] px-5 py-4 text-[#FCFCF0]">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EACC84] text-[#123C36] shadow-sm">
              <KeyRound size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2
                className="m-0 text-lg font-black leading-tight"
                id="change-password-title"
              >
                Change password
              </h2>
              <p className="m-0 mt-1 text-sm font-semibold leading-5 text-[#EACC84]">
                Update the password for this superadmin account.
              </p>
            </div>
          </div>
          <button
            aria-label="Close password modal"
            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-xl border border-[#EACC84]/30 bg-white/10 text-[#FCFCF0] transition hover:bg-white/15 disabled:cursor-wait disabled:opacity-60"
            disabled={isPending}
            onClick={onClose}
            type="button"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>
        <form className="grid gap-4 px-5 py-5" onSubmit={handleSubmit} ref={formRef}>
          <PasswordFieldControl
            disabled={isPending}
            error={fieldErrors.currentPassword}
            label="Current password"
            name="currentPassword"
          />
          <PasswordFieldControl
            disabled={isPending}
            error={fieldErrors.newPassword}
            label="New password"
            name="newPassword"
          />
          <PasswordFieldControl
            disabled={isPending}
            error={fieldErrors.confirmPassword}
            label="Confirm new password"
            name="confirmPassword"
          />
          <div className="mt-1 flex justify-end gap-2">
            <button
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
              disabled={isPending}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#C0964E] px-4 text-sm font-black text-[#123C36] shadow-[0_14px_28px_rgba(192,150,78,0.24)] transition hover:bg-[#A87E36] disabled:cursor-wait disabled:opacity-75"
              disabled={isPending}
              type="submit"
            >
              {isPending ? (
                <Loader2 className="animate-spin" size={15} aria-hidden="true" />
              ) : null}
              {isPending ? "Saving..." : "Save password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function PasswordFieldControl({
  disabled,
  error,
  label,
  name,
}: {
  disabled: boolean;
  error?: string;
  label: string;
  name: PasswordField;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
        {label}
      </span>
      <PasswordInput
        aria-invalid={Boolean(error)}
        autoComplete={name === "currentPassword" ? "current-password" : "new-password"}
        buttonClassName="right-2 h-7 w-7 text-[#967230] hover:bg-[#FCF7E8] hover:text-[#123C36]"
        className={cn(inputClassName, error && invalidInputClassName)}
        disabled={disabled}
        name={name}
      />
      {error ? (
        <span className="text-xs font-bold text-rose-700">{error}</span>
      ) : null}
    </label>
  );
}

function validatePasswordForm(formData: FormData) {
  const currentPassword = getFormValue(formData, "currentPassword");
  const newPassword = getFormValue(formData, "newPassword");
  const confirmPassword = getFormValue(formData, "confirmPassword");
  const errors: Partial<Record<PasswordField, string>> = {};

  if (!currentPassword) {
    errors.currentPassword = "Current password is required.";
  }

  if (!newPassword) {
    errors.newPassword = "New password is required.";
  } else if (newPassword.length < 6) {
    errors.newPassword = "New password must be at least 6 characters.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Confirm the new password.";
  } else if (newPassword && newPassword !== confirmPassword) {
    errors.confirmPassword = "New password and confirmation do not match.";
  }

  return errors;
}

function getFormValue(formData: FormData, key: PasswordField) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
