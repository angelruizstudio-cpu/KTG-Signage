"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseConfigError, isSupabaseConfigured } from "@/lib/supabase/env";
import { ensureInitialOrganization } from "@/lib/services/organizations";
import { getErrorMessage } from "@/lib/utils/errors";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!isSupabaseConfigured()) throw new Error(getSupabaseConfigError());
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });
      if (signupError) throw signupError;
      if (!data.user) throw new Error("Account created. Please confirm your email before onboarding.");
      await ensureInitialOrganization(supabase, data.user, fullName, organizationName);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Could not create account."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-deep p-6">
      <Card className="w-full max-w-lg">
        <h1 className="text-2xl font-semibold">Create your signage workspace</h1>
        <p className="mt-2 text-sm text-slate-400">We will create your organization, demo screens, and a starter Welcome Loop playlist.</p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <Input placeholder="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
          <Input placeholder="Church or organization name" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} required />
          <Input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} />
          {error ? <p className="text-sm text-offline">{error}</p> : null}
          <Button className="w-full" disabled={loading}>
            {loading ? "Creating workspace..." : "Register"}
          </Button>
        </form>
        <p className="mt-5 text-sm text-slate-400">
          Already have an account? <Link className="text-cyan" href="/login">Login</Link>
        </p>
      </Card>
    </main>
  );
}
