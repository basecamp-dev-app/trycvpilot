import { AppShell } from "@/components/app-shell";

export default function BillingPage() {
  return (
    <AppShell>
      <section className="rounded-3xl border border-slate-200 bg-white p-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Billing</h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-700">
          Stripe Checkout and the Customer Portal will be connected in the payments phase. Subscription metadata will be stored in Supabase, but application content will not be stored.
        </p>
        <button disabled className="mt-6 rounded-full bg-slate-300 px-5 py-3 font-semibold text-slate-600">
          Upgrade coming soon
        </button>
      </section>
    </AppShell>
  );
}
