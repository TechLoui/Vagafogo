const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_SITE_URL = "https://vagafogopiri.com.br";
const SITE_NAME = "Santuário Vagafogo";
const frontendDirectory = path.resolve(__dirname, "..");
const distDirectory = path.join(frontendDirectory, "dist");
const sourceIndexPath = path.join(distDirectory, "index.html");
const manifestPath = path.join(distDirectory, ".vite", "manifest.json");

const pages = [
  {
    outputPath: "index.html",
    title: "Santuário Vagafogo em Pirenópolis | Brunch e Trilha",
    description:
      "Viva o brunch artesanal e a Trilha Mãe da Floresta no Santuário Vagafogo, em Pirenópolis. Conheça as experiências e faça sua reserva online.",
    canonicalPath: "/",
    schemaType: "WebPage",
    heading: "Santuário Vagafogo em Pirenópolis: brunch, trilha e conservação",
    highlights: [
      "Brunch artesanal com 45 itens e sabores do Cerrado.",
      "Trilha Mãe da Floresta com 1.530 metros junto ao Rio Vagafogo.",
      "Experiências de natureza e educação ambiental em uma RPPN.",
    ],
    heroSource: "src/assets/hero/hero-1.webp",
    heroMobileSource: "src/assets/hero/hero-1-800.webp",
    imageAlt: "Natureza preservada no Santuário Vagafogo",
    breadcrumbs: [{ name: "Início", path: "/" }],
  },
  {
    outputPath: "brunch/index.html",
    title: "Brunch Vagafogo em Pirenópolis | Reserve Online",
    description:
      "Descubra o Brunch Vagafogo: sabores artesanais, produtos da fazenda e frutas do Cerrado em uma experiência gastronômica em Pirenópolis.",
    canonicalPath: "/brunch",
    schemaType: "WebPage",
    serviceName: "Brunch Vagafogo",
    heading: "Brunch Vagafogo: sabores do Cerrado em Pirenópolis",
    highlights: [
      "Uma mesa com 45 itens preparados para a experiência.",
      "Queijos, iogurtes e manteigas feitos com leite da fazenda.",
      "Frutas do Cerrado e 14 harmonizações para descobrir à mesa.",
    ],
    heroSource: "src/assets/brunch/brunch-3.webp",
    heroMobileSource: "src/assets/brunch/brunch-3-800.webp",
    imageAlt: "Mesa do Brunch Vagafogo em Pirenópolis",
    breadcrumbs: [
      { name: "Início", path: "/" },
      { name: "Brunch", path: "/brunch" },
    ],
  },
  {
    outputPath: "trilha/index.html",
    title: "Trilha Ecológica em Pirenópolis | Santuário Vagafogo",
    description:
      "Conheça a Trilha Mãe da Floresta no Santuário Vagafogo: 1.530 metros de mata preservada, rio, piscina natural e observação de aves em Pirenópolis.",
    canonicalPath: "/trilha",
    schemaType: "WebPage",
    serviceName: "Trilha Mãe da Floresta",
    heading: "Trilha ecológica Mãe da Floresta em Pirenópolis",
    highlights: [
      "Percurso de 1.530 metros em mata ciliar preservada.",
      "Caminho próximo ao Rio Vagafogo, com piscina natural e pequena cachoeira.",
      "Placas de interpretação ambiental sobre a fauna e a flora do Cerrado.",
    ],
    heroSource: "src/assets/trilhaecologica/trilhaecologica-2.jpg",
    imageAlt: "Mata preservada da Trilha Mãe da Floresta",
    breadcrumbs: [
      { name: "Início", path: "/" },
      { name: "Trilha ecológica", path: "/trilha" },
    ],
  },
  {
    outputPath: "historia/index.html",
    title: "História do Santuário Vagafogo | Pirenópolis",
    description:
      "Conheça a trajetória da família que criou o Santuário Vagafogo e transformou a Fazenda Vagafogo em referência de conservação e turismo sustentável.",
    canonicalPath: "/historia",
    schemaType: "AboutPage",
    heading: "A história do Santuário Vagafogo",
    highlights: [
      "A Fazenda Vagafogo foi adquirida por Evandro e Catarina em 1975.",
      "A RPPN foi criada em 1990, a primeira de Goiás e uma das primeiras do Brasil.",
      "O Centro de Visitantes foi inaugurado em março de 1992.",
    ],
    heroSource: "src/assets/hero/hero-1.webp",
    heroMobileSource: "src/assets/hero/hero-1-800.webp",
    imageAlt: "Paisagem natural do Santuário Vagafogo",
    breadcrumbs: [
      { name: "Início", path: "/" },
      { name: "Nossa história", path: "/historia" },
    ],
  },
  {
    outputPath: "historia/pirenopolis/index.html",
    title: "História de Pirenópolis | Santuário Vagafogo",
    description:
      "Descubra momentos marcantes da história de Pirenópolis e sua relação com a origem do Santuário Vagafogo, no coração do Cerrado goiano.",
    canonicalPath: "/historia/pirenopolis",
    schemaType: "WebPage",
    heading: "História de Pirenópolis e as raízes da Vagafogo",
    highlights: [
      "Uma cidade goiana marcada por patrimônio, cultura e natureza.",
      "A antiga atividade mineradora abriu caminho para novas formas de vida e produção.",
      "A trajetória da Vagafogo faz parte desse encontro entre cidade e Cerrado.",
    ],
    heroSource: "src/assets/Carrossel-1.webp",
    heroMobileSource: "src/assets/Carrossel-1-800.webp",
    imageAlt: "Paisagem de Pirenópolis, Goiás",
    breadcrumbs: [
      { name: "Início", path: "/" },
      { name: "Nossa história", path: "/historia" },
      { name: "História de Pirenópolis", path: "/historia/pirenopolis" },
    ],
  },
  {
    outputPath: "planeje-sua-visita/index.html",
    title: "Visite o Santuário Vagafogo | Planeje seu passeio",
    description:
      "Veja como chegar ao Santuário Vagafogo, em Pirenópolis, consulte agenda e valores e planeje sua experiência de brunch, trilha ou educação ambiental.",
    canonicalPath: "/planeje-sua-visita",
    schemaType: "WebPage",
    heading: "Planeje sua visita ao Santuário Vagafogo em Pirenópolis",
    highlights: [
      "Endereço: R. do Frota, S/N, Alto do Carmo, Pirenópolis-GO.",
      "Datas, horários e valores atualizados aparecem no fluxo de reserva.",
      "Brunch e trilha podem ser escolhidos na mesma reserva, conforme disponibilidade.",
    ],
    heroSource: "src/assets/Carrossel-1.webp",
    heroMobileSource: "src/assets/Carrossel-1-800.webp",
    imageAlt: "Caminho em meio à natureza do Santuário Vagafogo",
    breadcrumbs: [
      { name: "Início", path: "/" },
      { name: "Planeje sua visita", path: "/planeje-sua-visita" },
    ],
  },
  {
    outputPath: "educacao-ambiental/index.html",
    title: "Educação Ambiental em Pirenópolis | Vagafogo",
    description:
      "Conheça as atividades de educação ambiental do Santuário Vagafogo para escolas, universidades e grupos, com monitoria nas trilhas em Pirenópolis.",
    canonicalPath: "/educacao-ambiental",
    schemaType: "WebPage",
    serviceName: "Educação ambiental no Santuário Vagafogo",
    heading: "Educação ambiental no Santuário Vagafogo",
    highlights: [
      "Atividades com monitoria para escolas, universidades e outros grupos.",
      "Interpretação sobre fauna, flora, recursos naturais e sustentabilidade.",
      "Atendimento mediante agendamento prévio com a equipe.",
    ],
    heroSource: "src/assets/educacaoambiental/educacaoambiental-1.jpg",
    imageAlt: "Atividade de educação ambiental no Santuário Vagafogo",
    breadcrumbs: [
      { name: "Início", path: "/" },
      { name: "Educação ambiental", path: "/educacao-ambiental" },
    ],
  },
  {
    outputPath: "reservar/index.html",
    title: "Reservas | Brunch e Trilha no Santuário Vagafogo",
    description:
      "Reserve online seu brunch, sua trilha ecológica ou a experiência completa no Santuário Vagafogo, em Pirenópolis, com data e horário escolhidos.",
    canonicalPath: "/reservar",
    schemaType: "WebPage",
    heading: "Reserve seu brunch e sua trilha no Santuário Vagafogo",
    highlights: [
      "Escolha as experiências e a data da visita.",
      "Consulte horários, valores e disponibilidade atualizados.",
      "Confira todos os dados antes de finalizar sua reserva.",
    ],
    breadcrumbs: [
      { name: "Início", path: "/" },
      { name: "Reservar", path: "/reservar" },
    ],
  },
  {
    outputPath: "admin/index.html",
    title: "Painel administrativo | Santuário Vagafogo",
    description: "Área restrita de administração do Santuário Vagafogo.",
    canonicalPath: "/admin",
    noindex: true,
  },
  {
    outputPath: "login/index.html",
    title: "Acesso administrativo | Santuário Vagafogo",
    description: "Acesso restrito à equipe do Santuário Vagafogo.",
    canonicalPath: "/login",
    noindex: true,
  },
  {
    outputPath: "minha-reserva/index.html",
    title: "Consultar minha reserva | Santuário Vagafogo",
    description: "Consulte os dados e o status da sua reserva no Santuário Vagafogo.",
    canonicalPath: "/minha-reserva",
    noindex: true,
  },
  {
    outputPath: "404/index.html",
    title: "Página não encontrada | Santuário Vagafogo",
    description: "A página que você procurou não existe.",
    canonicalPath: "/404",
    noindex: true,
  },
];

const readSiteUrl = async () => {
  let configuredUrl = process.env.VITE_PUBLIC_SITE_URL?.trim();

  if (!configuredUrl) {
    try {
      const envFile = await fs.readFile(path.join(frontendDirectory, ".env.production"), "utf8");
      const match = envFile.match(/^VITE_PUBLIC_SITE_URL\s*=\s*(.+?)\s*$/m);
      configuredUrl = match?.[1]?.replace(/^['"]|['"]$/g, "").trim();
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  const candidate = (configuredUrl || DEFAULT_SITE_URL).replace(/\/+$/, "");
  const parsed = new URL(candidate);
  if (parsed.protocol !== "https:" || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("VITE_PUBLIC_SITE_URL deve conter apenas uma origem HTTPS, sem caminho, query ou hash.");
  }
  return parsed.origin;
};

const escapeAttribute = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const escapeText = (value) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const absoluteUrl = (siteUrl, routePath) => new URL(routePath, `${siteUrl}/`).toString();
const mapsUrl =
  "https://www.google.com/maps/search/?api=1&query=R.%20do%20Frota%2C%20S%2FN%2C%20Alto%20do%20Carmo%2C%20Piren%C3%B3polis%20GO%2C%2072980-000";

const buildStructuredData = (siteUrl, page, imageUrl) => {
  const canonicalUrl = absoluteUrl(siteUrl, page.canonicalPath);
  const websiteId = `${siteUrl}/#website`;
  const sanctuaryId = `${siteUrl}/#santuario`;
  const webpageId = `${canonicalUrl}#webpage`;
  const breadcrumbId = `${canonicalUrl}#breadcrumb`;
  const graph = [
    {
      "@type": "WebSite",
      "@id": websiteId,
      url: `${siteUrl}/`,
      name: SITE_NAME,
      inLanguage: "pt-BR",
    },
    {
      "@type": ["TouristAttraction", "LocalBusiness"],
      "@id": sanctuaryId,
      name: SITE_NAME,
      url: `${siteUrl}/`,
      description: "Experiências de gastronomia, natureza e educação ambiental em Pirenópolis, Goiás.",
      image: imageUrl,
      logo: `${siteUrl}/logo.png`,
      telephone: "+55 62 99222-5471",
      address: {
        "@type": "PostalAddress",
        streetAddress: "R. do Frota, S/N - Alto do Carmo",
        addressLocality: "Pirenópolis",
        addressRegion: "GO",
        postalCode: "72980-000",
        addressCountry: "BR",
      },
      hasMap: mapsUrl,
      sameAs: ["https://www.instagram.com/vagafogo/"],
      potentialAction: {
        "@type": "ReserveAction",
        target: absoluteUrl(siteUrl, "/reservar"),
      },
    },
    {
      "@type": page.schemaType,
      "@id": webpageId,
      url: canonicalUrl,
      name: page.title,
      description: page.description,
      inLanguage: "pt-BR",
      isPartOf: { "@id": websiteId },
      about: { "@id": sanctuaryId },
      breadcrumb: { "@id": breadcrumbId },
    },
    {
      "@type": "BreadcrumbList",
      "@id": breadcrumbId,
      itemListElement: page.breadcrumbs.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: absoluteUrl(siteUrl, item.path),
      })),
    },
  ];

  if (page.serviceName) {
    const serviceId = `${canonicalUrl}#service`;
    graph.push({
      "@type": "Service",
      "@id": serviceId,
      name: page.serviceName,
      description: page.description,
      url: canonicalUrl,
      provider: { "@id": sanctuaryId },
    });
    graph[2].mainEntity = { "@id": serviceId };
  }

  return { "@context": "https://schema.org", "@graph": graph };
};

const resolveManifestAsset = (manifest, source) => {
  if (!source) return null;

  const entry = manifest[source];
  if (!entry?.file) {
    throw new Error(`Asset não encontrado no manifest: ${source}`);
  }

  return `/${entry.file.replace(/^\/+/, "")}`;
};

const renderStaticFallback = (page) => {
  if (page.noindex || !page.heading) return '<div id="root"></div>';

  const primaryHref = page.canonicalPath === "/reservar" ? "/brunch" : "/reservar";
  const primaryLabel = page.canonicalPath === "/reservar" ? "Conhecer o brunch" : "Fazer reserva";
  const breadcrumbs = page.breadcrumbs
    .map((item, index) => {
      const current = index === page.breadcrumbs.length - 1;
      return current
        ? `<span aria-current="page">${escapeText(item.name)}</span>`
        : `<a href="${escapeAttribute(item.path)}">${escapeText(item.name)}</a><span aria-hidden="true">/</span>`;
    })
    .join("");
  const highlights = page.highlights
    .map((highlight) => `<li>${escapeText(highlight)}</li>`)
    .join("");

  return `<div id="root">
    <div class="seo-static-fallback">
      <header class="seo-static-header">
        <a class="seo-static-brand" href="/">VAGAFOGO</a>
        <nav aria-label="Navegação principal">
          <a href="/brunch">Brunch</a>
          <a href="/trilha">Trilha</a>
          <a href="/educacao-ambiental">Educação ambiental</a>
          <a href="/historia">História</a>
          <a href="/planeje-sua-visita">Planeje sua visita</a>
        </nav>
      </header>
      <main class="seo-static-main">
        <nav class="seo-static-breadcrumb" aria-label="Navegação estrutural">${breadcrumbs}</nav>
        <p class="seo-static-eyebrow">Santuário Vagafogo · Pirenópolis, Goiás</p>
        <h1>${escapeText(page.heading)}</h1>
        <p class="seo-static-intro">${escapeText(page.description)}</p>
        <ul>${highlights}</ul>
        <div class="seo-static-actions">
          <a class="seo-static-primary" href="${primaryHref}">${primaryLabel}</a>
          <a href="/planeje-sua-visita">Ver informações da visita</a>
        </div>
        <address>R. do Frota, S/N, Alto do Carmo, Pirenópolis-GO · 72980-000</address>
      </main>
      <footer>Natureza, gastronomia e conservação no Cerrado.</footer>
    </div>
  </div>`;
};

const removeExistingSeo = (html) => {
  const managedNames = new Set([
    "description",
    "robots",
    "googlebot",
    "twitter:card",
    "twitter:title",
    "twitter:description",
    "twitter:image",
    "twitter:image:alt",
  ]);
  const managedProperties = new Set([
    "og:type",
    "og:locale",
    "og:site_name",
    "og:title",
    "og:description",
    "og:url",
    "og:image",
    "og:image:alt",
    "og:image:width",
    "og:image:height",
  ]);

  return html
    .replace(/\s*<!--\s*vagafogo-seo:start\s*-->[\s\S]*?<!--\s*vagafogo-seo:end\s*-->/gi, "")
    .replace(/\s*<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
    .replace(/\s*<meta\b[^>]*>/gi, (tag) => {
      const name = tag.match(/\bname\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
      const property = tag.match(/\bproperty\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
      return (name && managedNames.has(name)) || (property && managedProperties.has(property)) ? "" : tag;
    })
    .replace(/\s*<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>/gi, "")
    .replace(/\s*<script\b(?=[^>]*\bid\s*=\s*["']vagafogo-seo-jsonld["'])[^>]*>[\s\S]*?<\/script>/gi, "");
};

const renderHead = (siteUrl, page, manifest) => {
  const canonicalUrl = absoluteUrl(siteUrl, page.canonicalPath);
  const heroAsset = resolveManifestAsset(manifest, page.heroSource);
  const heroMobileAsset = resolveManifestAsset(manifest, page.heroMobileSource);
  const imageUrl = heroAsset ? absoluteUrl(siteUrl, heroAsset) : `${siteUrl}/logo.png`;
  const imageAlt = page.imageAlt || `Logotipo do ${SITE_NAME}`;
  const robots = page.noindex
    ? "noindex, follow"
    : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
  const structuredData = page.noindex
    ? ""
    : `    <script id="vagafogo-seo-jsonld" type="application/ld+json">${JSON.stringify(buildStructuredData(siteUrl, page, imageUrl)).replaceAll("<", "\\u003c")}</script>`;
  const imagePreload = heroAsset
    ? `    <link rel="preload" as="image" href="${escapeAttribute(heroAsset)}"${heroMobileAsset ? ` imagesrcset="${escapeAttribute(heroMobileAsset)} 800w, ${escapeAttribute(heroAsset)} 1440w" imagesizes="100vw"` : ""} fetchpriority="high" />`
    : "";
  const fallbackStyles = page.noindex
    ? ""
    : `    <style id="vagafogo-static-shell">.seo-static-fallback{box-sizing:border-box;min-height:100vh;background:#f7faef;color:#2d1e0f;font-family:Inter,system-ui,sans-serif}.seo-static-fallback *{box-sizing:border-box}.seo-static-header{display:flex;align-items:center;justify-content:space-between;gap:2rem;padding:1.2rem max(1rem,calc((100% - 1180px)/2));background:#2d1e0f;color:#fff}.seo-static-brand{color:#e0b13c;font-size:1.25rem;font-weight:800;letter-spacing:.08em;text-decoration:none}.seo-static-header nav{display:flex;flex-wrap:wrap;gap:1rem}.seo-static-header nav a{color:#fff;text-decoration:none}.seo-static-main{width:min(860px,calc(100% - 2rem));margin:0 auto;padding:clamp(4rem,9vw,8rem) 0}.seo-static-breadcrumb{display:flex;flex-wrap:wrap;gap:.55rem;font-size:.875rem}.seo-static-breadcrumb a{color:#8b4f23}.seo-static-eyebrow{margin:3rem 0 .75rem;color:#8b4f23;font-size:.75rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase}.seo-static-main h1{max-width:800px;margin:0;font-family:Georgia,serif;font-size:clamp(2.4rem,7vw,5rem);line-height:1.04}.seo-static-intro{max-width:720px;margin:1.5rem 0;font-size:1.125rem;line-height:1.75;color:#51483f}.seo-static-main li{margin:.75rem 0;line-height:1.6}.seo-static-actions{display:flex;flex-wrap:wrap;gap:1rem;margin:2rem 0}.seo-static-actions a{border:1px solid #8b4f23;border-radius:999px;padding:.85rem 1.25rem;color:#8b4f23;font-weight:700;text-decoration:none}.seo-static-actions .seo-static-primary{background:#8b4f23;color:#fff}.seo-static-main address{margin-top:3rem;font-style:normal;color:#51483f}.seo-static-fallback footer{padding:1.5rem;text-align:center;background:#2d1e0f;color:#fff}@media(max-width:800px){.seo-static-header{align-items:flex-start;flex-direction:column}.seo-static-header nav{gap:.75rem;font-size:.875rem}.seo-static-main{padding-top:3rem}}</style>`;

  return [
    "    <!-- vagafogo-seo:start -->",
    `    <title>${escapeText(page.title)}</title>`,
    `    <meta name="description" content="${escapeAttribute(page.description)}" />`,
    `    <meta name="robots" content="${robots}" />`,
    `    <meta name="googlebot" content="${robots}" />`,
    `    <link rel="canonical" href="${escapeAttribute(canonicalUrl)}" />`,
    "    <meta property=" + '"og:type" content="website" />',
    "    <meta property=" + '"og:locale" content="pt_BR" />',
    `    <meta property="og:site_name" content="${escapeAttribute(SITE_NAME)}" />`,
    `    <meta property="og:title" content="${escapeAttribute(page.title)}" />`,
    `    <meta property="og:description" content="${escapeAttribute(page.description)}" />`,
    `    <meta property="og:url" content="${escapeAttribute(canonicalUrl)}" />`,
    `    <meta property="og:image" content="${escapeAttribute(imageUrl)}" />`,
    `    <meta property="og:image:alt" content="${escapeAttribute(imageAlt)}" />`,
    `    <meta name="twitter:card" content="${heroAsset ? "summary_large_image" : "summary"}" />`,
    `    <meta name="twitter:title" content="${escapeAttribute(page.title)}" />`,
    `    <meta name="twitter:description" content="${escapeAttribute(page.description)}" />`,
    `    <meta name="twitter:image" content="${escapeAttribute(imageUrl)}" />`,
    `    <meta name="twitter:image:alt" content="${escapeAttribute(imageAlt)}" />`,
    imagePreload,
    structuredData,
    fallbackStyles,
    "    <!-- vagafogo-seo:end -->",
  ].join("\n");
};

const generate = async () => {
  const [baseHtml, siteUrl, manifestSource] = await Promise.all([
    fs.readFile(sourceIndexPath, "utf8"),
    readSiteUrl(),
    fs.readFile(manifestPath, "utf8"),
  ]);
  const manifest = JSON.parse(manifestSource);
  const cleanHtml = removeExistingSeo(baseHtml);

  if (!cleanHtml.includes("</head>")) {
    throw new Error("dist/index.html não contém a tag </head>.");
  }

  await Promise.all(
    pages.map(async (page) => {
      const outputPath = path.join(distDirectory, ...page.outputPath.split("/"));
      const outputDirectory = path.dirname(outputPath);
      const htmlWithHead = cleanHtml.replace("</head>", `${renderHead(siteUrl, page, manifest)}\n  </head>`);
      if (!htmlWithHead.includes('<div id="root"></div>')) {
        throw new Error(`Não foi possível localizar o contêiner principal em ${page.outputPath}.`);
      }
      const html = htmlWithHead.replace('<div id="root"></div>', renderStaticFallback(page));
      await fs.mkdir(outputDirectory, { recursive: true });
      await fs.writeFile(outputPath, html, "utf8");
    }),
  );

  console.log(`[seo] ${pages.length} páginas HTML geradas para ${siteUrl}.`);
};

generate().catch((error) => {
  console.error("[seo] Falha ao gerar páginas por rota:", error);
  process.exitCode = 1;
});
