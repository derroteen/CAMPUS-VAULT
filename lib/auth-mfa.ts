import { supabase } from "@/lib/supabase";

export type TotpFactor = {
  id: string;
  factor_type?: string;
  status?: string;
};

export function getVerifiedTotpFactorFromList(factorsData: {
  totp?: TotpFactor[];
  all?: TotpFactor[];
} | null | undefined) {
  const totpFactors = factorsData?.totp ?? [];
  return totpFactors.find((factor) => factor.status === "verified") ?? null;
}

export async function userMustEnrollAdminMfa(userId: string) {
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();

  if (profileError || !profileData?.is_admin) {
    return false;
  }

  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const verifiedTotp = getVerifiedTotpFactorFromList(factorsData);

  return !verifiedTotp;
}

export type AdminMfaGateStatus =
  | { status: "ok" }
  | { status: "needs_enrollment" }
  | { status: "needs_challenge"; factorId: string };

/**
 * Admin write actions (approve/reject/edit) are gated by the database on an
 * aal2 ("2FA verified this session") session. Signing in with a password
 * and completing an MFA challenge reaches aal2 automatically, but signing
 * in with Google (or any OAuth provider) only ever reaches aal1 — Supabase
 * has no built-in step-up prompt for OAuth sessions. This checks whether
 * the current session already satisfies aal2, needs the admin to enroll a
 * factor for the first time, or just needs to re-verify an existing one.
 */
export async function getAdminMfaGateStatus(): Promise<AdminMfaGateStatus> {
  const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aalError || !aalData) {
    return { status: "needs_enrollment" };
  }

  if (aalData.currentLevel === "aal2") {
    return { status: "ok" };
  }

  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const verifiedFactor = getVerifiedTotpFactorFromList(factorsData);

  if (!verifiedFactor) {
    return { status: "needs_enrollment" };
  }

  return { status: "needs_challenge", factorId: verifiedFactor.id };
}
