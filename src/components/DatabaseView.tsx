import React from 'react';
import { Database, RefreshCw, Terminal } from 'lucide-react';
import type { InspecaoBanco } from '../types/api.ts';

interface DatabaseViewProps {
  banco: InspecaoBanco;
  pocLogs: string[];
  onRecarregarBanco: () => Promise<void>;
  onExecutarPoc: () => Promise<void>;
  ocupado: boolean;
}

export const DatabaseView: React.FC<DatabaseViewProps> = ({
  banco,
  pocLogs,
  onRecarregarBanco,
  onExecutarPoc,
  ocupado,
}) => {
  return (
    <div className="space-y-6">
      {/* Cabeçalho e Ações do Banco */}
      <section className="rounded-xl bg-[#11192B] border border-slate-800/80 p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-100">
            Persistência Relacional — SQLite (3FN)
          </h2>
          <p className="text-sm text-slate-400">
            Inspeção direta das tabelas em <code className="text-amber-300">rpg.db</code> com{' '}
            <code className="text-slate-300">PRAGMA foreign_keys = ON</code> e{' '}
            <code className="text-slate-300">ON DELETE CASCADE</code>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={ocupado}
            onClick={onRecarregarBanco}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Recarregar SELECT
          </button>

          <button
            type="button"
            disabled={ocupado}
            onClick={onExecutarPoc}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <Database className="w-3.5 h-3.5" />
            Recriar Banco e Executar PoC
          </button>
        </div>
      </section>

      {/* Modelo Relacional 3FN */}
      <section className="rounded-xl bg-[#11192B] border border-slate-800/80 p-6 space-y-4">
        <h3 className="text-base font-semibold text-slate-100">
          Esquema Relacional (Terceira Forma Normal)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          <div className="rounded-lg bg-slate-900/70 border border-slate-800 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-semibold text-amber-400">personagens</span>
              <span className="text-xs font-mono text-slate-400">Entidade (1)</span>
            </div>
            <p className="font-mono text-xs text-slate-300 leading-relaxed">
              PK id · UNIQUE nome · classe · nivel · vida_max · vida · mana_max · mana · forca · xp · ouro · capacidade
            </p>
          </div>

          <div className="rounded-lg bg-slate-900/70 border border-slate-800 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-semibold text-sky-400">inventario</span>
              <span className="text-xs font-mono text-slate-400">Associativa (N:N)</span>
            </div>
            <p className="font-mono text-xs text-slate-300 leading-relaxed">
              PK (personagem_id, item_id) · FK personagem_id ON DELETE CASCADE · FK item_id · CHECK (quantidade &gt; 0)
            </p>
          </div>

          <div className="rounded-lg bg-slate-900/70 border border-slate-800 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-semibold text-emerald-400">itens</span>
              <span className="text-xs font-mono text-slate-400">Catálogo (1)</span>
            </div>
            <p className="font-mono text-xs text-slate-300 leading-relaxed">
              PK id · UNIQUE nome · tipo · preco CHECK (&gt;= 0) · valor_efeito
            </p>
          </div>
        </div>
      </section>

      {/* Tabela personagens */}
      <section className="rounded-xl bg-[#11192B] border border-slate-800/80 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-100 font-mono">
            SELECT * FROM personagens
          </h3>
          <span className="text-xs font-mono tabular-nums text-slate-400">
            {banco.personagens.length} linha(s)
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400">
                <th className="py-3 px-4 font-medium">id</th>
                <th className="py-3 px-4 font-medium">nome</th>
                <th className="py-3 px-4 font-medium">classe</th>
                <th className="py-3 px-4 font-medium text-right">nivel</th>
                <th className="py-3 px-4 font-medium text-right">vida</th>
                <th className="py-3 px-4 font-medium text-right">vida_max</th>
                <th className="py-3 px-4 font-medium text-right">mana</th>
                <th className="py-3 px-4 font-medium text-right">mana_max</th>
                <th className="py-3 px-4 font-medium text-right">forca</th>
                <th className="py-3 px-4 font-medium text-right">xp</th>
                <th className="py-3 px-4 font-medium text-right">ouro</th>
                <th className="py-3 px-4 font-medium text-right">capacidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-200">
              {banco.personagens.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-6 px-4 text-center text-slate-500">
                    Tabela vazia.
                  </td>
                </tr>
              ) : (
                banco.personagens.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-4 text-amber-400">{row.id}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-100">{row.nome}</td>
                    <td className="py-2.5 px-4">{row.classe}</td>
                    <td className="py-2.5 px-4 text-right">{row.nivel}</td>
                    <td className="py-2.5 px-4 text-right">{row.vida}</td>
                    <td className="py-2.5 px-4 text-right">{row.vida_max}</td>
                    <td className="py-2.5 px-4 text-right">{row.mana}</td>
                    <td className="py-2.5 px-4 text-right">{row.mana_max}</td>
                    <td className="py-2.5 px-4 text-right">{row.forca}</td>
                    <td className="py-2.5 px-4 text-right">{row.xp}</td>
                    <td className="py-2.5 px-4 text-right text-amber-300">{row.ouro}</td>
                    <td className="py-2.5 px-4 text-right">{row.capacidade}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tabelas itens e inventario JOIN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl bg-[#11192B] border border-slate-800/80 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-100 font-mono">
              SELECT * FROM itens
            </h3>
            <span className="text-xs font-mono tabular-nums text-slate-400">
              {banco.itens.length} linha(s)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400">
                  <th className="py-3 px-4 font-medium">id</th>
                  <th className="py-3 px-4 font-medium">nome</th>
                  <th className="py-3 px-4 font-medium">tipo</th>
                  <th className="py-3 px-4 font-medium text-right">preco</th>
                  <th className="py-3 px-4 font-medium text-right">valor_efeito</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-200">
                {banco.itens.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-4 text-amber-400">{item.id}</td>
                    <td className="py-2.5 px-4 font-semibold">{item.nome}</td>
                    <td className="py-2.5 px-4 text-sky-300">{item.tipo}</td>
                    <td className="py-2.5 px-4 text-right">{item.preco}</td>
                    <td className="py-2.5 px-4 text-right">{item.valor_efeito}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl bg-[#11192B] border border-slate-800/80 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-100 font-mono">
              inventario (JOIN legível)
            </h3>
            <span className="text-xs font-mono tabular-nums text-slate-400">
              {banco.inventarioJoin.length} linha(s)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400">
                  <th className="py-3 px-4 font-medium">personagem</th>
                  <th className="py-3 px-4 font-medium">item</th>
                  <th className="py-3 px-4 font-medium">tipo</th>
                  <th className="py-3 px-4 font-medium text-right">quantidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-200">
                {banco.inventarioJoin.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 px-4 text-center text-slate-500">
                      Nenhum item nos inventários salvos.
                    </td>
                  </tr>
                ) : (
                  banco.inventarioJoin.map((row, idx) => (
                    <tr key={`${row.personagem}-${row.item}-${idx}`} className="hover:bg-slate-900/40">
                      <td className="py-2.5 px-4 font-semibold text-slate-100">
                        {row.personagem}
                      </td>
                      <td className="py-2.5 px-4">{row.item}</td>
                      <td className="py-2.5 px-4 text-sky-300">{row.tipo}</td>
                      <td className="py-2.5 px-4 text-right text-emerald-300">
                        {row.quantidade}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Console de Saída da PoC */}
      {pocLogs.length > 0 && (
        <section className="rounded-xl bg-[#11192B] border border-slate-800/80 p-6 space-y-3">
          <div className="flex items-center gap-2 text-slate-100">
            <Terminal className="w-4 h-4 text-amber-400" />
            <h3 className="text-base font-semibold">Saída da PoC (Células 7 e 8)</h3>
          </div>
          <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 font-mono text-xs space-y-1 max-h-72 overflow-y-auto text-slate-300">
            {pocLogs.map((linha, idx) => (
              <div key={`${idx}-${linha.slice(0, 10)}`}>{linha}</div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
