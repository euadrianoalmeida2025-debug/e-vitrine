import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  atualizarCategoria,
  criarCategoria,
  excluirCategoria,
  fetchCategoriasAdmin,
  type Categoria,
} from "@/lib/loja";

export const Route = createFileRoute("/_authenticated/admin/categorias")({
  head: () => ({ meta: [
    { title: "Gerenciar categorias — AP SISTEMAS" },
    { name: "description", content: "Organize as categorias de produtos da loja AP SISTEMAS." },
    { property: "og:title", content: "Gerenciar categorias — AP SISTEMAS" },
    { property: "og:description", content: "Organize as categorias de produtos da loja." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: CategoriasAdmin,
});

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function CategoriasAdmin() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["categorias-admin"],
    queryFn: () => fetchCategoriasAdmin(),
  });
  const [form, setForm] = useState<Partial<Categoria> | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const invalidar = () => {
    void qc.invalidateQueries({ queryKey: ["categorias-admin"] });
    void qc.invalidateQueries({ queryKey: ["categorias-publicas"] });
    void qc.invalidateQueries({ queryKey: ["produtos-publicos"] });
    void qc.invalidateQueries({ queryKey: ["produtos-admin"] });
  };

  const salvar = useMutation({
    mutationFn: async (f: Partial<Categoria>) => {
      const nome = (f.nome ?? "").trim();
      const slug = (f.slug ?? "").trim();
      const ordem = Number(f.ordem ?? 0);
      if (!nome) throw new Error("Informe o nome da categoria.");
      if (!slug) throw new Error("Informe o slug da categoria.");
      if (f.id) {
        await atualizarCategoria(f.id, { nome, slug, ordem });
      } else {
        await criarCategoria({ nome, slug, ordem });
      }
    },
    onSuccess: () => {
      setForm(null);
      invalidar();
    },
    onError: (e: unknown) => setErro(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      await excluirCategoria(id);
    },
    onSuccess: invalidar,
    onError: (e: unknown) => setErro(e instanceof Error ? e.message : "Erro ao excluir"),
  });

  const categorias = useMemo(() => data, [data]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Categorias</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize os produtos em categorias para facilitar a navegação na loja.
          </p>
        </div>
        <button
          onClick={() => {
            setErro(null);
            setForm({ nome: "", slug: "", ordem: 0 });
          }}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Nova categoria
        </button>
      </div>

      {erro && !form && (
        <p className="mt-4 rounded-md bg-destructive/10 p-3 text-xs text-destructive">{erro}</p>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Ordem</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  Carregando...
                </td>
              </tr>
            )}
            {!isLoading && categorias.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  Nenhuma categoria cadastrada.
                </td>
              </tr>
            )}
            {categorias.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{c.nome}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.slug}</td>
                <td className="px-4 py-3">{c.ordem}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => {
                        setErro(null);
                        setForm({ ...c });
                      }}
                      className="rounded p-2 hover:bg-muted"
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Excluir a categoria "${c.nome}"?\n\nProdutos vinculados ficarão sem categoria.`)) {
                          excluir.mutate(c.id);
                        }
                      }}
                      className="rounded p-2 text-destructive hover:bg-destructive/10"
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4">
          <div className="my-8 w-full max-w-lg rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {form.id ? "Editar categoria" : "Nova categoria"}
              </h2>
              <button
                onClick={() => setForm(null)}
                className="rounded p-2 hover:bg-muted"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setErro(null);
                salvar.mutate(form);
              }}
            >
              <Campo label="Nome da categoria">
                <input
                  required
                  value={form.nome ?? ""}
                  onChange={(e) => {
                    const nome = e.target.value;
                    setForm((f) => ({
                      ...f,
                      nome,
                      slug: f?.id ? f.slug : slugify(nome),
                    }));
                  }}
                  className={inputCls}
                  placeholder="Ex.: Automação, IA, Sites"
                />
              </Campo>

              <Campo label="Slug (usado em URLs)">
                <input
                  required
                  value={form.slug ?? ""}
                  onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                  className={inputCls}
                  placeholder="automacao"
                />
              </Campo>

              <Campo label="Ordem de exibição">
                <input
                  type="number"
                  value={String(form.ordem ?? 0)}
                  onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })}
                  className={inputCls}
                />
              </Campo>

              {erro && (
                <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{erro}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setForm(null)}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvar.isPending}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {salvar.isPending ? "Salvando..." : "Salvar categoria"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}