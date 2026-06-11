"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FieldLabel,
  FormError,
  RegisterShell,
  SubmitButton,
  TextInput,
} from "@/components/register/RegisterShell";

type RegistrationType = "self" | "guardian";

export default function RegisterAccountPage() {
  const router = useRouter();
  const [registrationType, setRegistrationType] =
    useState<RegistrationType>("self");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/register/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          confirmPassword,
          registrationType,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Registration failed.");
        return;
      }

      sessionStorage.setItem("vault_register_account_id", data.accountId);
      sessionStorage.setItem(
        "vault_register_type",
        data.registrationType,
      );
      router.push("/register/player");
    } catch {
      setError("Unable to reach the registration service.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <RegisterShell
      step="Step 1 of 3"
      title="Create Your Account"
      subtitle="Establish your credentials to enter The Vault archival system."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <FieldLabel>Registration Type</FieldLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setRegistrationType("self")}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                registrationType === "self"
                  ? "border-[#B8972A]/40 bg-[#B8972A]/8 text-slate-900"
                  : "border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300"
              }`}
            >
              <span className="block font-semibold">Registering for myself</span>
              <span className="mt-1 block text-xs text-slate-500">Age 18+</span>
            </button>
            <button
              type="button"
              onClick={() => setRegistrationType("guardian")}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                registrationType === "guardian"
                  ? "border-[#B8972A]/40 bg-[#B8972A]/8 text-slate-900"
                  : "border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300"
              }`}
            >
              <span className="block font-semibold">Guardian registration</span>
              <span className="mt-1 block text-xs text-slate-500">
                Registering for a minor
              </span>
            </button>
          </div>
        </div>

        <div>
          <FieldLabel>Email</FieldLabel>
          <TextInput
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <FieldLabel>Password</FieldLabel>
          <TextInput
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <FieldLabel>Confirm Password</FieldLabel>
          <TextInput
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {error ? <FormError message={error} /> : null}

        <SubmitButton disabled={loading}>
          {loading ? "Creating Account…" : "Continue to Player Details"}
        </SubmitButton>
      </form>
    </RegisterShell>
  );
}
