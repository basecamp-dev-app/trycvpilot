import { SiteHeader } from "@/components/site-header";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight text-slate-950">Privacy model</h1>
        <div className="mt-8 space-y-6 rounded-3xl border border-slate-200 bg-white p-8 leading-7 text-slate-700">
          <p>
            TryCVPilot is designed not to permanently store your evidence bank, job descriptions, application questions, generated CVs, cover letters, or answers.
          </p>
          <p>
            During generation, your inputs are submitted over HTTPS to a protected server route, sent to the AI provider, and discarded after the request completes. Generated content is returned to your browser for editing and export.
          </p>
          <p>
            Supabase stores only account, subscription, and usage metadata such as your user profile, plan state, Stripe identifiers, and non-sensitive usage timestamps.
          </p>
          <p>
            Request bodies and generated content must not be logged, stored in analytics, or written to database tables. If temporary background processing is added later, payloads should be encrypted and deleted quickly after completion or expiry.
          </p>
        </div>
      </main>
    </div>
  );
}
