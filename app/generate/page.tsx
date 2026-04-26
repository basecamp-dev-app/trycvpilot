import { AppShell } from "@/components/app-shell";
import { GenerationForm } from "@/app/generate/generation-form";

export default function GeneratePage() {
  return (
    <AppShell>
      <div className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Generate application materials</h1>
        <p className="mt-3 leading-7 text-slate-700">
          Paste your evidence bank, job description, and questions. The server validates and processes them transiently without saving the content.
        </p>
      </div>
      <GenerationForm />
    </AppShell>
  );
}
