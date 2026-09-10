import { useEffect, useState } from "react";

export interface ConfigSite {
  textoFuncionamento?: string;
}

let _cache: ConfigSite | null = null;
let _promise: Promise<ConfigSite> | null = null;

async function carregarConfigSite(): Promise<ConfigSite> {
  if (_cache !== null) return _cache;
  if (!_promise) {
    _promise = Promise.all([
      import("firebase/firestore"),
      import("../../firebase"),
    ])
      .then(([{ doc, getDoc }, { db }]) => getDoc(doc(db, "configuracoes", "site")))
      .then((snap) => {
        _cache = snap.exists() ? (snap.data() as ConfigSite) : {};
        return _cache;
      })
      .catch(() => {
        _promise = null;
        return {};
      });
  }
  return _promise;
}

export function invalidarCacheConfigSite() {
  _cache = null;
  _promise = null;
}

export function useConfigSite() {
  const [config, setConfig] = useState<ConfigSite>(_cache ?? {});
  const [carregando, setCarregando] = useState(_cache === null);

  useEffect(() => {
    if (_cache !== null) return;

    let ativo = true;
    const timeoutId = window.setTimeout(() => {
      carregarConfigSite().then((c) => {
        if (!ativo) return;
        setConfig(c);
        setCarregando(false);
      });
    }, 1200);

    return () => {
      ativo = false;
      window.clearTimeout(timeoutId);
    };
  }, []);

  return { config, carregando };
}
