import { NextResponse, type NextRequest } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { requireEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getUsageAllowance, recordGenerationUsage } from "@/lib/usage";
import type { GenerationResult } from "@/types/generation";

const MAX_EVIDENCE_CHARS = 30000;
const MAX_JOB_CHARS = 15000;
const MAX_QUESTIONS_CHARS = 8000;
const MAX_QUESTIONS = 12;
const DEEPSEEK_MODEL = "deepseek-chat";

const requestSchema = z.object({
  evidenceBank: z.string().trim().min(200, "Add at least 200 characters of evidence.").max(MAX_EVIDENCE_CHARS),
  jobDescription: z.string().trim().min(100, "Add at least 100 characters of job details.").max(MAX_JOB_CHARS),
  applicationQuestions: z.string().trim().max(MAX_QUESTIONS_CHARS).optional().default(""),
  cvPageTarget: z.union([z.literal(1), z.literal(2)]).optional().default(1),
});

const optionalNonEmptyString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(1).optional(),
);

const generationResultSchema = z.object({
  jobTitle: z.string().trim().min(1),
  cv: z.object({
    contact: z.object({
      name: optionalNonEmptyString,
      location: optionalNonEmptyString,
      email: optionalNonEmptyString,
      phone: optionalNonEmptyString,
      linkedin: optionalNonEmptyString,
      portfolio: optionalNonEmptyString,
    }).optional(),
    profile: z.string().trim().min(1),
    skills: z.array(z.string().trim().min(1)),
    experience: z.array(
      z.object({
        title: z.string().trim().min(1),
        organisation: optionalNonEmptyString,
        dates: optionalNonEmptyString,
        bullets: z.array(z.string().trim().min(1)),
      }),
    ),
    education: z.array(
      z.object({
        qualification: z.string().trim().min(1),
        institution: optionalNonEmptyString,
        dates: optionalNonEmptyString,
        details: z.array(z.string().trim().min(1)).optional(),
      }),
    ),
    additional: z.array(z.string().trim().min(1)).optional(),
  }),
  coverLetter: z.object({
    greeting: z.string().trim().min(1),
    body: z.array(z.string().trim().min(1)),
    signoff: z.string().trim().min(1),
  }),
  questionAnswers: z.array(
    z.object({
      question: z.string().trim().min(1),
      answer: z.string().trim().min(1),
    }),
  ),
  suggestions: z.array(z.string().trim().min(1)),
  evidenceWarnings: z.array(z.string().trim().min(1)),
}) satisfies z.ZodType<GenerationResult>;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Sign in before generating." }, { status: 401 });
  }

  let parsed: z.infer<typeof requestSchema>;
  try {
    parsed = requestSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const questions = splitQuestions(parsed.applicationQuestions);
  if (questions.length > MAX_QUESTIONS) {
    return NextResponse.json({ error: `Paste no more than ${MAX_QUESTIONS} application questions.` }, { status: 400 });
  }

  const allowance = await getUsageAllowance(user.id);
  if (!allowance.allowed) {
    return NextResponse.json({ error: "You have used your free generation for this week. Upgrade to generate more." }, { status: 402 });
  }

  let result: GenerationResult;
  try {
    result = await generateApplicationPack(parsed, questions);
  } catch (error) {
    console.error("DeepSeek generation failed", error);
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 502 });
  }

  await recordGenerationUsage(user.id, allowance.plan);

  return NextResponse.json({ result });
}

function splitQuestions(rawQuestions: string) {
  if (!rawQuestions.trim()) return [];
  return rawQuestions
    .split(/\n+/)
    .map((question) => question.trim())
    .filter(Boolean);
}

async function generateApplicationPack(input: z.infer<typeof requestSchema>, questions: string[]): Promise<GenerationResult> {
  const client = new OpenAI({
    apiKey: requireEnv("DEEPSEEK_API_KEY"),
    baseURL: requireEnv("DEEPSEEK_BASE_URL"),
  });

  const completion = await client.chat.completions.create({
    model: DEEPSEEK_MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You generate UK-style job application materials. Use only the user's supplied evidence. Never invent employers, qualifications, dates, metrics, achievements, technologies, certifications, or personal details. Put missing or weak evidence in warnings/suggestions, not the CV. Return only valid JSON matching the requested schema.",
      },
      {
        role: "user",
        content: buildGenerationPrompt(input, questions),
      },
    ],
  });

  const content = completion.choices[0]?.message.content;
  if (!content) {
    throw new Error("DeepSeek returned an empty response.");
  }

  const result = generationResultSchema.parse(JSON.parse(content));
  return validateGeneratedContact(result, input.evidenceBank);
}

function validateGeneratedContact(result: GenerationResult, evidenceBank: string): GenerationResult {
  const candidateName = result.cv.contact?.name;
  if (!candidateName) return result;

  const exactEvidenceName = findEvidenceSubstring(evidenceBank, candidateName);
  if (exactEvidenceName) {
    result.cv.contact = { ...result.cv.contact, name: exactEvidenceName };
    return result;
  }

  const remainingContact = { ...(result.cv.contact ?? {}) };
  delete remainingContact.name;
  result.cv.contact = Object.keys(remainingContact).length ? remainingContact : undefined;
  result.evidenceWarnings = [
    ...result.evidenceWarnings,
    "Removed candidate name because it did not appear exactly in the evidence bank.",
  ];
  return result;
}

function findEvidenceSubstring(evidenceBank: string, generatedValue: string) {
  const index = evidenceBank.toLocaleLowerCase().indexOf(generatedValue.toLocaleLowerCase());
  if (index === -1) return null;
  return evidenceBank.slice(index, index + generatedValue.length);
}

function buildGenerationPrompt(input: z.infer<typeof requestSchema>, questions: string[]) {
  return `Create a tailored application pack from the supplied inputs.

Return JSON with this shape. Omit unsupported optional properties rather than returning empty strings:
{
  "jobTitle": "string",
  "cv": {
    "contact": { "name": "string", "location": "string", "email": "string", "phone": "string", "linkedin": "string", "portfolio": "string" },
    "profile": "string",
    "skills": ["string"],
    "experience": [{ "title": "string", "organisation": "string", "dates": "string", "bullets": ["string"] }],
    "education": [{ "qualification": "string", "institution": "string", "dates": "string", "details": ["string"] }],
    "additional": ["string"]
  },
  "coverLetter": { "greeting": "string", "body": ["string"], "signoff": "string" },
  "questionAnswers": [{ "question": "string", "answer": "string" }],
  "suggestions": ["string"],
  "evidenceWarnings": ["string"]
}

Rules:
- CV target: ${input.cvPageTarget} A4 page${input.cvPageTarget === 1 ? "" : "s"}. Treat overflow as a failure.
- Return jobTitle as a concise role title derived from the job description only, for PDF filename metadata. Do not add employer names or unsupported context.
- Evidence bank is the sole source of truth. Do not infer, exaggerate, round up, or add unsupported skills, tools, qualifications, duties, dates, employers, metrics, or achievements.
- Contact details are transcription-critical. Copy candidate name, email, phone, location, LinkedIn, and portfolio exactly as written in the evidence bank.
- Do not normalise, correct spelling, infer, title-case, expand, abbreviate, or alter contact details.
- If the candidate name is present, cv.contact.name must be an exact substring from the evidence bank.
- Put candidate name/location/email/phone/links in cv.contact only when explicitly present in the evidence bank. Never use placeholders. If unsure, omit the field and add an evidence warning.
- Do not return empty strings. Omit unsupported optional fields instead.
- Lead with the most relevant verified experience. Relevance beats completeness.
- Keep bullets for each included role. Prefer concise bullets over full detail.
- Quantify only where the metric is verified.
- If too long, shorten/remove older or weaker material first.
- Vertical Space Rule for CV content: aim for a complete A4 page, but do not add filler. Prefer restoring relevant verified detail over adding weak content. Never invent or duplicate bullets to fill space. If the supplied evidence is too limited to fill the target page honestly, keep the CV concise and explain the gap in evidenceWarnings.
- ${input.cvPageTarget === 1 ? "One-page caps: profile max 2 short sentences, skills max 8, experience max 3 most relevant roles, bullets max 3 per role, education/additional only if useful." : "Two-page caps: include broader verified detail where relevant, but keep wording concise and avoid weak filler."}
- Include every application question exactly once in questionAnswers, in the same order.
- If there are no application questions, return an empty questionAnswers array.
- Put unsupported job requirements, weak evidence, or missing details in evidenceWarnings.
- Put practical improvement ideas in suggestions.
- Omit optional fields only when there is no supporting evidence. Optional fields include contact properties, organisation, dates, institution, education details, and additional.

Evidence bank:
${input.evidenceBank}

Job description:
${input.jobDescription}

Application questions:
${questions.length ? questions.map((question, index) => `${index + 1}. ${question}`).join("\n") : "None"}`;
}
