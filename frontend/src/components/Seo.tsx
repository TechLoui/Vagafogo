import { useEffect } from "react";
import brunchImage from "../assets/brunch/brunch-3.webp";
import educationImage from "../assets/educacaoambiental/educacaoambiental-1.jpg";
import homeImage from "../assets/hero/hero-1.webp";
import visitImage from "../assets/Carrossel-1.webp";
import trailImage from "../assets/trilhaecologica/trilhaecologica-2.jpg";

const DEFAULT_SITE_URL = "https://vagafogopiri.com.br";
const configuredSiteUrl = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.trim();
const SITE_URL = (configuredSiteUrl || DEFAULT_SITE_URL).replace(/\/+$/, "");
const SITE_NAME = "Santuário Vagafogo";
const DEFAULT_IMAGE = `${SITE_URL}/logo.png`;
const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=R.%20do%20Frota%2C%20S%2FN%2C%20Alto%20do%20Carmo%2C%20Piren%C3%B3polis%20GO%2C%2072980-000";

type Breadcrumb = {
  name: string;
  path: string;
};

type SeoDefinition = {
  title: string;
  description: string;
  canonicalPath: string;
  schemaType: "WebPage" | "AboutPage";
  breadcrumbs: Breadcrumb[];
  serviceName?: string;
  image?: string;
  imageAlt?: string;
};

const SEO_PAGES = {
  "/": {
    title: "Santuário Vagafogo em Pirenópolis | Brunch e Trilha",
    description:
      "Viva o brunch artesanal e a Trilha Mãe da Floresta no Santuário Vagafogo, em Pirenópolis. Conheça as experiências e faça sua reserva online.",
    canonicalPath: "/",
    schemaType: "WebPage",
    image: homeImage,
    imageAlt: "Natureza preservada no Santuário Vagafogo",
    breadcrumbs: [{ name: "Início", path: "/" }],
  },
  "/brunch": {
    title: "Brunch Vagafogo em Pirenópolis | Reserve Online",
    description:
      "Descubra o Brunch Vagafogo: sabores artesanais, produtos da fazenda e frutas do Cerrado em uma experiência gastronômica em Pirenópolis.",
    canonicalPath: "/brunch",
    schemaType: "WebPage",
    serviceName: "Brunch Vagafogo",
    image: brunchImage,
    imageAlt: "Mesa do Brunch Vagafogo em Pirenópolis",
    breadcrumbs: [
      { name: "Início", path: "/" },
      { name: "Brunch", path: "/brunch" },
    ],
  },
  "/trilha": {
    title: "Trilha Ecológica em Pirenópolis | Santuário Vagafogo",
    description:
      "Conheça a Trilha Mãe da Floresta no Santuário Vagafogo: 1.530 metros de mata preservada, rio, piscina natural e observação de aves em Pirenópolis.",
    canonicalPath: "/trilha",
    schemaType: "WebPage",
    serviceName: "Trilha Mãe da Floresta",
    image: trailImage,
    imageAlt: "Mata preservada da Trilha Mãe da Floresta",
    breadcrumbs: [
      { name: "Início", path: "/" },
      { name: "Trilha ecológica", path: "/trilha" },
    ],
  },
  "/historia": {
    title: "História do Santuário Vagafogo | Pirenópolis",
    description:
      "Conheça a trajetória da família que criou o Santuário Vagafogo e transformou a Fazenda Vagafogo em referência de conservação e turismo sustentável.",
    canonicalPath: "/historia",
    schemaType: "AboutPage",
    image: homeImage,
    imageAlt: "Paisagem natural do Santuário Vagafogo",
    breadcrumbs: [
      { name: "Início", path: "/" },
      { name: "Nossa história", path: "/historia" },
    ],
  },
  "/historia/pirenopolis": {
    title: "História de Pirenópolis | Santuário Vagafogo",
    description:
      "Descubra momentos marcantes da história de Pirenópolis e sua relação com a origem do Santuário Vagafogo, no coração do Cerrado goiano.",
    canonicalPath: "/historia/pirenopolis",
    schemaType: "WebPage",
    image: visitImage,
    imageAlt: "Paisagem de Pirenópolis, Goiás",
    breadcrumbs: [
      { name: "Início", path: "/" },
      { name: "Nossa história", path: "/historia" },
      { name: "História de Pirenópolis", path: "/historia/pirenopolis" },
    ],
  },
  "/planeje-sua-visita": {
    title: "Visite o Santuário Vagafogo | Planeje seu passeio",
    description:
      "Veja como chegar ao Santuário Vagafogo, em Pirenópolis, consulte agenda e valores e planeje sua experiência de brunch, trilha ou educação ambiental.",
    canonicalPath: "/planeje-sua-visita",
    schemaType: "WebPage",
    image: visitImage,
    imageAlt: "Caminho em meio à natureza do Santuário Vagafogo",
    breadcrumbs: [
      { name: "Início", path: "/" },
      { name: "Planeje sua visita", path: "/planeje-sua-visita" },
    ],
  },
  "/educacao-ambiental": {
    title: "Educação Ambiental em Pirenópolis | Vagafogo",
    description:
      "Conheça as atividades de educação ambiental do Santuário Vagafogo para escolas, universidades e grupos, com monitoria nas trilhas em Pirenópolis.",
    canonicalPath: "/educacao-ambiental",
    schemaType: "WebPage",
    serviceName: "Educação ambiental no Santuário Vagafogo",
    image: educationImage,
    imageAlt: "Atividade de educação ambiental no Santuário Vagafogo",
    breadcrumbs: [
      { name: "Início", path: "/" },
      { name: "Educação ambiental", path: "/educacao-ambiental" },
    ],
  },
  "/reservar": {
    title: "Reservas | Brunch e Trilha na Vagafogo",
    description:
      "Reserve online seu brunch, sua trilha ecológica ou a experiência completa na Vagafogo, em Pirenópolis, com data e horário escolhidos.",
    canonicalPath: "/reservar",
    schemaType: "WebPage",
    breadcrumbs: [
      { name: "Início", path: "/" },
      { name: "Reservar", path: "/reservar" },
    ],
  },
} as const satisfies Record<string, SeoDefinition>;

export type SeoPath = keyof typeof SEO_PAGES;

type SeoProps = {
  path: string;
  title?: string;
  description?: string;
  noindex?: boolean;
};

const absoluteUrl = (path: string) => new URL(path, `${SITE_URL}/`).toString();

const buildStructuredData = (definition: SeoDefinition) => {
  const canonicalUrl = absoluteUrl(definition.canonicalPath);
  const websiteId = `${SITE_URL}/#website`;
  const sanctuaryId = `${SITE_URL}/#santuario`;
  const webpageId = `${canonicalUrl}#webpage`;
  const breadcrumbId = `${canonicalUrl}#breadcrumb`;

  const graph: Record<string, unknown>[] = [
    {
      "@type": "WebSite",
      "@id": websiteId,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      inLanguage: "pt-BR",
    },
    {
      "@type": ["TouristAttraction", "LocalBusiness"],
      "@id": sanctuaryId,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      description:
        "Experiências de gastronomia, natureza e educação ambiental em Pirenópolis, Goiás.",
      image: definition.image ? absoluteUrl(definition.image) : DEFAULT_IMAGE,
      logo: DEFAULT_IMAGE,
      telephone: "+55 62 99222-5471",
      address: {
        "@type": "PostalAddress",
        streetAddress: "R. do Frota, S/N - Alto do Carmo",
        addressLocality: "Pirenópolis",
        addressRegion: "GO",
        postalCode: "72980-000",
        addressCountry: "BR",
      },
      hasMap: MAPS_URL,
      sameAs: ["https://www.instagram.com/vagafogo/"],
      potentialAction: {
        "@type": "ReserveAction",
        target: absoluteUrl("/reservar"),
      },
    },
    {
      "@type": definition.schemaType,
      "@id": webpageId,
      url: canonicalUrl,
      name: definition.title,
      description: definition.description,
      inLanguage: "pt-BR",
      isPartOf: { "@id": websiteId },
      about: { "@id": sanctuaryId },
      breadcrumb: { "@id": breadcrumbId },
    },
    {
      "@type": "BreadcrumbList",
      "@id": breadcrumbId,
      itemListElement: definition.breadcrumbs.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: absoluteUrl(item.path),
      })),
    },
  ];

  if (definition.serviceName) {
    const serviceId = `${canonicalUrl}#service`;
    graph.push({
      "@type": "Service",
      "@id": serviceId,
      name: definition.serviceName,
      description: definition.description,
      url: canonicalUrl,
      provider: { "@id": sanctuaryId },
    });
    (graph[2] as Record<string, unknown>).mainEntity = { "@id": serviceId };
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
};

const findMeta = (attribute: "name" | "property", key: string) =>
  Array.from(document.head.querySelectorAll<HTMLMetaElement>(`meta[${attribute}]`)).find(
    (element) => element.getAttribute(attribute)?.toLowerCase() === key.toLowerCase(),
  );

export function Seo({ path, title, description, noindex = false }: SeoProps) {
  useEffect(() => {
    const configuredDefinition = SEO_PAGES[path as SeoPath] as SeoDefinition | undefined;
    const definition: SeoDefinition = {
      title: title ?? configuredDefinition?.title ?? SITE_NAME,
      description:
        description ??
        configuredDefinition?.description ??
        "Experiências de gastronomia e natureza no Santuário Vagafogo, em Pirenópolis.",
      canonicalPath: configuredDefinition?.canonicalPath ?? path,
      schemaType: configuredDefinition?.schemaType ?? "WebPage",
      breadcrumbs: configuredDefinition?.breadcrumbs ?? [{ name: title ?? SITE_NAME, path }],
      serviceName: configuredDefinition?.serviceName,
      image: configuredDefinition?.image,
      imageAlt: configuredDefinition?.imageAlt,
    };
    const canonicalUrl = absoluteUrl(definition.canonicalPath);
    const socialImage = definition.image ? absoluteUrl(definition.image) : DEFAULT_IMAGE;
    const socialImageAlt = definition.imageAlt ?? `Logotipo do ${SITE_NAME}`;
    const restorers: Array<() => void> = [];

    const previousTitle = document.title;
    document.title = definition.title;
    restorers.push(() => {
      document.title = previousTitle;
    });

    const previousLanguage = document.documentElement.lang;
    document.documentElement.lang = "pt-BR";
    restorers.push(() => {
      document.documentElement.lang = previousLanguage;
    });

    const setMeta = (attribute: "name" | "property", key: string, content: string) => {
      let element = findMeta(attribute, key);
      const created = !element;
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      const previousContent = element.getAttribute("content");
      element.setAttribute("content", content);
      restorers.push(() => {
        if (created) {
          element?.remove();
        } else if (previousContent === null) {
          element?.removeAttribute("content");
        } else {
          element?.setAttribute("content", previousContent);
        }
      });
    };

    setMeta("name", "description", definition.description);
    const robots = noindex
      ? "noindex, follow"
      : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
    setMeta("name", "robots", robots);
    setMeta("name", "googlebot", robots);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:locale", "pt_BR");
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:title", definition.title);
    setMeta("property", "og:description", definition.description);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:image", socialImage);
    setMeta("property", "og:image:alt", socialImageAlt);
    setMeta("name", "twitter:card", definition.image ? "summary_large_image" : "summary");
    setMeta("name", "twitter:title", definition.title);
    setMeta("name", "twitter:description", definition.description);
    setMeta("name", "twitter:image", socialImage);
    setMeta("name", "twitter:image:alt", socialImageAlt);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const canonicalCreated = !canonical;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    const previousCanonical = canonical.getAttribute("href");
    canonical.href = canonicalUrl;
    restorers.push(() => {
      if (canonicalCreated) {
        canonical?.remove();
      } else if (previousCanonical === null) {
        canonical?.removeAttribute("href");
      } else {
        canonical?.setAttribute("href", previousCanonical);
      }
    });

    let jsonLd = document.head.querySelector<HTMLScriptElement>("#vagafogo-seo-jsonld");
    const jsonLdCreated = !jsonLd;
    const previousJsonLd = jsonLd?.textContent ?? null;
    const previousJsonLdParent = jsonLd?.parentNode ?? null;
    const previousJsonLdSibling = jsonLd?.nextSibling ?? null;

    if (noindex && jsonLd) {
      jsonLd.remove();
    } else if (!noindex && !jsonLd) {
      jsonLd = document.createElement("script");
      jsonLd.id = "vagafogo-seo-jsonld";
      jsonLd.type = "application/ld+json";
      document.head.appendChild(jsonLd);
    }

    if (!noindex && jsonLd) {
      jsonLd.textContent = JSON.stringify(buildStructuredData(definition));
    }

    restorers.push(() => {
      if (jsonLdCreated) {
        jsonLd?.remove();
      } else if (noindex && jsonLd && previousJsonLdParent) {
        previousJsonLdParent.insertBefore(jsonLd, previousJsonLdSibling);
      } else {
        jsonLd!.textContent = previousJsonLd;
      }
    });

    return () => {
      restorers.reverse().forEach((restore) => restore());
    };
  }, [description, noindex, path, title]);

  return null;
}
