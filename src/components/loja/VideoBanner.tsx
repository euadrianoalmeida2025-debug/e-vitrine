import { useState } from "react";
import { Play, Pause, Flame } from "lucide-react";
import { comParams, youtubeEmbed, type BannerConfig } from "@/lib/loja";

export function VideoBanner({ cfg }: { cfg: BannerConfig }) {
  const [tocando, setTocando] = useState(cfg.autoplay);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  if (!cfg.ativo) return null;

  const align =
    cfg.posicao === "left" ? "text-left items-start" : cfg.posicao === "right" ? "text-right items-end" : "text-center items-center";

  const embedSrc = comParams(youtubeEmbed(cfg.video_url), {
    autoplay: tocando ? 1 : 0,
    controls: cfg.controles ? 1 : 0,
    rel: 0,
  });

  const togglePlay = () => {
    if (cfg.tipo === "mp4" && videoEl) {
      if (videoEl.paused) {
        void videoEl.play();
        setTocando(true);
      } else {
        videoEl.pause();
        setTocando(false);
      }
      return;
    }
    setTocando((t) => !t);
  };

  return (
    <section
      className="relative overflow-hidden border-b border-border"
      style={{ background: cfg.cor_fundo || "var(--gradient-hero)", color: cfg.cor_texto || undefined }}
    >
      <div className={`mx-auto flex max-w-5xl flex-col gap-6 px-6 py-14 ${align}`}>
        {cfg.selo_tipo === "imagem" ? (
          cfg.selo_imagem_url && (
            <img
              src={cfg.selo_imagem_url}
              alt={cfg.subtitulo || "Destaque"}
              className="h-auto max-h-24 max-w-[min(100%,22rem)] object-contain"
            />
          )
        ) : cfg.subtitulo ? (
          <div
            className="inline-flex items-center gap-2 rounded-full border-2 border-primary/50 px-6 py-2 font-black uppercase tracking-widest"
            style={{
              fontSize: `${cfg.selo_tamanho_fonte || 14}px`,
              color: cfg.selo_cor_texto || undefined,
              backgroundColor: cfg.selo_cor_fundo || undefined,
            }}
          >
            <Flame className="h-[1.25em] w-[1.25em] fill-current" />
            <span>{cfg.subtitulo}</span>
          </div>
        ) : null}
        {cfg.titulo && (
          <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-5xl">{cfg.titulo}</h1>
        )}
        {cfg.descricao && (
          <p className="max-w-2xl text-base opacity-80 md:text-lg">{cfg.descricao}</p>
        )}

        <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-black shadow-[var(--shadow-card)]">
          <div className="aspect-video w-full">
            {cfg.tipo === "mp4" ? (
              <video
                ref={setVideoEl}
                src={cfg.mp4_url}
                poster={cfg.capa_url || undefined}
                controls={cfg.controles}
                autoPlay={cfg.autoplay}
                muted={cfg.autoplay}
                playsInline
                loop
                className="h-full w-full object-cover"
              />
            ) : tocando || !cfg.capa_url ? (
              <iframe
                src={embedSrc}
                title={cfg.titulo || "Vídeo da loja"}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <button type="button" onClick={togglePlay} className="group relative h-full w-full" aria-label="Assistir vídeo">
                <img src={cfg.capa_url} alt={cfg.titulo || "Capa do vídeo"} className="h-full w-full object-cover" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition group-hover:bg-black/50">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-background/90 shadow-2xl transition group-hover:scale-110">
                    <Play className="h-8 w-8 fill-primary text-primary" />
                  </span>
                </span>
              </button>
            )}
          </div>
          {cfg.controles && (
            <button
              type="button"
              onClick={togglePlay}
              className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-background/85 px-4 py-2 text-xs font-semibold text-foreground shadow-lg backdrop-blur transition hover:bg-background"
            >
              {tocando ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {tocando ? "Pausar" : "Reproduzir"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}