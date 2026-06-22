import { createSupabaseServerClient } from "@/lib/supabase-server";
import QrPosterClient from "./QrPosterClient";

export const dynamic = "force-dynamic";

// Authed page: server-fetches buildings, hands them to the client poster.
export default async function ContractorQrPage() {
  const supabase = createSupabaseServerClient();

  let buildings: { id: string; name: string; address?: string | null }[] = [];
  if (supabase) {
    const { data } = await supabase.from("buildings").select("id,name,address").order("name");
    buildings = (data ?? []) as typeof buildings;
  }

  return <QrPosterClient buildings={buildings} />;
}
