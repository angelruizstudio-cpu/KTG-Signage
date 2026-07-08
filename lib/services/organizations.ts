import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Organization, OrganizationMember } from "@/types/signage";

export async function getCurrentOrganization(supabase: SupabaseClient<Database>) {
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) return null;

  const { data: membership, error: memberError } = await supabase
    .from("organization_members")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (memberError) throw memberError;
  if (!membership) return null;

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", membership.organization_id)
    .single();

  if (orgError) throw orgError;
  return { organization, membership };
}

export async function ensureInitialOrganization(
  supabase: SupabaseClient<Database>,
  _user: User,
  fullName: string,
  organizationName: string
) {
  const { data: bootstrapped, error: bootstrapError } = await supabase.rpc("bootstrap_organization", {
    full_name_input: fullName,
    organization_name_input: organizationName
  });

  if (bootstrapError) {
    if (bootstrapError.message.toLowerCase().includes("bootstrap_organization")) {
      throw new Error("Database setup is missing bootstrap_organization. Run supabase/migrations/006_bootstrap_organization.sql in Supabase SQL Editor.");
    }

    throw bootstrapError;
  }

  return bootstrapped;
}

export async function updateOrganization(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  values: Pick<Organization, "name" | "primary_color" | "logo_url"> & Partial<Pick<Organization, "timezone">>
) {
  const { data, error } = await supabase
    .from("organizations")
    .update(values)
    .eq("id", organizationId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listOrganizationMembers(supabase: SupabaseClient<Database>, organizationId: string) {
  const { data, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as OrganizationMember[];
}
