import { mintIntakeToken } from "@/lib/intake-token";
import IntakeClient from "./IntakeClient";

// Server wrapper for the PUBLIC tenant intake page. Its only job is to mint
// the building-scoped, expiring intake token (src/lib/intake-token.ts) at
// request time and hand it to the client form — the anonymous write APIs
// (/api/work-orders, /api/intake/photo) require it once INTAKE_TOKEN_SECRET
// is configured. force-dynamic so a cached page can never serve a stale
// (expired) token.
export const dynamic = "force-dynamic";

export default function TenantIntakePage({
  params,
}: {
  params: { buildingCode: string };
}) {
  const buildingCode = params?.buildingCode ?? "";
  return (
    <IntakeClient
      buildingCode={buildingCode}
      intakeToken={mintIntakeToken(buildingCode)}
    />
  );
}
