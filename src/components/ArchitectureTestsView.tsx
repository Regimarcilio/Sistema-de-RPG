import React, { useState } from 'react';
import { CheckCircle2, Play, XCircle } from 'lucide-react';
import type { ResultadoTeste } from '../types/api.ts';
import { UmlDiagramsPanel } from './UmlDiagramsPanel.tsx';

interface ArchitectureTestsViewProps {
  resultadosTestes: ResultadoTeste[];
  onExecutarTestes: () => Promise<void>;
  ocupado: boolean;
}

interface ClasseUML {
  nome: string;
  papel: string;
  heranca: string;
  atributos: string[];
  metodos: string[];
  detalhe: string;
}

const CLASSES_UML: ClasseUML[] = [
  {
    nome: 'Personagem (ABC)',
    papel: 'Domínio · Entidade Abstrata',
    heranca: 'Base para Guerreiro, Mago, Arqueiro e Monstro',
    atributos: [
      '_nome, _nivel, _xp, _ouro',
      '_vida, _vida_max, _mana, _mana_max, _forca',
      '_inventario (somente leitura)',
      'JOGAVEL = True | CUSTO_ESPECIAL',
    ],
    metodos: [
      'atacar(alvo) [abstrato]',
      'habilidade_especial(alvo) [abstrato]',
      'receber_dano(dano), curar(qtd)',
      'ganhar_xp(qtd), usar_item(nome)',
    ],
    detalhe:
      'Aplica Encapsulamento: atributos sensíveis são privados e só mudam via métodos validadores. usar_item() remove do inventário apenas após o efeito suceder.',
  },
  {
    nome: 'Guerreiro / Mago / Arqueiro',
    papel: 'Domínio · Subclasses Jogáveis',
    heranca: 'Herdam de Personagem',
    atributos: [
      'Guerreiro: HP 120 · MP 30 · For 15 · Custo 10',
      'Mago: HP 70 · MP 100 · For 6 · Custo 20',
      'Arqueiro: HP 90 · MP 50 · For 11 · Custo 12',
    ],
    metodos: [
      'Guerreiro: Golpe Poderoso (2× força)',
      'Mago: Bola de Fogo (2× força + 25)',
      'Arqueiro: Chuva de Flechas (3 disparos)',
    ],
    detalhe:
      'Aplica Polimorfismo: cada classe implementa atacar() e habilidade_especial() com fórmulas distintas, sendo tratadas uniformemente por Combate.',
  },
  {
    nome: 'IUsavel & Item',
    papel: 'Domínio · Interface e Hierarquia',
    heranca: 'PocaoVida, PocaoMana, ElixirXP implementam Item(IUsavel)',
    atributos: ['_nome, _preco, _valor_efeito', 'TIPO (discriminador para SQLite)'],
    metodos: [
      'usar(alvo: Personagem): string',
      'TIPOS_ITEM[tipo] (Fábrica polimórfica)',
    ],
    detalhe:
      'A fábrica TIPOS_ITEM reconstrói a subclasse correta a partir da coluna tipo gravada na tabela itens do SQLite.',
  },
  {
    nome: 'Inventario',
    papel: 'Domínio · Coleção Limitada',
    heranca: 'Composição dentro de Personagem',
    atributos: ['_capacidade (int > 0)', '_itens: Map<nome, [Item, qtd]>'],
    metodos: [
      'adicionar(item, qtd)',
      'obter(nome) [consulta sem remover]',
      'remover(nome)',
      'listar()',
    ],
    detalhe:
      'Conta total de unidades (não apenas tipos distintos) e lança InventarioCheioError ou ItemNaoEncontradoError quando violado.',
  },
  {
    nome: 'Combate & Loja',
    papel: 'Domínio · Regras de Negócio',
    heranca: 'Orquestradores de interação',
    atributos: ['Combate: heroi, monstro, log', 'Loja: _catalogo'],
    metodos: [
      'Combate.executar() / executar_turno()',
      'Loja.comprar(comprador, nome_item)',
    ],
    detalhe:
      'Loja valida capacidade ANTES de descontar ouro; Combate impede luta com herói morto ou monstro já derrotado.',
  },
  {
    nome: 'RepositorioRPG',
    papel: 'Persistência · SQLite 3FN',
    heranca: 'Camada de Acesso a Dados (DAO)',
    atributos: ['conn (SQLite com PRAGMA foreign_keys = ON)'],
    metodos: [
      'semear_itens(catalogo)',
      'salvar(p) [transação atômica]',
      'carregar(nome) [reidratação]',
      'excluir(nome) [ON DELETE CASCADE]',
    ],
    detalhe:
      'Rejeita NPCs não jogáveis (Monstro), impede colisão de nome entre classes distintas e executa UPDATE explícito preservando IDs sequenciais.',
  },
];

const PILARES_POO = [
  {
    titulo: 'Abstração',
    texto: 'Personagem, Item e IUsavel definem contratos mínimos e ocultam detalhes internos de implementação.',
  },
  {
    titulo: 'Encapsulamento',
    texto: 'Vida, mana, XP, ouro e capacidade são privados; o estado só muda por métodos que validam invariantes.',
  },
  {
    titulo: 'Herança',
    texto: 'Guerreiro, Mago, Arqueiro e Monstro herdam de Personagem; PocaoVida, PocaoMana e ElixirXP herdam de Item.',
  },
  {
    titulo: 'Polimorfismo',
    texto: 'atacar(), habilidade_especial() e usar() assumem comportamentos específicos em cada subclasse em tempo de execução.',
  },
];

export const ArchitectureTestsView: React.FC<ArchitectureTestsViewProps> = ({
  resultadosTestes,
  onExecutarTestes,
  ocupado,
}) => {
  const [classeAtiva, setClasseAtiva] = useState<string>(CLASSES_UML[0].nome);
  const selecionada = CLASSES_UML.find((c) => c.nome === classeAtiva) ?? CLASSES_UML[0];

  const aprovados = resultadosTestes.filter((r) => r.passou).length;

  return (
    <div className="space-y-8">
      {/* Suíte de Testes Automatizados */}
      <section className="rounded-xl bg-[#11192B] border border-slate-800/80 p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-100">
              Testes Automatizados de Domínio e SQLite
            </h2>
            <p className="text-sm text-slate-400">
              11 cenários de borda executados em banco SQLite isolado (<code className="text-slate-300">:memory:</code>), sem alterar <code className="text-slate-300">rpg.db</code>.
            </p>
          </div>

          <div className="flex items-center gap-4">
            {resultadosTestes.length > 0 && (
              <span className="text-sm font-mono tabular-nums text-emerald-400 font-semibold">
                {aprovados}/{resultadosTestes.length} aprovados
              </span>
            )}
            <button
              type="button"
              disabled={ocupado}
              onClick={onExecutarTestes}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              Executar 11 Testes
            </button>
          </div>
        </div>

        {resultadosTestes.length === 0 ? (
          <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-8 text-center text-sm text-slate-400">
            Clique em "Executar 11 Testes" para rodar a suíte completa contra o repositório SQLite em memória.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-lg overflow-hidden bg-slate-950/50">
            {resultadosTestes.map((t) => (
              <div
                key={t.nome}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {t.passou ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-medium text-slate-100">
                        {t.nome}
                      </span>
                      <span className="text-xs text-slate-400">· {t.regra}</span>
                    </div>
                    <p className="text-xs text-slate-400">{t.descricao}</p>
                    {t.erro && <p className="text-xs text-rose-400 font-mono">{t.erro}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 font-mono tabular-nums text-xs">
                  <span className={t.passou ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                    {t.passou ? 'Aprovado' : 'Falhou'}
                  </span>
                  <span className="text-slate-500">{t.duracaoMs.toFixed(2)} ms</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4 Pilares de POO */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-100">Os 4 Pilares de POO no Projeto</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PILARES_POO.map((pilar) => (
            <div
              key={pilar.titulo}
              className="rounded-xl bg-[#11192B] border border-slate-800/80 p-5 space-y-2"
            >
              <h3 className="text-base font-semibold text-amber-400">{pilar.titulo}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{pilar.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Explorador UML / Camadas */}
      <section className="rounded-xl bg-[#11192B] border border-slate-800/80 p-6 space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Arquitetura em Camadas e UML</h2>
          <p className="text-sm text-slate-400 mt-1">
            Selecione um componente para inspecionar responsabilidades, atributos e métodos polimórficos.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-2">
            {CLASSES_UML.map((cls) => {
              const ativo = cls.nome === selecionada.nome;
              return (
                <button
                  key={cls.nome}
                  type="button"
                  onClick={() => setClasseAtiva(cls.nome)}
                  className={`w-full text-left rounded-lg p-3.5 border transition-colors ${
                    ativo
                      ? 'bg-amber-500/10 border-amber-500/50 text-slate-100'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <p className="font-mono text-sm font-semibold">{cls.nome}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{cls.papel}</p>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7 rounded-xl bg-slate-900/70 border border-slate-800 p-6 space-y-5">
            <div className="border-b border-slate-800 pb-4 space-y-1">
              <h3 className="text-lg font-semibold font-mono text-amber-300">
                {selecionada.nome}
              </h3>
              <p className="text-xs text-slate-400">{selecionada.heranca}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400">Atributos e Estado</h4>
                <ul className="space-y-1.5 font-mono text-xs text-slate-200">
                  {selecionada.atributos.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400">Métodos e Contratos</h4>
                <ul className="space-y-1.5 font-mono text-xs text-sky-300">
                  {selecionada.metodos.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-sm text-slate-300 leading-relaxed">
              {selecionada.detalhe}
            </div>
          </div>
        </div>
      </section>

      {/* Diagramas UML Visuais */}
      <UmlDiagramsPanel />
    </div>
  );
};
