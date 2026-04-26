import { AuthForm } from "@/app/auth/auth-form";
import { SiteHeader } from "@/components/site-header";

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="mx-auto grid max-w-5xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[0.9fr_1.1fr] md:items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-950">Sign in to generate.</h1>
          <p className="mt-4 leading-7 text-slate-700">
            Authentication is required before any generation. Anonymous free generations are not available to protect the service from abuse.
          </p>
          <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Your application content is not stored in Supabase. Only account, subscription, and usage metadata are stored.
          </p>
        </div>
        <AuthForm />
      </main>
    </div>
  );
}
