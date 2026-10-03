import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Store } from "lucide-react";
import { buscarOrganizacaoPorSlug } from "@/lib/saas";
import { fetchProdutoPublicoPorLoja, type Produto } from "@/lib/loja";
import { ProdutoDetalheVitrine } from "@/components/loja/ProdutoDetalheVitrine";

export const Route = createFileRoute("/loja/$slug/produto/$productSlug")({
  component: TenantProductPage,
  head: ({ params }) => ({
    meta: [
      { title: `Produto ${params.productSlug} — G-Vitrine` },
      { name: "description", content: "Detalhes do produto da loja." },
    ],
  }),
});

function TenantProductPage() {
  const { slug, productSlug } = useParams({ from: "/loja/$slug/produto/$productSlug" });
  const { data: organization, isLoading: loadingOrganization } = useQuery({
    queryKey: ["saas-store", slug],
    queryFn: () => buscarOrganizacaoPorSlug(slug),
  });
  const organizationId = organization?.id ?? null;
  const { data: produto, isLoading: loadingProduct } = useQuery<Produto | null>({
    queryKey: ["saas-product", organizationId, productSlug],
    enabled: Boolean(organizationId),
    queryFn: () => fetchProdutoPublicoPorLoja(slug, productSlug),
  });

  if (loadingOrganization || loadingProduct) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Carregando produto...</div>;
  }

  if (!organization || !produto) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <Store className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 text-2xl font-bold">Produto não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">Este produto não está disponível nesta loja.</p>
          <a
            href={`/loja/${encodeURIComponent(slug)}`}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar para a loja
          </a>
        </div>
      </div>
    );
  }

  return (
    <ProdutoDetalheVitrine
      produto={produto}
      organizationId={organization.id}
      organizationSlug={organization.slug}
      organizationName={organization.name}
    />
  );
}