import { getSupabaseServerClient, hasSupabaseServerEnv } from "@/lib/supabase/server";

interface AdminAuthResult {
  ok: boolean;
  status: number;
  error?: string;
  method?: "api_key" | "supabase_jwt" | "open_mode";
}

function parseAdminEmails() {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export async function verifyAdminRequest(request: Request): Promise<AdminAuthResult> {
  const configuredApiKey = process.env.ADMIN_API_KEY;
  const strict = process.env.STRICT_ADMIN_AUTH === "true";
  const adminEmails = parseAdminEmails();

  const hasConfig = Boolean(configuredApiKey || adminEmails.length > 0);

  if (!hasConfig && !strict) {
    return { ok: true, status: 200, method: "open_mode" };
  }

  const requestApiKey = request.headers.get("x-admin-api-key");
  if (configuredApiKey && requestApiKey && requestApiKey === configuredApiKey) {
    return { ok: true, status: 200, method: "api_key" };
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (bearer && adminEmails.length > 0 && hasSupabaseServerEnv()) {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser(bearer);
    if (!error) {
      const email = data.user?.email?.toLowerCase();
      if (email && adminEmails.includes(email)) {
        return { ok: true, status: 200, method: "supabase_jwt" };
      }
    }
  }

  return {
    ok: false,
    status: 401,
    error:
      "Unauthorized admin action. Provide x-admin-api-key or a Bearer token for an email listed in ADMIN_EMAILS."
  };
}
