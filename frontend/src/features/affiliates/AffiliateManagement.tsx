import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { FaChartBar, FaCopy, FaEdit, FaPlus, FaSyncAlt, FaUserPlus, FaUsers } from 'react-icons/fa';
import { AffiliateDialog } from './AffiliateDialog';
import { AffiliateApiError, createAffiliateActivation, listAffiliateEntities, saveAffiliateEntity } from './affiliateService';
import { AffiliatePreparedState } from './AffiliatePreparedState';
import { affiliateDate, commissionLabel, parseCommissionRule } from './affiliateUtils';
import type { AffiliateActivationLink, AffiliateEntity, AffiliateEntityInput } from './types';

function EntityEditor({ entity, kind, agencyId, commissionVisible, onSave, onClose }: {
  entity: AffiliateEntity | null; kind: 'agencies' | 'partners'; agencyId?: string | null;
  commissionVisible: boolean; onSave: (input: AffiliateEntityInput) => Promise<void>; onClose: () => void;
}) {
  const [name, setName] = useState(entity?.name ?? '');
  const [email, setEmail] = useState(entity?.email ?? '');
  const [status, setStatus] = useState(entity?.status ?? 'active');
  const [mode, setMode] = useState<'disabled' | 'percent' | 'fixed'>(entity?.commissionRule?.mode ?? 'disabled');
  const [value, setValue] = useState(entity?.commissionRule ? String(entity.commissionRule.value) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const title = `${entity ? 'Editar' : 'Criar'} ${kind === 'agencies' ? 'agência' : agencyId ? 'parceiro' : 'parceiro independente'}`;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Informe o nome e um e-mail válido.'); return; }
    setError('');
    setBusy(true);
    try {
      await onSave({
        name: name.trim(), email: email.trim().toLowerCase(), status,
        ...(kind === 'partners' ? { agencyId: agencyId ?? null } : {}),
        ...(commissionVisible ? { commissionRule: parseCommissionRule(mode, value) } : {}),
      });
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  };

  return (
    <AffiliateDialog title={title} onClose={onClose} busy={busy}>
      <form className="aff-form" onSubmit={(event) => void submit(event)} noValidate>
        {error && <p className="aff-alert aff-alert--error" role="alert">{error}</p>}
        <label>Nome<input autoComplete="organization" value={name} onChange={(event) => setName(event.target.value)} maxLength={160} required /></label>
        <label>E-mail de acesso<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={240} required /></label>
        <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as 'active' | 'disabled')}><option value="active">Ativo</option><option value="disabled">Desabilitado</option></select></label>
        {commissionVisible && (
          <fieldset className="aff-commission-fields">
            <legend>Comissão para o relatório de repasse</legend>
            <label>Regra<select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>
              <option value="disabled">Não definida</option><option value="percent">Percentual da reserva</option><option value="fixed">Valor por reserva</option>
            </select></label>
            {mode !== 'disabled' && <label>{mode === 'percent' ? 'Percentual (%)' : 'Valor por reserva (R$)'}<input inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} placeholder={mode === 'percent' ? 'Ex.: 5' : 'Ex.: 10,00'} /></label>}
            <p className="aff-help">Visível somente à administração. O relatório não realiza pagamentos.</p>
          </fieldset>
        )}
        <footer className="aff-actions"><button type="button" className="aff-button aff-button--secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="aff-button" disabled={busy} type="submit">{busy ? 'Salvando…' : entity ? 'Salvar alterações' : status === 'active' ? 'Criar e gerar acesso' : 'Criar cadastro'}</button></footer>
      </form>
    </AffiliateDialog>
  );
}

export function AffiliateEntityManager({ kind, agencyId, commissionVisible = false, onSelectAgency, onReport }: {
  kind: 'agencies' | 'partners'; agencyId?: string | null; commissionVisible?: boolean;
  onSelectAgency?: (agency: AffiliateEntity) => void;
  onReport?: (entity: AffiliateEntity) => void;
}) {
  const [items, setItems] = useState<AffiliateEntity[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState<{ entity: AffiliateEntity | null } | null>(null);
  const [invite, setInvite] = useState<(AffiliateActivationLink & { name: string }) | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [prepared, setPrepared] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(''); setPrepared(false);
    try { const result = await listAffiliateEntities(kind, agencyId); setItems(result.items); setNextCursor(result.nextCursor); }
    catch (caught) {
      if (caught instanceof AffiliateApiError && caught.code === 'AFFILIATES_NOT_ENABLED') setPrepared(true);
      else setError(caught instanceof Error ? caught.message : 'Não foi possível carregar a lista.');
    }
    finally { setLoading(false); }
  }, [kind, agencyId]);
  useEffect(() => { void load(); }, [load]);

  const generate = async (item: AffiliateEntity) => {
    if (generating) return;
    setGenerating(item.id); setError(''); setCopied(false);
    try { setInvite({ ...await createAffiliateActivation(kind, item.id), name: item.name }); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível gerar o acesso.'); }
    finally { setGenerating(null); }
  };

  const save = async (input: AffiliateEntityInput) => {
    const editing = editor?.entity;
    const { item } = await saveAffiliateEntity(kind, input, editing?.id);
    setEditor(null);
    setNotice(editing ? 'Cadastro atualizado.' : 'Cadastro criado.');
    await load();
    if (!editing && item.status === 'active') await generate(item);
  };

  const more = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true); setError('');
    try {
      const result = await listAffiliateEntities(kind, agencyId, nextCursor);
      setItems((current) => [...new Map([...current, ...result.items].map((item) => [item.id, item])).values()]);
      setNextCursor(result.nextCursor);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível carregar mais cadastros.'); }
    finally { setLoadingMore(false); }
  };

  if (prepared) return <AffiliatePreparedState />;

  return (
    <section className="aff-module">
      <div className="aff-section-actions">
        <span className="aff-muted">{items.length} cadastro{items.length !== 1 ? 's' : ''}{nextCursor ? ' carregados' : ''}</span>
        <div className="aff-actions">
          <button type="button" className="aff-button aff-button--secondary" onClick={() => void load()} disabled={loading}><FaSyncAlt className={loading ? 'aff-spin' : ''} /> Atualizar</button>
          <button type="button" className="aff-button" onClick={() => setEditor({ entity: null })}><FaPlus />{kind === 'agencies' ? 'Nova agência' : agencyId ? 'Novo parceiro' : 'Novo independente'}</button>
        </div>
      </div>
      {notice && <p className="aff-alert" role="status">{notice}</p>}
      {error && <p className="aff-alert aff-alert--error" role="alert">{error}</p>}
      <div className="aff-card aff-scroll" aria-busy={loading}>
        {loading && items.length === 0 ? <p className="aff-empty" role="status">Carregando cadastros…</p> : items.length === 0 && !error ? <p className="aff-empty">Nenhum cadastro encontrado.</p> : items.length > 0 && (
          <table className="aff-table"><thead><tr><th>Cadastro</th><th>Status</th>{commissionVisible && <th>Comissão</th>}<th className="aff-align-end">Ações</th></tr></thead><tbody>
            {items.map((item) => <tr key={item.id}>
              <td><strong>{item.name}</strong><span className="aff-table-subtitle">{item.email}</span></td>
              <td><span className={`aff-status ${item.status === 'active' ? 'is-active' : ''}`}>{item.status === 'active' ? 'Ativo' : 'Desabilitado'}</span></td>
              {commissionVisible && <td>{commissionLabel(item.commissionRule)}</td>}
              <td><div className="aff-actions aff-actions--end">
                {onSelectAgency && <button type="button" className="aff-button aff-button--small aff-button--secondary" onClick={() => onSelectAgency(item)}><FaUsers /> Parceiros</button>}
                {onReport && <button type="button" className="aff-button aff-button--small aff-button--secondary" onClick={() => onReport(item)}><FaChartBar /> Relatório</button>}
                <button type="button" className="aff-icon-button" title="Editar cadastro" aria-label={`Editar ${item.name}`} onClick={() => setEditor({ entity: item })}><FaEdit /></button>
                <button type="button" className="aff-icon-button" title="Gerar link de ativação" aria-label={`Gerar acesso para ${item.name}`} disabled={generating !== null || item.status !== 'active'} onClick={() => void generate(item)}>{generating === item.id ? <FaSyncAlt className="aff-spin" /> : <FaUserPlus />}</button>
              </div></td>
            </tr>)}
          </tbody></table>
        )}
      </div>
      {nextCursor && <button type="button" className="aff-button aff-button--secondary aff-load-more" disabled={loadingMore} onClick={() => void more()}>{loadingMore ? 'Carregando…' : 'Carregar mais'}</button>}
      {editor && <EntityEditor entity={editor.entity} kind={kind} agencyId={agencyId} commissionVisible={commissionVisible} onSave={save} onClose={() => setEditor(null)} />}
      {invite && <AffiliateDialog title={`Acesso de ${invite.name}`} onClose={() => setInvite(null)}>
        <div className="aff-form"><p>Compartilhe este link com o responsável para que ele defina a própria senha.</p><label>Link de ativação<input readOnly value={invite.url} onFocus={(event) => event.currentTarget.select()} /></label>
          <p className="aff-help">Válido até {affiliateDate(invite.expiresAt)}. Nenhum e-mail é enviado automaticamente.</p>
          <button type="button" className="aff-button" onClick={() => void navigator.clipboard.writeText(invite.url).then(() => setCopied(true)).catch(() => setError('Selecione e copie o link de ativação.'))}><FaCopy />{copied ? 'Link copiado' : 'Copiar link'}</button>
        </div>
      </AffiliateDialog>}
    </section>
  );
}
