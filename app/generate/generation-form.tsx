"use client";

import { useState } from "react";
import type { GenerationResult } from "@/types/generation";

const MAX_EVIDENCE_CHARS = 30000;
const MAX_JOB_CHARS = 15000;
const MAX_QUESTIONS_CHARS = 8000;

export function GenerationForm() {
  const [evidenceBank, setEvidenceBank] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [applicationQuestions, setApplicationQuestions] = useState("");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitGeneration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidenceBank, jobDescription, applicationQuestions }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Generation failed.");
      }

      setResult(payload.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
      <form onSubmit={submitGeneration} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6">
        <Textarea label="Evidence bank" value={evidenceBank} onChange={setEvidenceBank} max={MAX_EVIDENCE_CHARS} placeholder="Work experience, education, grades, projects, skills, achievements, volunteering, certifications..." />
        <Textarea label="Job description or person specification" value={jobDescription} onChange={setJobDescription} max={MAX_JOB_CHARS} placeholder="Paste the role description, requirements, selection criteria, and employer context..." />
        <Textarea label="Application questions" value={applicationQuestions} onChange={setApplicationQuestions} max={MAX_QUESTIONS_CHARS} placeholder="Paste questions, one per line if possible. Maximum 12 questions for now." />
        <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Privacy notice: your inputs and generated content are not saved to the database. They are processed transiently for this request only.
        </div>
        {error ? <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
        <button disabled={loading} className="w-full rounded-full bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
          {loading ? "Generating..." : "Generate application pack"}
        </button>
      </form>
      <ResultsEditor result={result} onReset={() => setResult(null)} />
    </div>
  );
}

function Textarea({ label, value, onChange, max, placeholder }: { label: string; value: string; onChange: (value: string) => void; max: number; placeholder: string }) {
  const overLimit = value.length > max;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <label className="text-sm font-semibold text-slate-800">{label}</label>
        <span className={`text-xs ${overLimit ? "text-red-700" : "text-slate-500"}`}>{value.length.toLocaleString()} / {max.toLocaleString()}</span>
      </div>
      <textarea
        required={label !== "Application questions"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={7}
        placeholder={placeholder}
        className="w-full resize-y rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-slate-950"
      />
    </div>
  );
}

function ResultsEditor({ result, onReset }: { result: GenerationResult | null; onReset: () => void }) {
  if (!result) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-slate-600">
        <h2 className="text-xl font-bold text-slate-950">Editable results appear here</h2>
        <p className="mt-3 leading-7">The AI integration comes next. This first version returns a structured placeholder after auth, validation, and usage checks pass.</p>
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-950">Application pack</h2>
        <button onClick={onReset} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
          Start new
        </button>
      </div>
      <EditableBlock title="CV profile" initialValue={result.cv.profile} />
      <EditableBlock title="Skills" initialValue={result.cv.skills.join("\n")} />
      <EditableBlock title="Cover letter" initialValue={[result.coverLetter.greeting, ...result.coverLetter.body, result.coverLetter.signoff].join("\n\n")} />
      <EditableBlock title="Question answers" initialValue={result.questionAnswers.map((item) => `${item.question}\n${item.answer}`).join("\n\n")} />
      <Panel title="Suggestions" items={result.suggestions} />
      <Panel title="Evidence warnings" items={result.evidenceWarnings} />
      <div className="flex flex-wrap gap-3">
        <button disabled className="rounded-full bg-slate-300 px-4 py-2 text-sm font-semibold text-slate-600">Export PDF later</button>
        <button disabled className="rounded-full bg-slate-300 px-4 py-2 text-sm font-semibold text-slate-600">Export DOCX later</button>
      </div>
    </section>
  );
}

function EditableBlock({ title, initialValue }: { title: string; initialValue: string }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-800">{title}</label>
      <textarea defaultValue={initialValue} rows={5} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none focus:border-slate-950" />
    </div>
  );
}

function Panel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <h3 className="font-semibold text-slate-950">{title}</h3>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
        {items.map((item) => <li key={item}>- {item}</li>)}
      </ul>
    </div>
  );
}
