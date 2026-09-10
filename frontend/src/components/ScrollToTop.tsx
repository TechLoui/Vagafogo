import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
  const { pathname, hash, key: locationKey } = useLocation();
  const primeiraRenderizacao = useRef(true);

  useEffect(() => {
    const classeAncora = "navegacao-por-ancora";
    document.documentElement.classList.toggle(classeAncora, Boolean(hash));

    const frame = window.requestAnimationFrame(() => {
      const focar = (elemento: HTMLElement) => {
        if (!elemento.hasAttribute("tabindex")) elemento.setAttribute("tabindex", "-1");
        elemento.focus({ preventScroll: true });
      };

      if (hash) {
        let targetId = hash.slice(1);

        try {
          targetId = decodeURIComponent(targetId);
        } catch {
          // Mantém o valor original quando a âncora não contém uma URI válida.
        }

        const target = document.getElementById(targetId);

        if (target) {
          target.scrollIntoView({ block: "start", behavior: "auto" });
          focar(target);
          primeiraRenderizacao.current = false;
          return;
        }
      }

      window.scrollTo({ top: 0, left: 0, behavior: "auto" });

      if (!primeiraRenderizacao.current) {
        const main = document.getElementById("conteudo-principal");
        const titulo = main?.querySelector<HTMLElement>("h1");

        if (titulo) focar(titulo);
        else if (main) focar(main);
      }

      primeiraRenderizacao.current = false;
    });

    return () => {
      window.cancelAnimationFrame(frame);
      document.documentElement.classList.remove(classeAncora);
    };
  }, [pathname, hash, locationKey]);

  return null;
}
