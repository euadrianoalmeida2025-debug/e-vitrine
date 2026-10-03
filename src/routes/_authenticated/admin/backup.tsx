import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Download, Upload, DatabaseBackup } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { getActiveOrganizationId } from "@/lib/saas";

export const Route = createFileRoute("/_authenticated/admin/backup")({
  head: () => ({
    meta: [
      { title: "Backup da loja — Painel administrativo" },
      { name: "description", content: "Exporte e importe um backup completo da sua loja." },
    ],
  }),
  component: BackupAdmin,
});

type Linha = Record<string, unknown>;
type Backup = {
  tipo: "gvitrine-backup";
  versao: 1;
  gerado_em: string;
  categorias: Linha[];
  produtos: Linha[];
  configuracoes: Linha[];
  leads: Linha[];
};

function escopo<T extends { eq: any; is: any }>(q: T, orgId: string | null) {
  return orgId ? q.eq("organization_id", orgId) : q.is("organization_id", null);
}

async function buscar(tabela: "categorias" | "produtos" | "configuracoes" | "leads", orgId: string | null) {
  const { data, error } = await escopo(supabase.from(tabela).select("*"), orgId);
  if (error) throw error;
  return (data ?? []) as Linha[];
}

function BackupAdmin() {
  const [ocupado, setOcupado] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);

  async function exportar() {
    setOcupado(true);
    try {
      const orgId = getActiveOrganizationId();
      const backup: Backup = {
        tipo: "gvitrine-backup",
        versao: 1,
        gerado_em: new Date().toISOString(),
        categorias: await buscar("categorias", orgId),
        produtos: await buscar("produtos", orgId),
        configuracoes: await buscar("configuracoes", orgId),
        leads: await buscar("leads", orgId),
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-loja-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(
        `Backup exportado: ${backup.produtos.length} produtos, ${backup.categorias.length} categorias, ${backup.leads.length} leads.`,
      );
    } catch (e) {
      toast.error("Não foi possível exportar: " + (e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  async function importar(file: File) {
    if (!confirm("Importar este backup? Itens com o mesmo nome/endereço serão atualizados e os novos serão adicionados.")) return;
    setOcupado(true);
    try {
      const backup = JSON.parse(await file.text()) as Backup;
      if (backup?.tipo !== "gvitrine-backup") throw new Error("Arquivo não é um backup da loja.");
      const orgId = getActiveOrganizationId();
      const limpar = (l: Linha) => {
        const { id: _id, organization_id: _o, created_at: _c, updated_at: _u, ...resto } = l;
        return resto;
      };

      // Categorias (por slug)
      const catsAtuais = await buscar("categorias", orgId);
      const mapaCat: Record<string, string> = {};
      for (const c of backup.categorias ?? []) {
        const existente = catsAtuais.find((x) => x["slug"] === c["slug"]);
        if (existente) {
          const { error } = await supabase.from("categorias").update(limpar(c) as never).eq("id", existente["id"] as string);
          if (error) throw error;
          mapaCat[c["id"] as string] = existente["id"] as string;
        } else {
          const { data, error } = await supabase
            .from("categorias")
            .insert({ ...limpar(c), organization_id: orgId } as never)
            .select("id")
            .single();
          if (error) throw error;
          mapaCat[c["id"] as string] = data.id;
        }
      }

      // Produtos (por slug)
      const prodsAtuais = await buscar("produtos", orgId);
      const mapaProd: Record<string, string> = {};
      for (const p of backup.produtos ?? []) {
        const dados = {
          ...limpar(p),
          categoria_id: p["categoria_id"] ? mapaCat[p["categoria_id"] as string] ?? null : null,
        };
        const existente = prodsAtuais.find((x) => x["slug"] === p["slug"]);
        if (existente) {
          const { error } = await supabase.from("produtos").update(dados as never).eq("id", existente["id"] as string);
          if (error) throw error;
          mapaProd[p["id"] as string] = existente["id"] as string;
        } else {
          const { data, error } = await supabase
            .from("produtos")
            .insert({ ...dados, organization_id: orgId } as never)
            .select("id")
            .single();
          if (error) throw error;
          mapaProd[p["id"] as string] = data.id;
        }
      }

      // Configurações (por chave)
      const cfgAtuais = await buscar("configuracoes", orgId);
      for (const c of backup.configuracoes ?? []) {
        const existente = cfgAtuais.find((x) => x["chave"] === c["chave"]);
        const q = existente
          ? supabase.from("configuracoes").update({ valor: c["valor"] } as never).eq("id", existente["id"] as string)
          : supabase.from("configuracoes").insert({ chave: c["chave"], valor: c["valor"], organization_id: orgId } as never);
        const { error } = await q;
        if (error) throw error;
      }

      // Leads (sem duplicar)
      const leadsAtuais = await buscar("leads", orgId);
      const novosLeads = (backup.leads ?? [])
        .filter((l) => !leadsAtuais.some((x) => x["nome"] === l["nome"] && x["created_at"] === l["created_at"]))
        .map((l) => {
          const { id: _id, organization_id: _o, ...resto } = l;
          return {
            ...resto,
            produto_id: l["produto_id"] ? mapaProd[l["produto_id"] as string] ?? null : null,
            organization_id: orgId,
          };
        });
      if (novosLeads.length) {
        const { error } = await supabase.from("leads").insert(novosLeads as never);
        if (error) throw error;
      }

      toast.success("Backup importado com sucesso!");
    } catch (e) {
      toast.error("Não foi possível importar: " + (e as Error).message);
    } finally {
      setOcupado(false);
      if (arquivoRef.current) arquivoRef.current.value = "";
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <DatabaseBackup className="size-6 text-primary" />
        <div>
          <h1 className="text-xl font-semibold">Backup da loja</h1>
          <p className="text-sm text-muted-foreground">
            Salve uma cópia completa (produtos, categorias, configurações e leads) ou restaure a partir de um arquivo.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-medium">Exportar backup</h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">Baixa um arquivo com todos os dados da loja.</p>
          <Button onClick={exportar} disabled={ocupado} className="w-full">
            <Download className="size-4" /> Exportar
          </Button>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-medium">Importar backup</h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">Restaura os dados a partir de um arquivo exportado.</p>
          <input
            ref={arquivoRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importar(e.target.files[0])}
          />
          <Button variant="outline" onClick={() => arquivoRef.current?.click()} disabled={ocupado} className="w-full">
            <Upload className="size-4" /> Importar
          </Button>
        </div>
      </div>
      {ocupado && <p className="text-sm text-muted-foreground">Processando, aguarde…</p>}
    </div>
  );
}