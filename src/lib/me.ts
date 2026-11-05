import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "./access";

export type Me = { id: string; email: string; fullName: string; roles: AppRole[]; isActive: boolean };

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async (): Promise<Me | null> => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("email,full_name,is_active").eq("id", u.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", u.user.id),
    ]);
    return {
      id: u.user.id,
      email: p?.email ?? u.user.email ?? "",
      fullName: p?.full_name ?? "",
      isActive: p?.is_active ?? false,
      roles: (r ?? []).map((x) => x.role as AppRole),
    };
  },
});

export function useMe() {
  return useQuery(meQuery).data ?? null;
}

export const ACTION_LABELS: Record<string, string> = {
  "auth.login_attempt": "Login attempt",
  "auth.login": "Sign in",
  "auth.logout": "Sign out",
  "document.upload": "Uploaded document",
  "document.download": "Downloaded document",
  "document.preview": "Previewed document",
  "document.update": "Updated document",
  "document.delete": "Deleted document",
  "permission.grant": "Granted access",
  "permission.change": "Changed access",
  "permission.revoke": "Revoked access",
  "user.create": "Created user",
  "user.activate": "Reactivated user",
  "user.deactivate": "Deactivated user",
  "user.role_change": "Changed role",
  "audit.verify": "Verified audit chain",
  "admin.list_users": "Listed users",
};

export function fmtDate(s: string) {
  return new Date(s).toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
