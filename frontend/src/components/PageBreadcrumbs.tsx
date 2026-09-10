import { Link } from "react-router-dom";

export type PageBreadcrumbItem = {
  label: string;
  to?: string;
};

type PageBreadcrumbsProps = {
  items: PageBreadcrumbItem[];
  className?: string;
};

export function PageBreadcrumbs({ items, className = "" }: PageBreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Navegação estrutural"
      className={`w-full text-xs sm:text-sm ${className}`.trim()}
    >
      <ol className="flex flex-wrap items-center justify-center gap-y-2">
        {items.map((item, index) => {
          const isCurrentPage = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center">
              {index > 0 && (
                <span aria-hidden="true" className="mx-2 select-none opacity-40">
                  /
                </span>
              )}

              {item.to && !isCurrentPage ? (
                <Link
                  to={item.to}
                  className="rounded-sm font-medium opacity-75 underline-offset-4 transition-opacity hover:opacity-100 hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isCurrentPage ? "page" : undefined}
                  className={isCurrentPage ? "font-semibold" : "font-medium opacity-75"}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
