import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <p className="font-semibold text-emerald-700">Simple pricing</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">Start free, upgrade when you need more.</h1>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Plan name="Free" price="£0" cta="Sign in" href="/auth" items={["1 successful generation per week", "Evidence-only generation", "Editable results", "No server-side storage of application content"]} />
          <Plan name="Pro" price="Coming soon" cta="Join with an account" href="/auth" featured items={["Higher monthly limits or fair use", "Stripe subscription billing", "Billing portal access", "Same privacy-first processing model"]} />
        </div>
      </main>
    </div>
  );
}

function Plan({ name, price, cta, href, items, featured = false }: { name: string; price: string; cta: string; href: string; items: string[]; featured?: boolean }) {
  return (
    <section className={`rounded-3xl border p-8 ${featured ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-950"}`}>
      <h2 className="text-2xl font-bold">{name}</h2>
      <p className={`mt-4 text-4xl font-bold ${featured ? "text-white" : "text-slate-950"}`}>{price}</p>
      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li key={item} className={featured ? "text-slate-200" : "text-slate-700"}>- {item}</li>
        ))}
      </ul>
      <Link href={href} className={`mt-8 inline-flex rounded-full px-5 py-3 font-semibold ${featured ? "bg-white text-slate-950 hover:bg-slate-100" : "bg-slate-950 text-white hover:bg-slate-800"}`}>
        {cta}
      </Link>
    </section>
  );
}
