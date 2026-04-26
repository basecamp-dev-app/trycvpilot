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
});

const generationResultSchema = z.object({
  cv: z.object({
    profile: z.string().trim().min(1),
    skills: z.array(z.string().trim().min(1)),
    experience: z.array(
      z.object({
        title: z.string().trim().min(1),
        organisation: z.string().trim().min(1).optional(),
        dates: z.string().trim().min(1).optional(),
        bullets: z.array(z.string().trim().min(1)),
      }),
    ),
    education: z.array(
      z.object({
        qualification: z.string().trim().min(1),
        institution: z.string().trim().min(1).optional(),
        dates: z.string().trim().min(1).optional(),
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
          "You generate UK-style job application materials. Use only the user's supplied evidence. Never invent employers, qualifications, dates, metrics, achievements, technologies, certifications, or personal details. If evidence is missing for a job requirement, mention it in evidenceWarnings or suggestions instead of fabricating a claim. Return only valid JSON matching the requested schema.",
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

  return generationResultSchema.parse(JSON.parse(content));
}

function buildGenerationPrompt(input: z.infer<typeof requestSchema>, questions: string[]) {
  return `Create a tailored application pack from the supplied inputs.

Return JSON with exactly this shape:
{
  "cv": {
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
- Keep all content evidence-only and tailored to the job description.
- Use concise, recruiter-friendly wording.
- Include every application question exactly once in questionAnswers, in the same order.
- If there are no application questions, return an empty questionAnswers array.
- Put unsupported job requirements, weak evidence, or missing details in evidenceWarnings.
- Put practical improvement ideas in suggestions.
- Omit optional fields only when there is no supporting evidence.

Evidence bank:
${input.evidenceBank}

Job description:
${input.jobDescription}

Application questions:
${questions.length ? questions.map((question, index) => `${index + 1}. ${question}`).join("\n") : "None"}`;
}
