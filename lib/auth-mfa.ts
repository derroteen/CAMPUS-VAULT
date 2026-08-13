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
