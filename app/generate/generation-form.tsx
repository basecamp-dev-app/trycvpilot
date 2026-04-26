"use client";

import { useEffect, useRef, useState } from "react";
import type { GenerationResult } from "@/types/generation";

const MAX_EVIDENCE_CHARS = 30000;
const MAX_JOB_CHARS = 15000;
const MAX_QUESTIONS_CHARS = 8000;
const A4_HEIGHT_MM = 297;
const PAGE_MARGIN_MM = 20;
const A4_CONTENT_HEIGHT_MM = A4_HEIGHT_MM - PAGE_MARGIN_MM * 2;

type CvPageTarget = 1 | 2;
type GeneratedCv = GenerationResult["cv"];

export function GenerationForm() {
  const [evidenceBank, setEvidenceBank] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [applicationQuestions, setApplicationQuestions] = useState("");
  const [cvPageTarget, setCvPageTarget] = useState<CvPageTarget>(1);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [resultVersion, setResultVersion] = useState(0);
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
        body: JSON.stringify({ evidenceBank, jobDescription, applicationQuestions, cvPageTarget }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Generation failed.");
      }

      setResult(payload.result);
      setResultVersion((version) => version + 1);
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
        <fieldset className="rounded-2xl border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-800">CV length</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <CvLengthOption value={1} selected={cvPageTarget} onChange={setCvPageTarget} title="1 page" body="Default and recommended for most roles." />
            <CvLengthOption value={2} selected={cvPageTarget} onChange={setCvPageTarget} title="2 pages" body="Use only when the role needs more verified detail." />
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-600">The selected length is treated as a strict A4 target. The preview checks for overflow and obvious underfill before printing.</p>
        </fieldset>
        <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Privacy notice: your inputs and generated content are not saved to the database. They are processed transiently for this request only.
        </div>
        {error ? <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
        <button disabled={loading} className="w-full rounded-full bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
          {loading ? "Generating..." : "Generate application pack"}
        </button>
      </form>
      <ResultsEditor key={resultVersion} result={result} cvPageTarget={cvPageTarget} onReset={() => setResult(null)} />
    </div>
  );
}

function CvLengthOption({ value, selected, onChange, title, body }: { value: CvPageTarget; selected: CvPageTarget; onChange: (value: CvPageTarget) => void; title: string; body: string }) {
  return (
    <label className={`cursor-pointer rounded-2xl border p-4 ${selected === value ? "border-slate-950 bg-slate-50" : "border-slate-200 bg-white"}`}>
      <input type="radio" name="cvPageTarget" value={value} checked={selected === value} onChange={() => onChange(value)} className="sr-only" />
      <span className="block text-sm font-semibold text-slate-950">{title}</span>
      <span className="mt-1 block text-xs leading-5 text-slate-600">{body}</span>
    </label>
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

function ResultsEditor({ result, cvPageTarget, onReset }: { result: GenerationResult | null; cvPageTarget: CvPageTarget; onReset: () => void }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [editedCv, setEditedCv] = useState<GeneratedCv | null>(result?.cv ?? null);
  const [fitStatus, setFitStatus] = useState<{ type: "ok" | "warning"; message: string }>({
    type: "warning",
    message: "Generate a CV to check the A4 page fit.",
  });

  useEffect(() => {
    if (!editedCv || !contentRef.current) return;

    const updateFitStatus = () => {
      if (!contentRef.current) return;
      const pxPerMm = getPixelsPerMillimetre();
      const contentHeight = contentRef.current.getBoundingClientRect().height;
      const onePageHeight = A4_CONTENT_HEIGHT_MM * pxPerMm;
      const targetHeight = onePageHeight * cvPageTarget;
      const underfillLimit = targetHeight * 0.9;

      if (contentHeight > targetHeight) {
        setFitStatus({ type: "warning", message: `CV overflows the selected ${cvPageTarget}-page A4 target. Shorten or remove weaker material before exporting.` });
        return;
      }

      if (cvPageTarget === 2 && contentHeight <= onePageHeight) {
        setFitStatus({ type: "warning", message: "This CV still fits on one page. Select 1 page, or add relevant verified detail before exporting as a 2-page CV." });
        return;
      }

      if (contentHeight < underfillLimit) {
        setFitStatus({ type: "warning", message: `CV underfills the selected ${cvPageTarget}-page A4 target. Increase spacing or restore relevant verified detail before exporting.` });
        return;
      }

      setFitStatus({ type: "ok", message: `CV preview fits the selected ${cvPageTarget}-page A4 target. Use Print / Save as PDF for export.` });
    };

    updateFitStatus();
    const observer = new ResizeObserver(updateFitStatus);
    observer.observe(contentRef.current);
    window.addEventListener("resize", updateFitStatus);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateFitStatus);
    };
  }, [cvPageTarget, editedCv]);

  if (!result || !editedCv) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-slate-600">
        <h2 className="text-xl font-bold text-slate-950">Editable results appear here</h2>
        <p className="mt-3 leading-7">Generated CVs, cover letters, and question answers will appear here for review and export.</p>
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
      <div className={`rounded-2xl p-4 text-sm leading-6 ${fitStatus.type === "ok" ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
        {fitStatus.message}
      </div>
      <CvPreview cv={editedCv} contentRef={contentRef} pageTarget={cvPageTarget} />
      <EditableBlock title="CV profile" value={editedCv.profile} onChange={(profile) => setEditedCv({ ...editedCv, profile })} />
      <EditableBlock title="Skills" value={editedCv.skills.join("\n")} onChange={(skills) => setEditedCv({ ...editedCv, skills: skills.split("\n").map((skill) => skill.trim()).filter(Boolean) })} />
      <EditableBlock title="Cover letter" initialValue={[result.coverLetter.greeting, ...result.coverLetter.body, result.coverLetter.signoff].join("\n\n")} />
      <EditableBlock title="Question answers" initialValue={result.questionAnswers.map((item) => `${item.question}\n${item.answer}`).join("\n\n")} />
      <Panel title="Suggestions" items={result.suggestions} />
      <Panel title="Evidence warnings" items={result.evidenceWarnings} />
      <div className="flex flex-wrap gap-3">
        <button onClick={() => printCv(fitStatus, result.jobTitle, editedCv.contact?.name)} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">{fitStatus.type === "ok" ? "Print / Save PDF" : "Review fit / Print"}</button>
        <button disabled className="rounded-full bg-slate-300 px-4 py-2 text-sm font-semibold text-slate-600">Export DOCX later</button>
      </div>
    </section>
  );
}

function CvPreview({ cv, contentRef, pageTarget }: { cv: GeneratedCv; contentRef: React.RefObject<HTMLDivElement | null>; pageTarget: CvPageTarget }) {
  const contactItems = [cv.contact?.location, cv.contact?.email, cv.contact?.phone, cv.contact?.linkedin, cv.contact?.portfolio].filter(Boolean);

  return (
    <div className="overflow-x-auto rounded-2xl bg-slate-100 p-4">
      <article className={`cv-print-root mx-auto bg-white text-slate-950 shadow-sm ${pageTarget === 1 ? "cv-compact" : ""}`} style={{ minHeight: `${A4_HEIGHT_MM * pageTarget}mm` }}>
        <div ref={contentRef} className="cv-print-content">
          <header className="cv-header">
            <h1>{cv.contact?.name ?? "CV"}</h1>
            {contactItems.length ? <p className="cv-contact">{contactItems.join(" | ")}</p> : null}
          </header>

          <section className="cv-section cv-profile">
            <h2>Profile</h2>
            <p>{cv.profile}</p>
          </section>

          {cv.skills.length ? (
            <section className="cv-section">
              <h2>Key Skills</h2>
              <ul className="cv-skills">
                {cv.skills.map((skill) => <li key={skill}>{skill}</li>)}
              </ul>
            </section>
          ) : null}

          {cv.experience.length ? (
            <section className="cv-section">
              <h2>Experience</h2>
              <div className="cv-entries">
                {cv.experience.map((role) => (
                  <div className="cv-entry" key={`${role.title}-${role.organisation ?? ""}-${role.dates ?? ""}`}>
                    <div className="cv-entry-row">
                      <h3>{role.title}</h3>
                      {role.dates ? <p className="cv-meta">{role.dates}</p> : null}
                    </div>
                    {role.organisation ? <p className="cv-org">{role.organisation}</p> : null}
                    <ul className="cv-bullets">
                      {role.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {cv.education.length ? (
            <section className="cv-section">
              <h2>Education</h2>
              <div className="cv-entries">
                {cv.education.map((item) => (
                  <div className="cv-entry" key={`${item.qualification}-${item.institution ?? ""}-${item.dates ?? ""}`}>
                    <div className="cv-entry-row">
                      <h3>{item.qualification}</h3>
                      {item.dates ? <p className="cv-meta">{item.dates}</p> : null}
                    </div>
                    {item.institution ? <p className="cv-org">{item.institution}</p> : null}
                    {item.details?.length ? (
                      <ul className="cv-bullets">
                        {item.details.map((detail) => <li key={detail}>{detail}</li>)}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {cv.additional?.length ? (
            <section className="cv-section">
              <h2>Additional</h2>
              <ul className="cv-bullets">
                {cv.additional.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          ) : null}
        </div>
      </article>
    </div>
  );
}

function printCv(fitStatus: { type: "ok" | "warning"; message: string }, jobTitle: string, candidateName?: string) {
  if (fitStatus.type === "warning") {
    const confirmed = window.confirm(`${fitStatus.message}\n\nThe CV may not meet the selected page target. Print anyway?`);
    if (!confirmed) return;
  }

  const originalTitle = document.title;
  document.title = buildPdfFilename(jobTitle, candidateName);
  window.print();
  window.setTimeout(() => {
    document.title = originalTitle;
  }, 1000);
}

function buildPdfFilename(jobTitle: string, candidateName?: string) {
  const safeJobTitle = safeFilenamePart(jobTitle) || "Job Application";
  const safeName = safeFilenamePart(candidateName) || "Candidate";
  return `${safeJobTitle} - ${safeName}.pdf`;
}

function safeFilenamePart(value?: string) {
  return (value ?? "")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function getPixelsPerMillimetre() {
  const marker = document.createElement("div");
  marker.style.position = "absolute";
  marker.style.visibility = "hidden";
  marker.style.width = "100mm";
  document.body.appendChild(marker);
  const pixelsPerMillimetre = marker.getBoundingClientRect().width / 100;
  marker.remove();
  return pixelsPerMillimetre;
}

function EditableBlock({ title, initialValue, value, onChange }: { title: string; initialValue?: string; value?: string; onChange?: (value: string) => void }) {
  const textareaProps = onChange ? { value: value ?? "", onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value) } : { defaultValue: initialValue ?? "" };

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-800">{title}</label>
      <textarea {...textareaProps} rows={5} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none focus:border-slate-950" />
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
