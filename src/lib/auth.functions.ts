import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GLOBAL_ADMIN_EMAIL = "diano.baiano2015@gmail.com";

type CriarContaInput = {
  email: string;
  password: string;
  storeName: string;
};

/**
 * Cria uma conta pelo servidor para que o cadastro feito pela própria loja
 * já fique com o e-mail confirmado. A chave de serviço nunca vai para o
 * navegador.
 *
 * Todos os usuários comuns recebem uma loja própria. O usuário dono fica
 * como owner da organização, papel tratado como administrador nas regras
 * de acesso da loja.
 *
 * O e-mail GLOBAL_ADMIN_EMAIL também recebe o papel global admin, permitindo
 * administrar todas as lojas ativas.
 */
export const criarContaAdministrador = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: CriarContaInput }) => {
    const email = String(data?.email ?? "").trim().toLowerCase();
    const password = String(data?.password ?? "");
    const storeName = String(data?.storeName ?? "").trim().slice(0, 80);

    if (!email || !email.includes("@")) {
      throw new Error("Informe um e-mail válido.");
    }

    if (password.length < 6) {
      throw new Error("A senha deve ter pelo menos 6 caracteres.");
    }

    if (!storeName) {
      throw new Error("Informe o nome da sua loja.");
    }

    const { data: createdUser, error: createUserError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: storeName,
          store_name: storeName,
        },
      });

    if (createUserError) {
      throw new Error(
        createUserError.message.toLowerCase().includes("already")
          ? "Este e-mail já está cadastrado."
          : createUserError.message,
      );
    }

    const user = createdUser.user;
    if (!user) {
      throw new Error("Não foi possível criar a conta.");
    }

    if (email === GLOBAL_ADMIN_EMAIL) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .upsert(
          { user_id: user.id, role: "admin" },
          { onConflict: "user_id,role", ignoreDuplicates: true },
        );

      if (roleError) {
        await supabaseAdmin.auth.admin.deleteUser(user.id);
        throw new Error(`Conta criada, mas não foi possível concluir a permissão global: ${roleError.message}`);
      }
    }

    const slugBase =
      storeName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 58) || "loja";

    const { data: organization, error: organizationError } = await supabaseAdmin
      .from("organizations")
      .insert({
        owner_user_id: user.id,
        name: storeName,
        slug: `${slugBase}-${user.id.slice(0, 8)}`,
        description: "Loja criada automaticamente a partir da estrutura G-Vitrine.",
        primary_color: "#16a34a",
      })
      .select("id,name,slug,status")
      .single();

    if (organizationError) {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      throw new Error(`Não foi possível criar a loja: ${organizationError.message}`);
    }

    return {
      userId: user.id,
      organization,
      emailConfirmed: true,
    };
  },
);
