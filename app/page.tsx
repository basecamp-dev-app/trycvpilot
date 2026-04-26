import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800">
              1 free evidence-only generation every week
            </p>
            <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-slate-950 sm:text-6xl">
              Tailored job applications without invented claims.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
              Paste your evidence bank, the job description, and application questions. TryCVPilot returns an editable CV,
              cover letter, and answers based only on what you supplied.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/auth" className="rounded-full bg-slate-950 px-6 py-3 text-center font-semibold text-white hover:bg-slate-800">
                Start generating
              </Link>
              <Link href="/privacy" className="rounded-full border border-slate-300 px-6 py-3 text-center font-semibold text-slate-800 hover:bg-white">
                Read the privacy model
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              {["Paste evidence", "Paste job details", "Paste questions", "Generate, edit, export"].map((step, index) => (
                <div key={step} className="flex gap-4 rounded-2xl bg-slate-50 p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <p className="font-semibold text-slate-900">{step}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Sensitive application content is processed transiently during generation and is not saved to our database.
            </div>
          </div>
        </section>
        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:px-6 md:grid-cols-3">
            <Feature title="Evidence-only" body="The prompt forbids fabricated roles, qualifications, dates, tools, metrics, and achievements." />
            <Feature title="Private by default" body="Evidence banks, job descriptions, questions, and generated outputs are not persisted server-side." />
            <Feature title="Paid-product basics" body="Auth-gated generation, free weekly usage, and subscription-ready account metadata." />
          </div>
        </section>
      </main>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <p className="mt-3 leading-7 text-slate-700">{body}</p>
    </div>
  );
}
