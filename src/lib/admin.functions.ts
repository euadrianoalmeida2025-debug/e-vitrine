import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ADMIN_EMAILS = ["diano.baiano2015@gmail.com"];

/**
 * Garante que o e-mail global autorizado tenha o papel admin e, para os
 * demais usuários, retorna somente as lojas das memberships próprias.
 *
 * A loja de cada administrador é criada como membership "owner", que é
 * reconhecida pelas políticas do tenant como permissão administrativa.
 */
export const ensureAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const claims = context.claims as { email?: string } | null;
    const email = claims?.email?.toLowerCase() ?? "";
    const isGlobalAdminEmail = ADMIN_EMAILS.includes(email);
    let admin = false;

    if (isGlobalAdminEmail) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .upsert(
          { user_id: context.userId, role: "admin" },
          { onConflict: "user_id,role", ignoreDuplicates: true },
        );

      admin = !roleError;
    }

    if (admin) {
      const { data: organizations, error } = await context.supabase
        .from("organizations")
        .select("id,name,slug,description,logo_url,primary_color,status")
        .eq("status", "active")
        .order("name", { ascending: true });

      return {
        admin: true,
        organizations: error ? [] : organizations ?? [],
      };
    }

    const { data: memberships, error: membershipsError } = await context.supabase
      .from("organization_members")
      .select("organization_id,role")
      .eq("user_id", context.userId);

    if (membershipsError) {
      return { admin: false, organizations: [] };
    }

    const ids = memberships?.map((item) => item.organization_id) ?? [];
    if (ids.length === 0) {
      return { admin: false, organizations: [] };
    }

    const { data: organizations, error: organizationsError } = await context.supabase
      .from("organizations")
      .select("id,name,slug,description,logo_url,primary_color,status")
      .in("id", ids)
      .eq("status", "active")
      .order("name", { ascending: true });

    return {
      admin: false,
      organizations: organizationsError ? [] : organizations ?? [],
    };
  });
