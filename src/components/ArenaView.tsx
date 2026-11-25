import React, { useState } from 'react';
import {
  AlertTriangle,
  FlaskConical,
  HeartPulse,
  Plus,
  RotateCcw,
  ShieldAlert,
  Sword,
  Trash2,
  Zap,
} from 'lucide-react';
import type { MonstroAtivo, MonstroPreset, PersonagemDTO } from '../types/api.ts';
import { ClassEmblem } from './ClassEmblem.tsx';

interface ArenaViewProps {
  personagens: PersonagemDTO[];
  heroiSelecionado: PersonagemDTO | null;
  onSelecionarHeroi: (nome: string) => void;
  bestiario: MonstroPreset[];
  monstroAtivo: MonstroAtivo;
  onSelecionarMonstro: (preset: MonstroPreset) => void;
  onCriarPersonagem: (nome: string, classe: string, capacidade: number) => Promise<void>;
  onExcluirPersonagem: (nome: string) => Promise<void>;
  onReviverHeroi: (nome: string) => Promise<void>;
  onTurnoCombate: (acao: 'atacar' | 'especial' | 'usarItem', nomeItem?: string) => Promise<void>;
  onCombateAutomatico: () => Promise<void>;
  onUsarItemForaCombate: (nomeItem: string) => Promise<void>;
  combatLog: string[];
  animacaoHit: 'heroi' | 'monstro' | null;
  ocupado: boolean;
}

function BarraStat({
  label,
  atual,
  max,
  corBarra,
}: {
  label: string;
  atual: number;
  max: number;
  corBarra: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (atual / max) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span className="font-medium">{label}</span>
        <span className="font-mono tabular-nums text-slate-200">
          {atual}/{max}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-900/90 overflow-hidden border border-slate-800">
        <div
          className={`h-full transition-all duration-200 ${corBarra}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export const ArenaView: React.FC<ArenaViewProps> = ({
  personagens,
  heroiSelecionado,
  onSelecionarHeroi,
  bestiario,
  monstroAtivo,
  onSelecionarMonstro,
  onCriarPersonagem,
  onExcluirPersonagem,
  onReviverHeroi,
  onTurnoCombate,
  onCombateAutomatico,
  onUsarItemForaCombate,
  combatLog,
  animacaoHit,
  ocupado,
}) => {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novaClasse, setNovaClasse] = useState<'Guerreiro' | 'Mago' | 'Arqueiro'>('Guerreiro');
  const [novaCapacidade, setNovaCapacidade] = useState(10);

  const handleSubmitCriar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return;
    await onCriarPersonagem(novoNome.trim(), novaClasse, novaCapacidade);
    setNovoNome('');
    setMostrarForm(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Coluna Esquerda: Lista de Heróis e Criação */}
      <aside className="lg:col-span-4 space-y-6">
        <section className="rounded-xl bg-[#11192B] border border-slate-800/80 p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Heróis Salvos</h2>
              <p className="text-xs text-slate-400">
                Persistidos em SQLite · {personagens.length} registro(s)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMostrarForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              {mostrarForm ? 'Fechar' : 'Novo Herói'}
            </button>
          </div>

          {mostrarForm && (
            <form
              onSubmit={handleSubmitCriar}
              className="rounded-lg bg-slate-900/70 border border-slate-800 p-4 space-y-3"
            >
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300" htmlFor="heroi-nome">
                  Nome do personagem
                </label>
                <input
                  id="heroi-nome"
                  type="text"
                  required
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex.: Gandalf"
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300" htmlFor="heroi-classe">
                    Classe (Subclasse)
                  </label>
                  <select
                    id="heroi-classe"
                    value={novaClasse}
                    onChange={(e) =>
                      setNovaClasse(e.target.value as 'Guerreiro' | 'Mago' | 'Arqueiro')
                    }
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Guerreiro">Guerreiro</option>
                    <option value="Mago">Mago</option>
                    <option value="Arqueiro">Arqueiro</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300" htmlFor="heroi-cap">
                    Capacidade
                  </label>
                  <input
                    id="heroi-cap"
                    type="number"
                    min={1}
                    max={30}
                    value={novaCapacidade}
                    onChange={(e) => setNovaCapacidade(Number(e.target.value))}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm font-mono tabular-nums text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={ocupado}
                className="w-full px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Criar e Salvar no Banco
              </button>
            </form>
          )}

          {personagens.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              Nenhum personagem salvo no SQLite. Crie um herói ou execute a PoC.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/70">
              {personagens.map((p) => {
                const selecionado = heroiSelecionado?.nome === p.nome;
                return (
                  <div
                    key={p.nome}
                    className={`py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3 transition-colors ${
                      selecionado ? 'opacity-100' : 'opacity-85 hover:opacity-100'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelecionarHeroi(p.nome)}
                      className="flex items-center gap-3 text-left min-w-0 flex-1 group"
                    >
                      <ClassEmblem tipo={p.classe} morto={!p.vivo} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-semibold truncate ${
                              selecionado
                                ? 'text-amber-400'
                                : 'text-slate-100 group-hover:text-amber-300'
                            }`}
                          >
                            {p.nome}
                          </span>
                          {!p.vivo && (
                            <span className="text-[11px] font-medium text-rose-400">
                              Derrotado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-mono tabular-nums truncate">
                          {p.classe} · Nv {p.nivel} · HP {p.vida}/{p.vidaMax} · {p.ouro} ouro
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onExcluirPersonagem(p.nome)}
                      disabled={ocupado}
                      aria-label={`Excluir ${p.nome}`}
                      title={`Excluir ${p.nome}`}
                      className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Mochila Rápida do Herói */}
        {heroiSelecionado && (
          <section className="rounded-xl bg-[#11192B] border border-slate-800/80 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-100">Inventário em Campo</h3>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {heroiSelecionado.inventario.reduce((acc, i) => acc + i.quantidade, 0)}/
                {heroiSelecionado.capacidade} un.
              </span>
            </div>

            {heroiSelecionado.inventario.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">
                Inventário vazio. Visite a aba Loja e Inventário para adquirir poções.
              </p>
            ) : (
              <div className="divide-y divide-slate-800/70">
                {heroiSelecionado.inventario.map((slot) => (
                  <div
                    key={slot.nome}
                    className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{slot.nome}</p>
                      <p className="text-xs text-slate-400 font-mono tabular-nums">
                        {slot.tipo} · +{slot.valorEfeito} efeito · Qtd {slot.quantidade}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => onUsarItemForaCombate(slot.nome)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                    >
                      <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
                      Usar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </aside>

      {/* Coluna Direita: Palco da Arena */}
      <div className="lg:col-span-8 space-y-6">
        {/* Seleção de Oponente */}
        <section className="rounded-xl bg-[#11192B] border border-slate-800/80 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Bestiário da Arena</h2>
              <p className="text-xs text-slate-400">
                NPCs não jogáveis (JOGAVEL = False) para testar combate por turnos e recompensas
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const preset =
                  bestiario.find((b) => b.nome === monstroAtivo.nome) ?? bestiario[1] ?? bestiario[0];
                if (preset) onSelecionarMonstro(preset);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Invocar Novo Oponente
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {bestiario.map((b) => {
              const ativo = monstroAtivo.nome === b.nome;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onSelecionarMonstro(b)}
                  className={`text-left rounded-lg p-3 border transition-colors ${
                    ativo
                      ? 'bg-amber-500/10 border-amber-500/50 text-slate-100'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <p className="text-sm font-semibold truncate">{b.nome}</p>
                  <p className="text-xs text-slate-400 font-mono tabular-nums mt-1">
                    {b.dificuldade} · HP {b.vida} · For {b.forca}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Confronto Principal */}
        <section className="rounded-xl bg-[#11192B] border border-slate-800/80 p-6 space-y-6">
          {!heroiSelecionado ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Selecione ou crie um herói à esquerda para entrar em combate.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                {/* Card do Herói */}
                <div
                  className={`rounded-xl bg-slate-900/60 border border-slate-800 p-5 flex flex-col justify-between space-y-4 ${
                    animacaoHit === 'heroi' ? 'animate-hit' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <ClassEmblem
                        tipo={heroiSelecionado.classe}
                        morto={!heroiSelecionado.vivo}
                        size="md"
                      />
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-slate-100 truncate">
                          {heroiSelecionado.nome}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono tabular-nums">
                          {heroiSelecionado.classe} · Nível {heroiSelecionado.nivel} ·{' '}
                          {heroiSelecionado.vivo ? 'Em combate' : 'Morto'}
                        </p>
                      </div>
                    </div>
                    {!heroiSelecionado.vivo && (
                      <button
                        type="button"
                        onClick={() => onReviverHeroi(heroiSelecionado.nome)}
                        disabled={ocupado}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                      >
                        <HeartPulse className="w-3.5 h-3.5" />
                        Restaurar
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <BarraStat
                      label="Vida (HP)"
                      atual={heroiSelecionado.vida}
                      max={heroiSelecionado.vidaMax}
                      corBarra={heroiSelecionado.vivo ? 'bg-emerald-500' : 'bg-rose-600'}
                    />
                    <BarraStat
                      label="Mana (MP)"
                      atual={heroiSelecionado.mana}
                      max={heroiSelecionado.manaMax}
                      corBarra="bg-sky-500"
                    />
                    <BarraStat
                      label="Experiência (XP)"
                      atual={heroiSelecionado.xp}
                      max={heroiSelecionado.nivel * 100}
                      corBarra="bg-amber-500"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
                    <span>Força: {heroiSelecionado.forca}</span>
                    <span>Ouro: {heroiSelecionado.ouro}</span>
                    <span>
                      Especial: {heroiSelecionado.custoEspecial} MP
                    </span>
                  </div>
                </div>

                {/* Card do Monstro */}
                <div
                  className={`rounded-xl bg-slate-900/60 border border-slate-800 p-5 flex flex-col justify-between space-y-4 ${
                    animacaoHit === 'monstro' ? 'animate-hit' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <ClassEmblem
                        tipo={monstroAtivo.nome}
                        morto={!monstroAtivo.vivo}
                        size="md"
                      />
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-slate-100 truncate">
                          {monstroAtivo.nome}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono tabular-nums">
                          Monstro NPC · {monstroAtivo.vivo ? 'Ativo' : 'Derrotado'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <BarraStat
                      label="Vida do Monstro (HP)"
                      atual={monstroAtivo.vida}
                      max={monstroAtivo.vidaMax}
                      corBarra={monstroAtivo.vivo ? 'bg-rose-500' : 'bg-slate-600'}
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
                    <span>Força: {monstroAtivo.forca}</span>
                    <span>Recompensa: +{monstroAtivo.recompensaXp} XP</span>
                    <span>+{monstroAtivo.recompensaOuro} ouro</span>
                  </div>
                </div>
              </div>

              {/* Ações de Combate */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => onTurnoCombate('atacar')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                  >
                    <Sword className="w-4 h-4 text-amber-400" />
                    Ataque Básico
                  </button>

                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => onTurnoCombate('especial')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4" />
                    {heroiSelecionado.nomeEspecial} ({heroiSelecionado.custoEspecial} MP)
                  </button>

                  {heroiSelecionado.inventario.slice(0, 2).map((slot) => (
                    <button
                      key={slot.nome}
                      type="button"
                      disabled={ocupado}
                      onClick={() => onTurnoCombate('usarItem', slot.nome)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                    >
                      <FlaskConical className="w-3.5 h-3.5" />
                      {slot.nome} ({slot.quantidade})
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={ocupado}
                  onClick={onCombateAutomatico}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  Resolver Combate Completo
                </button>
              </div>

              {!monstroAtivo.vivo && (
                <div className="rounded-lg bg-slate-900/70 border border-slate-800 px-4 py-3 flex items-center justify-between gap-4 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Este monstro já foi derrotado. Tentar atacar novamente dispara{' '}
                      <code className="text-amber-300">CombateInvalidoError</code> (regra da célula 5).
                    </span>
                  </div>
                </div>
              )}

              {!heroiSelecionado.vivo && (
                <div className="rounded-lg bg-rose-950/30 border border-rose-500/30 px-4 py-3 flex items-center justify-between gap-4 text-xs text-rose-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      {heroiSelecionado.nome} está morto. Curar ou lutar dispara{' '}
                      <code className="text-rose-300">PersonagemMortoError</code> preservando poções no inventário.
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Log de Combate */}
        <section className="rounded-xl bg-[#11192B] border border-slate-800/80 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-100">Registro de Turnos</h3>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {combatLog.length} evento(s)
            </span>
          </div>
          <div className="rounded-lg bg-slate-950 border border-slate-800/90 p-4 max-h-56 overflow-y-auto font-mono text-xs space-y-1.5">
            {combatLog.length === 0 ? (
              <p className="text-slate-500">
                Execute um ataque, habilidade especial ou combate completo para acompanhar o log.
              </p>
            ) : (
              combatLog.map((linha, idx) => (
                <div key={`${idx}-${linha.slice(0, 12)}`} className="text-slate-300 leading-relaxed">
                  {linha}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
