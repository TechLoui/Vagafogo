import { useEffect, useMemo, useState, type ReactNode } from "react";

type MarkdownContentProps = {
  src: string;
};

type Block =
  | { type: "h"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

function parseMarkdown(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i] ?? "";
    const line = raw.trimEnd();

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      blocks.push({ type: "h", level, text: headingMatch[2].trim() });
      i += 1;
      continue;
    }

    const unorderedMatch = line.match(/^\s*[-*]\s+(.+)$/);
    if (unorderedMatch) {
      const items: string[] = [];
      while (i < lines.length) {
        const next = (lines[i] ?? "").trimEnd();
        const m = next.match(/^\s*[-*]\s+(.+)$/);
        if (!m) break;
        items.push(m[1].trim());
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    const orderedMatch = line.match(/^\s*\d+\.\s+(.+)$/);
    if (orderedMatch) {
      const items: string[] = [];
      while (i < lines.length) {
        const next = (lines[i] ?? "").trimEnd();
        const m = next.match(/^\s*\d+\.\s+(.+)$/);
        if (!m) break;
        items.push(m[1].trim());
        i += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (i < lines.length) {
      const next = (lines[i] ?? "").trimEnd();
      if (!next.trim()) break;
      if (/^(#{1,6})\s+/.test(next)) break;
      if (/^\s*[-*]\s+/.test(next)) break;
      if (/^\s*\d+\.\s+/.test(next)) break;
      paragraphLines.push(next.trim());
      i += 1;
    }

    if (paragraphLines.length) {
      blocks.push({ type: "p", text: paragraphLines.join(" ") });
      continue;
    }

    i += 1;
  }

  return blocks;
}

function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function renderInline(text: string) {
  const nodes: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining) {
    const link = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
    const bold = remaining.match(/\*\*([^*]+)\*\*/);
    const italic = remaining.match(/\*([^*]+)\*/);

    const candidates = [
      { type: "link" as const, match: link, index: link?.index ?? Number.POSITIVE_INFINITY },
      { type: "bold" as const, match: bold, index: bold?.index ?? Number.POSITIVE_INFINITY },
      { type: "italic" as const, match: italic, index: italic?.index ?? Number.POSITIVE_INFINITY },
    ].sort((a, b) => a.index - b.index);

    const first = candidates[0];
    if (!first.match || first.index === Number.POSITIVE_INFINITY) {
      nodes.push(remaining);
      break;
    }

    if (first.index > 0) {
      nodes.push(remaining.slice(0, first.index));
    }

    const full = first.match[0];
    const start = first.index;
    const end = start + full.length;

    if (first.type === "link") {
      const label = first.match[1] ?? "";
      const url = first.match[2] ?? "";
      const external = isExternalUrl(url);
      nodes.push(
        <a
          key={`md-link-${key++}`}
          href={url}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer" : undefined}
          className="font-semibold text-amber-700 underline underline-offset-4 hover:text-amber-800"
        >
          {label}
        </a>,
      );
    } else if (first.type === "bold") {
      nodes.push(
        <strong key={`md-strong-${key++}`} className="font-bold">
          {first.match[1] ?? ""}
        </strong>,
      );
    } else {
      nodes.push(
        <em key={`md-em-${key++}`} className="italic">
          {first.match[1] ?? ""}
        </em>,
      );
    }

    remaining = remaining.slice(end);
  }

  return nodes;
}

function Heading({
  level,
  children,
}: {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: string;
}) {
  const common = "font-extrabold tracking-tight text-slate-900";
  if (level === 1) return <h1 className={`${common} text-4xl sm:text-5xl`}>{children}</h1>;
  if (level === 2) return <h2 className={`${common} text-3xl sm:text-4xl`}>{children}</h2>;
  if (level === 3) return <h3 className={`${common} text-2xl sm:text-3xl`}>{children}</h3>;
  return <h4 className={`${common} text-xl sm:text-2xl`}>{children}</h4>;
}

export function MarkdownContent({ src }: MarkdownContentProps) {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setMarkdown(null);
    setError(null);

    fetch(encodeURI(src))
      .then(async (res) => {
        if (!res.ok) throw new Error(`Falha ao carregar: ${res.status}`);
        const text = await res.text();
        if (!active) return;
        setMarkdown(text);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message ?? "Falha ao carregar conteúdo");
      });

    return () => {
      active = false;
    };
  }, [src]);

  const blocks = useMemo(() => (markdown ? parseMarkdown(markdown) : []), [markdown]);

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
        {error}
      </div>
    );
  }

  if (!markdown) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-2/3 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-11/12 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-10/12 animate-pulse rounded bg-slate-200" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {blocks.map((block, idx) => {
        if (block.type === "h") {
          return <Heading key={`md-h-${idx}`} level={block.level}>{block.text}</Heading>;
        }
        if (block.type === "p") {
          return (
            <p key={`md-p-${idx}`} className="text-base leading-relaxed text-slate-700 sm:text-lg">
              {renderInline(block.text)}
            </p>
          );
        }
        if (block.type === "ul") {
          return (
            <ul
              key={`md-ul-${idx}`}
              className="list-disc space-y-2 pl-6 text-base leading-relaxed text-slate-700 sm:text-lg"
            >
              {block.items.map((item, itemIdx) => (
                <li key={`md-ul-${idx}-${itemIdx}`}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        return (
          <ol
            key={`md-ol-${idx}`}
            className="list-decimal space-y-2 pl-6 text-base leading-relaxed text-slate-700 sm:text-lg"
          >
            {block.items.map((item, itemIdx) => (
              <li key={`md-ol-${idx}-${itemIdx}`}>{renderInline(item)}</li>
            ))}
          </ol>
        );
      })}
    </div>
  );
}
