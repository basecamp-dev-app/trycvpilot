import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUsageAllowance, recordGenerationUsage } from "@/lib/usage";
import type { GenerationResult } from "@/types/generation";

const MAX_EVIDENCE_CHARS = 30000;
const MAX_JOB_CHARS = 15000;
const MAX_QUESTIONS_CHARS = 8000;
const MAX_QUESTIONS = 12;

const requestSchema = z.object({
  evidenceBank: z.string().trim().min(200, "Add at least 200 characters of evidence.").max(MAX_EVIDENCE_CHARS),
  jobDescription: z.string().trim().min(100, "Add at least 100 characters of job details.").max(MAX_JOB_CHARS),
  applicationQuestions: z.string().trim().max(MAX_QUESTIONS_CHARS).optional().default(""),
});

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

  const result = createPlaceholderResult(questions);

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

function createPlaceholderResult(questions: string[]): GenerationResult {
  return {
    cv: {
      profile:
        "Placeholder CV profile. The next phase will replace this with evidence-only AI content generated from the supplied evidence bank and job description.",
      skills: ["Evidence-only tailoring", "Editable output", "No fabricated claims"],
      experience: [
        {
          title: "Placeholder experience section",
          bullets: ["AI generation is intentionally not connected yet in this first scaffold."],
        },
      ],
      education: [],
      additional: ["No sensitive application content was stored server-side."],
    },
    coverLetter: {
      greeting: "Dear hiring team,",
      body: [
        "This placeholder confirms the authenticated generation route, validation, usage limit check, and no-persistence flow are wired.",
        "The production AI prompt will only use supplied evidence and will flag unsupported requirements rather than inventing claims.",
      ],
      signoff: "Yours sincerely,",
    },
    questionAnswers: questions.map((question) => ({
      question,
      answer: "Placeholder answer. Real generation will answer only from the user's supplied evidence.",
    })),
    suggestions: ["Add quantified evidence where true and supported.", "Include missing job requirements only if you genuinely have relevant evidence."],
    evidenceWarnings: ["AI generation is not yet connected; this is a structured placeholder response."],
  };
}
