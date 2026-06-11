"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FieldLabel,
  FormError,
  RegisterShell,
  SelectInput,
  SubmitButton,
  TextInput,
} from "@/components/register/RegisterShell";

const SPORTS = [
  { value: "hockey", label: "Hockey" },
  { value: "soccer", label: "Soccer" },
  { value: "baseball", label: "Baseball" },
  { value: "basketball", label: "Basketball" },
  { value: "football", label: "Football" },
  { value: "lacrosse", label: "Lacrosse" },
  { value: "other", label: "Other" },
];

export default function RegisterPlayerPage() {
  const router = useRouter();
  const [accountId, setAccountId] = useState("");
  const [registrationType, setRegistrationType] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [primarySport, setPrimarySport] = useState("hockey");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedAccountId = sessionStorage.getItem("vault_register_account_id");
    const storedType = sessionStorage.getItem("vault_register_type");
    if (!storedAccountId || !storedType) {
      router.replace("/register");
      return;
    }
    setAccountId(storedAccountId);
    setRegistrationType(storedType);
  }, [router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/register/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          registrationType,
          firstName,
          lastName,
          preferredName: preferredName || null,
          dateOfBirth,
          primarySport,
          jerseyNumber: jerseyNumber || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Unable to create player record.");
        return;
      }

      sessionStorage.removeItem("vault_register_account_id");
      sessionStorage.removeItem("vault_register_type");
      router.push(
        `/register/success?ppc=${encodeURIComponent(data.ppcNumber)}`,
      );
    } catch {
      setError("Unable to reach the registration service.");
    } finally {
      setLoading(false);
    }
  }

  if (!accountId) {
    return null;
  }

  return (
    <RegisterShell
      step="Step 2 of 3"
      title="Player Record Details"
      subtitle="Information entered here becomes part of the permanent archival record."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <FieldLabel>First Name</FieldLabel>
            <TextInput
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Last Name</FieldLabel>
            <TextInput
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div>
          <FieldLabel>Preferred Name (Optional)</FieldLabel>
          <TextInput
            value={preferredName}
            onChange={(e) => setPreferredName(e.target.value)}
          />
        </div>

        <div>
          <FieldLabel>Date of Birth</FieldLabel>
          <TextInput
            type="date"
            required
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </div>

        <div>
          <FieldLabel>Primary Sport</FieldLabel>
          <SelectInput
            required
            value={primarySport}
            onChange={(e) => setPrimarySport(e.target.value)}
          >
            {SPORTS.map((sport) => (
              <option key={sport.value} value={sport.value}>
                {sport.label}
              </option>
            ))}
          </SelectInput>
        </div>

        <div>
          <FieldLabel>Jersey Number (Optional)</FieldLabel>
          <TextInput
            value={jerseyNumber}
            onChange={(e) => setJerseyNumber(e.target.value)}
          />
        </div>

        {error ? <FormError message={error} /> : null}

        <SubmitButton disabled={loading}>
          {loading ? "Creating Record…" : "Submit & Assign PPC Number"}
        </SubmitButton>
      </form>
    </RegisterShell>
  );
}
