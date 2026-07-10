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
import { ensureInitialOrganization } from "@/lib/services/organizations";
import { getErrorMessage } from "@/lib/utils/errors";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const PENDING_ONBOARDING_KEY = 'ktg-signage.pendingOnboarding';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useLanguage();
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
      if (!data.user) throw new Error(t('register.confirmEmailError'));

      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) {
        localStorage.setItem(PENDING_ONBOARDING_KEY, JSON.stringify({ fullName, organizationName }));
        setError(t('register.confirmEmailError'));
        return;
      }

      await ensureInitialOrganization(supabase, data.user, fullName, organizationName);
      localStorage.removeItem(PENDING_ONBOARDING_KEY);
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err, t("register.genericError")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-deep p-6">
      <Card className="w-full max-w-lg">
        <div className="mb-2 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">{t("register.title")}</h1>
          <LanguageSwitcher />
        </div>
        <p className="mt-2 text-sm text-slate-400">{t("register.subtitle")}</p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <Input
            placeholder={t("register.fullNamePlaceholder")}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
          <Input
            placeholder={t("register.orgNamePlaceholder")}
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
            required
          />
          <Input
            type="email"
            placeholder={t("register.emailPlaceholder")}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Input
            type="password"
            placeholder={t("register.passwordPlaceholder")}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />
          {error ? <p className="text-sm text-offline">{error}</p> : null}
          <Button className="w-full" disabled={loading}>
            {loading ? t("register.creating") : t("register.submit")}
          </Button>
        </form>
        <p className="mt-5 text-sm text-slate-400">
          {t("register.haveAccount")} <Link className="text-cyan" href="/login">{t("register.login")}</Link>
        </p>
      </Card>
    </main>
  );
}
