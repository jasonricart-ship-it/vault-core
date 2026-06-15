"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  FieldLabel,
  FormError,
  RegisterShell,
  SubmitButton,
  TextInput,
} from "@/components/register/RegisterShell";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password.");
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Unable to reach the authentication service.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <RegisterShell
      step="Member Access"
      title="Sign in to The Vault"
      subtitle="Enter your credentials to access protected archival records."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
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
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error ? <FormError message={error} /> : null}

        <SubmitButton disabled={loading}>
          {loading ? "Signing In…" : "Sign In"}
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        New to The Vault?{" "}
        <Link
          href="/register"
          className="font-semibold text-[#B8972A] hover:underline"
        >
          Create an account
        </Link>
      </p>
    </RegisterShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
