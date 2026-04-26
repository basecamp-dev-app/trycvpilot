type RequiredEnvKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "DEEPSEEK_API_KEY"
  | "DEEPSEEK_BASE_URL"
  | "APP_URL";

export function requireEnv(key: RequiredEnvKey) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getOptionalEnv(key: string) {
  return process.env[key] || "";
}
