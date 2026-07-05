import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { ok: false, message: "Método no permitido." },
      405
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const siteUrl = Deno.env.get("SITE_URL") || "http://localhost:5173";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({
        ok: false,
        message: "Faltan variables de entorno de Supabase en la función.",
      });
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const redirectTo = String(body.redirectTo || `${siteUrl}/set-password`);

    if (!email) {
      return jsonResponse({
        ok: false,
        registered: false,
        message: "Ingresa un correo válido.",
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verifica primero si el correo existe en profiles.
    // profiles se crea automáticamente cuando el admin invita/crea usuarios.
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, activo")
      .ilike("email", email)
      .limit(1);

    if (profileError) {
      return jsonResponse({
        ok: false,
        registered: false,
        message: profileError.message || "No se pudo verificar el correo.",
      });
    }

    const profile = profiles?.[0];

    if (!profile) {
      return jsonResponse({
        ok: false,
        registered: false,
        message: "Este correo no está registrado como usuario.",
      });
    }

    if (profile.activo === false) {
      return jsonResponse({
        ok: false,
        registered: true,
        active: false,
        message: "Este usuario está inactivo. Contacta al administrador.",
      });
    }

    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
      email,
      { redirectTo }
    );

    if (resetError) {
      return jsonResponse({
        ok: false,
        registered: true,
        message: resetError.message || "No se pudo enviar el correo de recuperación.",
      });
    }

    return jsonResponse({
      ok: true,
      registered: true,
      message: "Correo de recuperación enviado.",
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      message: error instanceof Error ? error.message : "Error interno.",
    });
  }
});
