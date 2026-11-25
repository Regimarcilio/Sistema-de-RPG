import React from 'react';
import { Coins, FlaskConical, Package, ShieldAlert, ShoppingBag } from 'lucide-react';
import type { CatalogoItemDTO, PersonagemDTO } from '../types/api.ts';

interface ShopInventoryViewProps {
  personagens: PersonagemDTO[];
  heroiSelecionado: PersonagemDTO | null;
  onSelecionarHeroi: (nome: string) => void;
  catalogo: CatalogoItemDTO[];
  onComprarItem: (nomeItem: string) => Promise<void>;
  onUsarItem: (nomeItem: string) => Promise<void>;
  onTestarExcecao: (cenario: 'item_inexistente' | 'nome_duplicado_classe') => Promise<void>;
  ocupado: boolean;
}

function descricaoItem(item: CatalogoItemDTO): string {
  if (item.tipo === 'PocaoVida') return `Recupera +${item.valorEfeito} de vida (HP).`;
  if (item.tipo === 'PocaoMana') return `Recupera +${item.valorEfeito} de mana (MP).`;
  return `Concede +${item.valorEfeito} de experiência (XP) e pode subir de nível.`;
}

export const ShopInventoryView: React.FC<ShopInventoryViewProps> = ({
  personagens,
  heroiSelecionado,
  onSelecionarHeroi,
  catalogo,
  onComprarItem,
  onUsarItem,
  onTestarExcecao,
  ocupado,
}) => {
  const totalUnidades = heroiSelecionado
    ? heroiSelecionado.inventario.reduce((acc, slot) => acc + slot.quantidade, 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Barra de Seleção do Comprador */}
      <section className="rounded-xl bg-[#11192B] border border-slate-800/80 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="loja-heroi" className="text-sm font-medium text-slate-300">
            Personagem ativo:
          </label>
          <select
            id="loja-heroi"
            value={heroiSelecionado?.nome ?? ''}
            onChange={(e) => onSelecionarHeroi(e.target.value)}
            className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
          >
            {personagens.map((p) => (
              <option key={p.nome} value={p.nome}>
                {p.nome} ({p.classe} · Nv {p.nivel})
              </option>
            ))}
          </select>
        </div>

        {heroiSelecionado && (
          <div className="flex items-center gap-6 text-sm font-mono tabular-nums">
            <div className="flex items-center gap-2 text-amber-300">
              <Coins className="w-4 h-4" />
              <span>Ouro: {heroiSelecionado.ouro}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <Package className="w-4 h-4 text-slate-400" />
              <span>
                Capacidade: {totalUnidades}/{heroiSelecionado.capacidade}
              </span>
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Catálogo da Loja */}
        <section className="lg:col-span-7 rounded-xl bg-[#11192B] border border-slate-800/80 p-6 space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Catálogo da Loja</h2>
            <p className="text-sm text-slate-400 mt-1">
              A ordem de validação verifica capacidade do inventário antes de cobrar o ouro.
            </p>
          </div>

          <div className="divide-y divide-slate-800/80">
            {catalogo.map((item) => {
              const podePagar = heroiSelecionado ? heroiSelecionado.ouro >= item.preco : false;
              const cheio = heroiSelecionado
                ? totalUnidades >= heroiSelecionado.capacidade
                : false;

              return (
                <div
                  key={item.nome}
                  className="py-4 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-semibold text-slate-100">{item.nome}</h3>
                      <span className="text-xs font-mono text-slate-400">· {item.tipo}</span>
                    </div>
                    <p className="text-sm text-slate-400">{descricaoItem(item)}</p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-sm font-mono tabular-nums font-semibold text-amber-400">
                      {item.preco} ouro
                    </span>
                    <button
                      type="button"
                      disabled={ocupado || !heroiSelecionado}
                      onClick={() => onComprarItem(item.nome)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        podePagar && !cheio
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                      title={
                        cheio
                          ? 'Clique para testar InventarioCheioError'
                          : !podePagar
                            ? 'Clique para testar OuroInsuficienteError'
                            : `Comprar ${item.nome}`
                      }
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      Comprar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Inventário e Simulador de Regras */}
        <div className="lg:col-span-5 space-y-6">
          <section className="rounded-xl bg-[#11192B] border border-slate-800/80 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-100">Inventário do Herói</h2>
              {heroiSelecionado && (
                <span className="text-xs font-mono tabular-nums text-slate-400">
                  {totalUnidades}/{heroiSelecionado.capacidade} slots
                </span>
              )}
            </div>

            {!heroiSelecionado ? (
              <p className="text-sm text-slate-400">Selecione um herói.</p>
            ) : heroiSelecionado.inventario.length === 0 ? (
              <p className="text-sm text-slate-400 py-4">
                Nenhum item armazenado na tabela associativa <code className="text-slate-300">inventario</code>.
              </p>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {heroiSelecionado.inventario.map((slot) => (
                  <div
                    key={slot.nome}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-100 truncate">{slot.nome}</p>
                      <p className="text-xs font-mono tabular-nums text-slate-400">
                        {slot.tipo} · Qtd {slot.quantidade} · Efeito +{slot.valorEfeito}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => onUsarItem(slot.nome)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                    >
                      <FlaskConical className="w-3.5 h-3.5" />
                      Usar Item
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl bg-[#11192B] border border-slate-800/80 p-6 space-y-3">
            <div className="flex items-center gap-2 text-slate-100">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h3 className="text-base font-semibold">Teste de Exceções de Domínio</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dispare cenários protegidos pelas exceções do domínio e observe a resposta segura do backend e do SQLite.
            </p>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                type="button"
                disabled={ocupado || !heroiSelecionado}
                onClick={() => onTestarExcecao('item_inexistente')}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
              >
                Usar "Espada Lendária"
              </button>
              <button
                type="button"
                disabled={ocupado || !heroiSelecionado}
                onClick={() => onTestarExcecao('nome_duplicado_classe')}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
              >
                Salvar Nome em Outra Classe
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
