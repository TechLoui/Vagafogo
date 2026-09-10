import type { ReactNode } from "react";

export type FaqItem = {
  question: string;
  answer: ReactNode;
};

type FaqSectionProps = {
  items: FaqItem[];
  eyebrow?: string;
  title?: string;
  description?: string;
  id?: string;
  className?: string;
};

export function FaqSection({
  items,
  eyebrow = "Antes da sua visita",
  title = "Perguntas frequentes",
  description,
  id = "perguntas-frequentes",
  className = "",
}: FaqSectionProps) {
  if (items.length === 0) return null;

  const headingId = `${id}-titulo`;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={`bg-[#F7FAEF] py-20 md:py-24 ${className}`.trim()}
    >
      <div className="mx-auto grid w-full max-w-screen-xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16 lg:px-8">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#8B4F23]">
            {eyebrow}
          </p>
          <h2
            id={headingId}
            className="mt-3 font-display text-3xl font-bold leading-tight text-[#2D1E0F] md:text-5xl"
          >
            {title}
          </h2>
          {description && (
            <p className="mt-5 max-w-xl text-base leading-relaxed text-gray-600">
              {description}
            </p>
          )}
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <details
              key={`${item.question}-${index}`}
              className="group overflow-hidden rounded-2xl border border-[#8B4F23]/10 bg-white shadow-sm open:shadow-md"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-5 py-5 font-semibold text-[#2D1E0F] transition-colors hover:bg-[#8B4F23]/[0.035] sm:px-6 [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#8B4F23]/10 text-xl font-normal leading-none text-[#8B4F23] transition-transform duration-200 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <div className="border-t border-[#8B4F23]/10 px-5 py-5 text-sm leading-relaxed text-gray-600 sm:px-6 sm:text-base">
                {item.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
