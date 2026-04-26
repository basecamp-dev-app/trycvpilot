import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/dashboard" className="text-lg font-bold text-slate-950">
            TryCVPilot
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-700">
            <Link href="/generate" className="hover:text-slate-950">
              Generate
            </Link>
            <Link href="/billing" className="hover:text-slate-950">
              Billing
            </Link>
            <form action="/auth/signout" method="post">
              <button className="rounded-full border border-slate-300 px-4 py-2 hover:bg-slate-100">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
