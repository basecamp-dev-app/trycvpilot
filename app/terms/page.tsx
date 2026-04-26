import { SiteHeader } from "@/components/site-header";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight text-slate-950">Terms</h1>
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 leading-7 text-slate-700">
          <p>
            Terms are a placeholder for the first production build. Before launch, add reviewed terms covering subscriptions, acceptable use, AI limitations, refunds, and user responsibilities.
          </p>
        </div>
      </main>
    </div>
  );
}
