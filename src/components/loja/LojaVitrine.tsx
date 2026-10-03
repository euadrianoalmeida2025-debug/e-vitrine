import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Code2, Headphones, Moon, Search, Send, Shield, Star, Sun, Tag, Tags, Zap, LayoutDashboard } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { VideoBanner } from "@/components/loja/VideoBanner";
import { HelpButton } from "@/components/loja/HelpButton";
import { ProductCard } from "@/components/loja/ProductCard";
import {
  ajudaPadrao,
  bannerPadrao,
  cardTextPadrao,
  criarLead,
  fetchCategorias,
  fetchConfig,
  fetchProdutosPublicos,
  marcaPadrao,
  mensagemLeadWhatsapp,
  whatsappLink,
  type AjudaConfig,
  type BannerConfig,
  type CardTextConfig,
  type Categoria,
  type MarcaConfig,
} from "@/lib/loja";

const features = [
  { icon: Code2, title: "Código-fonte completo", desc: "Você recebe tudo: front, back e documentação." },
  { icon: Zap, title: "Pronto para uso", desc: "Sistemas testados e prontos para deploy imediato." },
  { icon: Shield, title: "Compra 100% segura", desc: "Pagamento protegido e garantia de 7 dias." },
  { icon: Headphones, title: "Suporte dedicado", desc: "Time pronto para ajudar via WhatsApp e Discord." },
];

const faqs = [
  { q: "Como recebo meu produto após a compra?", a: "Logo após a confirmação do pagamento você recebe por e-mail o acesso à área de membros com download e documentação." },
  { q: "Posso revender o sistema para meus clientes?", a: "Sim. Todos os produtos possuem licença para uso comercial e revenda ilimitada." },
  { q: "Existe garantia?", a: "Sim, oferecemos 7 dias de garantia incondicional." },
  { q: "Os códigos recebem atualizações?", a: "Sim. Atualizações gratuitas na sua área de membros." },
  { q: "Tem suporte técnico?", a: "Sim, suporte via WhatsApp e Discord." },
  { q: "Quais formas de pagamento aceitas?", a: "Pix, cartão de crédito em até 12x e boleto bancário." },
];

const POR_PAGINA = 12;


function LeadCapture({ organizationId }: { organizationId?: string | null }) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [linkWhats, setLinkWhats] = useState("");

  const ajuda = useQuery<AjudaConfig>({ queryKey: ["cfg", "ajuda", organizationId ?? "legacy"], queryFn: () => fetchConfig("ajuda", ajudaPadrao, organizationId ?? null) });

  const enviar = useMutation({
    mutationFn: async () => {
      const dados = {
        nome: nome.trim(),
        email: email.trim() || null,
        telefone: telefone.trim() || null,
        mensagem: mensagem.trim() || null,
      };
      await criarLead(dados, organizationId ?? null);
      return dados;
    },
    onSuccess: (dados) => {
      setOk(true);
      const link = whatsappLink(ajuda.data?.numero ?? ajudaPadrao.numero, mensagemLeadWhatsapp(dados));
      setLinkWhats(link);
      if (typeof window !== "undefined") window.open(link, "_blank", "noopener,noreferrer");
      setNome("");
      setEmail("");
      setTelefone("");
      setMensagem("");
      void qc.invalidateQueries({ queryKey: ["leads-admin"] });
    },
    onError: (e: unknown) => setErro(e instanceof Error ? e.message : "Não foi possível enviar. Tente novamente."),
  });


  return (
    <section id="contato" className="border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Fale com um especialista</h2>
          <p className="mt-3 text-muted-foreground">
            Tem dúvidas sobre qual produto escolher? Deixe seu contato e a gente te ajuda.
          </p>
        </div>

        {ok ? (
          <div className="mt-8 rounded-xl border border-primary/30 bg-primary/10 p-8 text-center">
            <Check className="mx-auto mb-3 h-8 w-8 text-primary" />
            <p className="font-semibold">Recebemos seu contato! Obrigado.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Seu contato foi registrado no painel e a mensagem foi aberta no WhatsApp.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {linkWhats && (
                <a
                  href={linkWhats}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  <Send className="h-4 w-4" /> Abrir no WhatsApp
                </a>
              )}
              <button
                onClick={() => setOk(false)}
                className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Enviar outro contato
              </button>
            </div>

          </div>
        ) : (
          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setErro(null);
              enviar.mutate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Nome *</span>
                <input
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Seu nome"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Telefone / WhatsApp</span>
                <input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="(11) 99999-9999"
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder="seu@email.com"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Mensagem</span>
              <textarea
                rows={3}
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder="Quero saber mais sobre..."
              />
            </label>

            {erro && <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{erro}</p>}

            <button
              type="submit"
              disabled={enviar.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60 sm:w-auto"
            >
              <Send className="h-4 w-4" />
              {enviar.isPending ? "Enviando..." : "Enviar contato"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

export type LojaVitrineProps = {
  organizationId?: string | null;
  organizationSlug?: string | null;
  organizationName?: string | null;
  showAdminLink?: boolean;
};

export function LojaVitrine({
  organizationId = null,
  organizationSlug = null,
  organizationName = null,
  showAdminLink = true,
}: LojaVitrineProps) {
  const [query, setQuery] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>("Todas");
  const [pagina, setPagina] = useState(1);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  const produtos = useQuery({ queryKey: ["produtos-publicos", organizationId ?? "legacy"], queryFn: () => fetchProdutosPublicos(organizationId ?? null) });
  const categorias = useQuery<Categoria[]>({ queryKey: ["categorias-publicas", organizationId ?? "legacy"], queryFn: () => fetchCategorias(organizationId ?? null) });
  const banner = useQuery<BannerConfig>({ queryKey: ["cfg", "banner", organizationId ?? "legacy"], queryFn: () => fetchConfig("banner", bannerPadrao, organizationId ?? null) });
  const ajuda = useQuery<AjudaConfig>({ queryKey: ["cfg", "ajuda", organizationId ?? "legacy"], queryFn: () => fetchConfig("ajuda", ajudaPadrao, organizationId ?? null) });
  const marca = useQuery<MarcaConfig>({ queryKey: ["cfg", "marca", organizationId ?? "legacy"], queryFn: () => fetchConfig("marca", marcaPadrao, organizationId ?? null) });
  const cardTextos = useQuery<CardTextConfig>({ queryKey: ["cfg", "card_textos", organizationId ?? "legacy"], queryFn: () => fetchConfig("card_textos", cardTextPadrao, organizationId ?? null) });

  useEffect(() => {
    setMounted(true);
    const saved = window.localStorage.getItem("theme");
    setTheme(saved === "light" || saved === "dark" ? saved : "light");
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  const lista = produtos.data ?? [];
  const destaques = lista.filter((p) => p.secao === "destaque");
  const vitrine = lista.filter((p) => p.secao !== "destaque");

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vitrine.filter((p) => {
      const naCategoria = categoriaAtiva === "Todas" || p.categoria_id === categoriaAtiva;
      const naBusca = !q || p.titulo.toLowerCase().includes(q) || p.tags?.some((t) => t.toLowerCase().includes(q));
      return naCategoria && naBusca;
    });
  }, [vitrine, query, categoriaAtiva]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            {marca.data?.logo_url ? (
              <img
                src={marca.data.logo_url}
                alt={marca.data.nome || "Logomarca"}
                style={{ height: marca.data.altura_logo || 40 }}
                className="w-auto object-contain"
              />
            ) : null}
            {marca.data && ((marca.data.mostrar_nome ?? true) || !marca.data.logo_url) ? (
              <span>{marca.data.nome?.trim() || "Loja Vitrine"}</span>
            ) : null}
          </a>
          <div className="flex items-center gap-3">
            <button onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} className="rounded-full p-2 hover:bg-muted" aria-label="Alternar tema">
              {mounted && theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            {showAdminLink && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                <LayoutDashboard className="h-4 w-4" /> Painel
              </Link>
            )}
          </div>
        </div>
      </header>

      {banner.data && <VideoBanner cfg={banner.data} />}

      {destaques.length > 0 && (
        <section id="destaques" className="mx-auto max-w-7xl px-6 pt-14">
          <div className="mb-6 flex items-center gap-3">
            <Star className="h-6 w-6 fill-orange-500 text-orange-500" />
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Produtos em Destaque</h2>
          </div>
          <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {destaques.map((p) => (
              <ProductCard key={p.id} p={p} textos={cardTextos.data} organizationSlug={organizationSlug ?? undefined} />
            ))}
          </div>
        </section>
      )}

      <section id="catalogo" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Tag className="h-6 w-6 text-orange-500" />
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Vitrine Completa</h2>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPagina(1);
              }}
              placeholder="Buscar por nome ou tag..."
              className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        {(categorias.data?.length ?? 0) > 0 && (
          <div className="mb-8 flex flex-wrap items-center gap-2">
            <Tags className="h-4 w-4 text-muted-foreground" />
            {["Todas", ...(categorias.data?.map((c) => c.id) ?? [])].map((id) => {
              const ativa = categoriaAtiva === id;
              const label = id === "Todas" ? "Todas" : categorias.data?.find((c) => c.id === id)?.nome ?? "";
              return (
                <button
                  key={id}
                  onClick={() => {
                    setCategoriaAtiva(id);
                    setPagina(1);
                  }}
                  className={
                    "rounded-full border px-3 py-1 text-xs font-medium transition " +
                    (ativa ? "border-transparent bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted")
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {produtos.isLoading ? (
          <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : visiveis.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
            Nenhum produto encontrado.
          </div>
        ) : (
          <>
            <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visiveis.map((p) => (
                <ProductCard key={p.id} p={p} textos={cardTextos.data} organizationSlug={organizationSlug ?? undefined} />
              ))}
            </div>
            {totalPaginas > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                {Array.from({ length: totalPaginas }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPagina(i + 1)}
                    className={
                      "h-9 w-9 rounded-md border text-sm font-medium transition " +
                      (paginaAtual === i + 1 ? "border-transparent bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted")
                    }
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <section id="sobre" className="border-t border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Por que comprar com a gente</h2>
            <p className="mt-3 text-muted-foreground">Tudo o que você precisa para sair do zero ao lançamento.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-6 text-center shadow-[var(--shadow-card)]">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-6 py-20">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Perguntas Frequentes</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((f, i) => {
            const open = openFaq === i;
            return (
              <div key={f.q} className="overflow-hidden rounded-xl border border-border bg-card">
                <button onClick={() => setOpenFaq(open ? null : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold hover:bg-muted/50">
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" /> {f.q}
                  </span>
                  <ChevronDown className={"h-5 w-5 shrink-0 transition " + (open ? "rotate-180" : "")} />
                </button>
                {open && <div className="px-5 pb-5 text-sm text-muted-foreground">{f.a}</div>}
              </div>
            );
          })}
        </div>
      </section>

      <LeadCapture organizationId={organizationId} />

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row">
          <p>© 2026 {marca.data?.nome?.trim() || organizationName || "Loja Vitrine"} — Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <a href="#sobre" className="hover:text-foreground">Sobre</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
            <Link to="/admin" className="hover:text-foreground">Painel</Link>
          </div>
        </div>
      </footer>

      {ajuda.data && <HelpButton cfg={ajuda.data} />}
    </div>
  );
}