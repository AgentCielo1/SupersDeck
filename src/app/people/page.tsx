import { redirect } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import PeopleList from "@/components/PeopleList";
import {
  createSupabaseServerClient,
  getCurrentUserProfile,
} from "@/lib/supabase-server";

// =============================================================================
//  /people — team & roles management (admin only)
// =============================================================================

export default async function PeoplePage() {
  const me = await getCurrentUserProfile();
  if (!me) redirect("/login");
  if (me.role !== "admin") {
    return (
      <>
        <PageHeader title="People" subtitle="Team & roles" />
        <EmptyState
          title="Admins only"
          message={`You're signed in as "${me.role}". Only admins can manage roles. Ask one of the admins to make this change.`}
        />
      </>
    );
  }

  const supabase = createSupabaseServerClient();
  const { data: profiles } = (await supabase!
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .order("created_at")) as {
    data: Array<{
      id: string;
      email: string;
      full_name: string | null;
      role: string;
      created_at: string;
    }>;
  };

  return (
    <>
      <PageHeader
        title="People"
        subtitle={`${profiles?.length ?? 0} active user${profiles?.length === 1 ? "" : "s"}.`}
        actions={
          <Link
            href="/people/invite"
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            + Invite user
          </Link>
        }
      />
      <PeopleList me={me} profiles={profiles ?? []} />
    </>
  );
}
