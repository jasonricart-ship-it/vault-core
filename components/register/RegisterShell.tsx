import type { ReactNode } from "react";
import { VaultHeader } from "@/components/vault/VaultHeader";

export function RegisterShell({
  children,
  step,
  title,
  subtitle,
}: {
  children: ReactNode;
  step: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="min-h-screen bg-[#eef1f6]">
      <VaultHeader />
      <main className="mx-auto max-w-lg px-6 py-10">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-semibold tracking-[0.28em] text-[#B8972A] uppercase">
            {step}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-3 text-sm leading-7 text-slate-600">{subtitle}</p>
          ) : null}
        </div>
        <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_10px_28px_rgba(12,35,64,0.06)] sm:p-8">
          {children}
        </section>
      </main>
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.2em] text-[#B8972A] uppercase">
      {children}
    </label>
  );
}

export function TextInput({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#B8972A]/50 focus:ring-2 focus:ring-[#B8972A]/15 ${className}`}
      {...props}
    />
  );
}

export function SelectInput({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#B8972A]/50 focus:ring-2 focus:ring-[#B8972A]/15 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function SubmitButton({
  children,
  disabled,
}: {
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="mt-6 w-full rounded-xl border border-[#B8972A]/30 bg-[#0D1B2E] px-4 py-3.5 text-sm font-semibold tracking-[0.12em] text-[#B8972A] uppercase transition hover:bg-[#152238] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function FormError({ message }: { message: string }) {
  return (
    <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </p>
  );
}
