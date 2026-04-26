export type GenerationResult = {
  jobTitle: string;
  cv: {
    contact?: {
      name?: string;
      location?: string;
      email?: string;
      phone?: string;
      linkedin?: string;
      portfolio?: string;
    };
    profile: string;
    skills: string[];
    experience: Array<{
      title: string;
      organisation?: string;
      dates?: string;
      bullets: string[];
    }>;
    education: Array<{
      qualification: string;
      institution?: string;
      dates?: string;
      details?: string[];
    }>;
    additional?: string[];
  };
  coverLetter: {
    greeting: string;
    body: string[];
    signoff: string;
  };
  questionAnswers: Array<{
    question: string;
    answer: string;
  }>;
  suggestions: string[];
  evidenceWarnings: string[];
};
