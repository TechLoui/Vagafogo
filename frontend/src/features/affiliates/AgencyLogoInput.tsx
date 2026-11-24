import { useId, useRef, useState } from 'react';
import { FaImage, FaTrashAlt } from 'react-icons/fa';
import { readAgencyLogo } from './affiliateLogo';

export function AgencyLogoInput({ currentUrl, value, disabled, onChange, onReading }: {
  currentUrl?: string | null; value: string | null | undefined; disabled: boolean;
  onChange: (value: string | null) => void; onReading: (reading: boolean) => void;
}) {
  const inputId = useId();
  const version = useRef(0);
  const [error, setError] = useState('');
  const preview = value === undefined ? currentUrl : value;
  return (
    <fieldset className="aff-logo-field" disabled={disabled}>
      <legend>Logo da agência <span>Opcional</span></legend>
      <div className="aff-logo-upload">
        <div className="aff-logo-preview">{preview ? <img src={preview} alt="Prévia da logo da agência" /> : <FaImage aria-hidden="true" />}</div>
        <div className="aff-logo-controls">
          <label htmlFor={inputId}>Escolher imagem</label>
          <input id={inputId} type="file" accept="image/png,image/jpeg,image/webp" aria-describedby={`${inputId}-help${error ? ` ${inputId}-error` : ''}`} onChange={(event) => {
            const file = event.target.files?.[0]; event.target.value = '';
            if (!file) return;
            const selected = ++version.current;
            setError(''); onReading(true);
            void readAgencyLogo(file).then((dataUrl) => { if (selected === version.current) onChange(dataUrl); })
              .catch((caught) => { if (selected === version.current) setError(caught instanceof Error ? caught.message : 'Não foi possível abrir a imagem.'); })
              .finally(() => { if (selected === version.current) onReading(false); });
          }} />
          <p id={`${inputId}-help`} className="aff-help">PNG, JPG ou WebP, até 2 MB, de 32 a 4096 px por lado. Otimizada sem recorte e aplicada ao salvar.</p>
          {preview && <button type="button" className="aff-text-button" onClick={() => { version.current++; setError(''); onReading(false); onChange(null); }}><FaTrashAlt aria-hidden="true" /> Remover logo</button>}
        </div>
      </div>
      {error && <p id={`${inputId}-error`} className="aff-alert aff-alert--error" role="alert">{error}</p>}
    </fieldset>
  );
}
