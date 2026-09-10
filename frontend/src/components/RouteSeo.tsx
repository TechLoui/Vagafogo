import { useLocation } from "react-router-dom";
import { Seo, type SeoPath } from "./Seo";

const publicSeoPaths: SeoPath[] = [
  "/",
  "/brunch",
  "/trilha",
  "/historia",
  "/historia/pirenopolis",
  "/planeje-sua-visita",
  "/educacao-ambiental",
  "/reservar",
];

const privatePages: Record<string, { title: string; description: string }> = {
  "/admin": {
    title: "Painel administrativo | Santuário Vagafogo",
    description: "Área restrita de administração do Santuário Vagafogo.",
  },
  "/login": {
    title: "Acesso administrativo | Santuário Vagafogo",
    description: "Acesso restrito à equipe do Santuário Vagafogo.",
  },
  "/minha-reserva": {
    title: "Consultar minha reserva | Santuário Vagafogo",
    description: "Consulte os dados e o status da sua reserva no Santuário Vagafogo.",
  },
};

const normalizePath = (pathname: string) => {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "");
};

export function RouteSeo() {
  const { pathname } = useLocation();
  const normalizedPath = normalizePath(pathname);

  if (publicSeoPaths.includes(normalizedPath as SeoPath)) {
    return <Seo path={normalizedPath as SeoPath} />;
  }

  const privatePage = privatePages[normalizedPath];
  if (privatePage) {
    return (
      <Seo
        path={normalizedPath}
        title={privatePage.title}
        description={privatePage.description}
        noindex
      />
    );
  }

  if (normalizedPath.startsWith("/formulario/")) {
    return (
      <Seo
        path={normalizedPath}
        title="Formulário | Santuário Vagafogo"
        description="Formulário disponibilizado pelo Santuário Vagafogo."
        noindex
      />
    );
  }

  return null;
}
