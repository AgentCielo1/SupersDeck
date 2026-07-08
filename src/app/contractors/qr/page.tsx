import { getServerSupabase } from "@/lib/supabase";
import QrPosterClient from "./QrPosterClient";

export const dynamic = "force-dynamic";

// Authed page: server-fetches buildings, hands them to the client poster.
export default async function ContractorQrPage() {
  const supabase = getServerSupabase();

  let buildings: { id: string; name: string; address?: string | null }[] = [];
  if (supabase) {
    const { data } = await supabase.from("buildings").select("id,name,address").order("name");
    buildings = (data ?? []) as typeof buildings;
  }

  // Optional GateLog interop: when the standalone GateLog app owns contractor
  // sign-in, point each building's poster at its GateLog URL instead.
  // GATELOG_SIGNIN_MAP = {"<supersdeck-building-id>": "https://gatelog…/s/<slug>"}
  let overrides: Record<string, string> = {};
  try {
    overrides = JSON.parse(process.env.GATELOG_SIGNIN_MAP ?? "{}");
  } catch {
    overrides = {};
  }

  return <QrPosterClient buildings={buildings} overrides={overrides} />;
}
