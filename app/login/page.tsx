"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseConfigError, isSupabaseConfigured } from "@/lib/supabase/env";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { ensureInitialOrganization } from '@/lib/services/organizations';

const PENDING_ONBOARDING_KEY = 'ktg-signage.pendingOnboarding';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    if (!isSupabaseConfigured()) {
      setLoading(false);
      setError(getSupabaseConfigError());
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      setLoading(false);
      setError(loginError.message);
      return;
    }

    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      setLoading(false);
      setError(sessionError?.message ?? 'Could not persist your session. Please try again.');
      return;
    }

    const pendingOnboarding = localStorage.getItem(PENDING_ONBOARDING_KEY);
    if (pendingOnboarding) {
      try {
        const { fullName: pendingFullName, organizationName: pendingOrganizationName } = JSON.parse(pendingOnboarding) as {
          fullName?: string;
          organizationName?: string;
        };

        if (pendingFullName && pendingOrganizationName) {
          await ensureInitialOrganization(supabase, session.user, pendingFullName, pendingOrganizationName);
        }
      } catch {
        // ignore malformed local state
      } finally {
        localStorage.removeItem(PENDING_ONBOARDING_KEY);
      }
    }

    setLoading(false);
    router.replace('/dashboard');
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-deep p-6">
      <Card className="w-full max-w-md">
        <div className="mb-2 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">{t("login.title")}</h1>
          <LanguageSwitcher />
        </div>
        <p className="mt-2 text-sm text-slate-400">{t("login.subtitle")}</p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <Input
            type="email"
            placeholder={t("login.emailPlaceholder")}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Input
            type="password"
            placeholder={t("login.passwordPlaceholder")}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error ? <p className="text-sm text-offline">{error}</p> : null}
          <Button className="w-full" disabled={loading}>
            {loading ? t("login.loggingIn") : t("login.submit")}
          </Button>
        </form>
        <p className="mt-5 text-sm text-slate-400">
          {t("login.noAccount")} <Link className="text-cyan" href="/register">{t("login.createAccount")}</Link>
        </p>
      </Card>
    </main>
  );
}
