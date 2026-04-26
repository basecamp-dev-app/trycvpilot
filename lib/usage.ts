import { createServiceClient } from "@/lib/supabase/server";

const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing"];

export async function getUsageAllowance(userId: string) {
  const supabase = createServiceClient();

  const [{ data: subscription }, { count, error: usageError }] = await Promise.all([
    supabase.from("subscriptions").select("status,current_period_end").eq("user_id", userId).maybeSingle(),
    supabase
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "generation")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  if (usageError) {
    throw usageError;
  }

  const isPaid = Boolean(subscription?.status && ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status));
  const weeklyFreeUsed = count ?? 0;

  return {
    isPaid,
    weeklyFreeUsed,
    allowed: true,
    plan: isPaid ? "pro" : "free",
  };
}

export async function recordGenerationUsage(userId: string, plan: string) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("usage_events").insert({
    user_id: userId,
    type: "generation",
    plan_at_time: plan,
  });

  if (error) {
    throw error;
  }
}
