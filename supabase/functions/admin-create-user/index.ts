import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "Método no permitido." }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:5173";

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Faltan variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY." }, 500);
    }

    const authorization = req.headers.get("Authorization") ?? "";
    const token = authorization.replace("Bearer ", "").trim();

    if (!token) {
      return json({ error: "No autorizado. Falta sesión del administrador." }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: authData, error: authError } = await adminClient.auth.getUser(token);

    if (authError || !authData.user) {
      return json({ error: "No se pudo validar la sesión del administrador." }, 401);
    }

    const adminUser = authData.user;

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id,role,activo")
      .eq("id", adminUser.id)
      .single();

    if (profileError || !profile || profile.role !== "admin" || profile.activo !== true) {
      return json({ error: "Solo un administrador activo puede crear usuarios." }, 403);
    }

    const body = await req.json();
    const nombre = String(body?.nombre ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();

    if (!nombre) {
      return json({ error: "El nombre es obligatorio." }, 400);
    }

    if (!email || !email.includes("@")) {
      return json({ error: "El correo no es válido." }, 400);
    }

    const redirectTo = `${siteUrl.replace(/\/$/, "")}/set-password`;

    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        nombre,
        role: "usuario",
      },
    });

    if (inviteError) {
      return json({ error: inviteError.message }, 400);
    }

    const invitedUser = inviteData.user;

    if (invitedUser?.id) {
      const { error: upsertError } = await adminClient
        .from("profiles")
        .upsert(
          {
            id: invitedUser.id,
            email,
            nombre,
            role: "usuario",
            activo: true,
          },
          { onConflict: "id" }
        );

      if (upsertError) {
        return json({ error: upsertError.message }, 400);
      }
    }

    return json({
      ok: true,
      message: `Invitación enviada a ${email}.`,
      user: invitedUser
        ? {
            id: invitedUser.id,
            email: invitedUser.email,
          }
        : null,
    });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Error inesperado." }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
