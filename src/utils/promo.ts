// Cliente de la Edge Function `promo` (VoleyStatsApp/supabase/functions/promo):
// códigos de la formación presencial. Es lo único de la web que habla con
// Supabase por API — el resto solo lee Firestore (y escudos del bucket público).
// Mismo proyecto que TEAM_LOGO_ORIGIN; el host ya está en la CSP `connect-src`
// de vercel.json, así que no hay nada que tocar allí.

const PROMO_ENDPOINT = "https://nannsjtfivbszbrjhjij.supabase.co/functions/v1/promo";

export type PromoTier = "normal" | "pro";

export type PromoInfo =
  | { status: "not_found" }
  | {
      status: "open" | "expired" | "exhausted" | "not_started";
      code: string;
      label: string;
      tier: PromoTier;
      days: number;
      valid_until: string;
      download_url: string;
    };

export type RedeemResult =
  | { status: "ok" | "already"; tier: PromoTier; expires_at: string }
  | { status: "not_found" | "expired" | "exhausted" | "not_started" };

export async function fetchPromoInfo(code: string): Promise<PromoInfo> {
  const res = await fetch(`${PROMO_ENDPOINT}?action=info&code=${encodeURIComponent(code)}`);
  if (!res.ok) throw new Error(`promo info ${res.status}`);
  return (await res.json()) as PromoInfo;
}

export async function redeemPromo(code: string, idToken: string): Promise<RedeemResult> {
  const res = await fetch(`${PROMO_ENDPOINT}?action=redeem`, {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error(`promo redeem ${res.status}`);
  return (await res.json()) as RedeemResult;
}
