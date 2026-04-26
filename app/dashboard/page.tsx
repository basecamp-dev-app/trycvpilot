import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getUsageAllowance } from "@/lib/usage";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const allowance = user ? await getUsageAllowance(user.id) : null;

  return (
    <AppShell>
      <div className="grid gap-6 md:grid-cols-[1fr_0.75fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Dashboard</h1>
          <p className="mt-3 text-slate-700">Generate tailored application materials from paste-per-generation inputs.</p>
          <Link href="/generate" className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800">
            Start a generation
          </Link>
        </section>
        <section className="rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-xl font-bold text-slate-950">Account</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="font-semibold text-slate-600">Email</dt>
              <dd className="mt-1 text-slate-950">{user?.email}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-600">Plan</dt>
              <dd className="mt-1 capitalize text-slate-950">{allowance?.plan ?? "free"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-600">Free generations used this week</dt>
              <dd className="mt-1 text-slate-950">{allowance?.isPaid ? "Paid plan" : `${allowance?.weeklyFreeUsed ?? 0} / 1`}</dd>
            </div>
          </dl>
        </section>
      </div>
    </AppShell>
  );
}
