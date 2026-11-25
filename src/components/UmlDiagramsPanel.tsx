import React, { useMemo, useState } from 'react';
import { Check, Code2, Copy, Download, ExternalLink, Eye } from 'lucide-react';

interface DiagramaSpec {
  id: 'classes' | 'sequencia' | 'der' | 'arquitetura';
  titulo: string;
  subtitulo: string;
  arquivo: string;
  mermaid: string;
}

function buildMermaidLiveUrl(code: string): string {
  const payload = JSON.stringify({
    code,
    mermaid: { theme: 'dark' },
    autoSync: true,
    updateDiagram: true,
  });
  const bytes = new TextEncoder().encode(payload);
  let bin = '';
  for (const b of bytes) {
    bin += String.fromCharCode(b);
  }
  return `https://mermaid.live/edit#base64:${btoa(bin)}`;
}

const DIAGRAMAS: DiagramaSpec[] = [
  {
    id: 'classes',
    titulo: 'Diagrama de Classes',
    subtitulo: 'Interfaces, classes abstratas, herança, composição de inventário, serviços e exceções.',
    arquivo: '/uml/01_diagrama_classes.svg',
    mermaid: `classDiagram
    direction TB

    class IUsavel {
        <<interface>>
        +usar(alvo: Personagem) string
    }

    class Item {
        <<abstract>>
        +TIPO: string
        #_nome: string
        #_preco: number
        #_valorEfeito: number
        +usar(alvo: Personagem)* string
    }

    class PocaoVida {
        +TIPO = "PocaoVida"
        +usar(alvo: Personagem) string
    }

    class PocaoMana {
        +TIPO = "PocaoMana"
        +usar(alvo: Personagem) string
    }

    class ElixirXP {
        +TIPO = "ElixirXP"
        +usar(alvo: Personagem) string
    }

    class Inventario {
        -_capacidade: number
        -_itens: Map~string, [Item, number]~
        +adicionar(item: Item, quantidade: number) void
        +obter(nome: string) Item
        +remover(nome: string) Item
        +listar() ItemQuantidade[]
    }

    class Personagem {
        <<abstract>>
        +CUSTO_ESPECIAL: number
        +JOGAVEL: boolean
        #_nome: string
        #_vidaMax: number
        #_vida: number
        #_manaMax: number
        #_mana: number
        #_forca: number
        #_xp: number
        #_nivel: number
        #_ouro: number
        #_inventario: Inventario
        +atacar(alvo: Personagem)* number
        +habilidadeEspecial(alvo: Personagem)* number
        +receberDano(dano: number) number
        +curar(qtd: number) number
        +ganharXp(qtd: number) boolean
        +usarItem(nomeItem: string) string
    }

    class Guerreiro {
        +CUSTO_ESPECIAL = 10
        +atacar(alvo: Personagem) number
        +habilidadeEspecial(alvo: Personagem) number
    }

    class Mago {
        +CUSTO_ESPECIAL = 20
        +atacar(alvo: Personagem) number
        +habilidadeEspecial(alvo: Personagem) number
    }

    class Arqueiro {
        +CUSTO_ESPECIAL = 12
        +atacar(alvo: Personagem) number
        +habilidadeEspecial(alvo: Personagem) number
    }

    class Monstro {
        +JOGAVEL = false
        +recompensaXp: number
        +recompensaOuro: number
        +atacar(alvo: Personagem) number
        +habilidadeEspecial(alvo: Personagem) number
    }

    class Combate {
        +heroi: Personagem
        +monstro: Monstro
        +log: string[]
        +executar() boolean
        +executarTurno(acao) ResultadoTurno
    }

    class Loja {
        -_catalogo: Map~string, Item~
        +listar() Item[]
        +comprar(comprador: Personagem, nomeItem: string) Item
    }

    class RepositorioRPG {
        +conn: DatabaseSync
        +semearItens(catalogo) void
        +salvar(p: Personagem) void
        +carregar(nome: string) Personagem
        +excluir(nome: string) void
        +inspecionarTabelas() InspecaoBanco
    }

    IUsavel <|.. Item
    Item <|-- PocaoVida
    Item <|-- PocaoMana
    Item <|-- ElixirXP
    Personagem <|-- Guerreiro
    Personagem <|-- Mago
    Personagem <|-- Arqueiro
    Personagem <|-- Monstro
    Personagem "1" *-- "1" Inventario
    Inventario "1" o-- "0..*" Item
    Combate --> Personagem
    Combate --> Monstro
    Loja --> Item
    RepositorioRPG ..> Personagem`,
  },
  {
    id: 'sequencia',
    titulo: 'Sequência: Combate e Persistência',
    subtitulo: 'Fluxo de compra na loja, ciclo de turnos, uso atômico de item e commit no SQLite.',
    arquivo: '/uml/02_diagrama_sequencia.svg',
    mermaid: `sequenceDiagram
    actor Jogador as Jogador / UI
    participant Loja
    participant Heroi as Heroi (Guerreiro)
    participant Combate
    participant Monstro
    participant Repo as RepositorioRPG (SQLite)

    Jogador->>Loja: comprar(heroi, "Poção de Vida Grande")
    Loja->>Heroi: verificar capacidade < capacidade_max
    Loja->>Heroi: gastarOuro(50)
    Loja->>Heroi: inventario.adicionar(item)
    Jogador->>Repo: salvar(heroi) [BEGIN ... COMMIT]

    Jogador->>Combate: executarTurno("especial")
    Combate->>Heroi: habilidadeEspecial(monstro)
    Heroi->>Monstro: receberDano(forca * 2)
    Monstro-->>Combate: dano causado

    alt monstro.vivo == true
        Monstro->>Heroi: atacar() -> receberDano(dano)
    else monstro derrotado
        Combate->>Heroi: ganharXp(120) + ganharOuro(40)
    end

    Jogador->>Heroi: usarItem("Poção de Vida Grande")
    Heroi->>Heroi: obter() -> item.usar(this)
    Heroi->>Heroi: inventario.remover(nomeItem)
    Jogador->>Repo: salvar(heroi) [UPDATE personagens & inventario]`,
  },
  {
    id: 'der',
    titulo: 'Modelo Relacional (DER 3FN)',
    subtitulo: 'Tabelas personagens, inventario e itens com PKs, FKs e ON DELETE CASCADE.',
    arquivo: '/uml/03_diagrama_der.svg',
    mermaid: `erDiagram
    personagens ||--o{ inventario : "possui (ON DELETE CASCADE)"
    itens ||--o{ inventario : "compõe"

    personagens {
        INTEGER id PK
        TEXT nome UK
        TEXT classe
        INTEGER nivel
        INTEGER vida_max
        INTEGER vida
        INTEGER mana_max
        INTEGER mana
        INTEGER forca
        INTEGER xp
        INTEGER ouro
        INTEGER capacidade
    }

    inventario {
        INTEGER personagem_id PK,FK
        INTEGER item_id PK,FK
        INTEGER quantidade
    }

    itens {
        INTEGER id PK
        TEXT nome UK
        TEXT tipo
        INTEGER preco
        INTEGER valor_efeito
    }`,
  },
  {
    id: 'arquitetura',
    titulo: 'Arquitetura em Camadas',
    subtitulo: 'Separação entre Apresentação (React), Aplicação (Express), Domínio (POO) e Persistência (SQLite).',
    arquivo: '/uml/04_diagrama_arquitetura.svg',
    mermaid: `flowchart TB
    subgraph Apresentacao["Camada de Apresentação (React + TypeScript)"]
        Arena["ArenaView"]
        Shop["ShopInventoryView"]
        DbView["DatabaseView"]
        TestsView["ArchitectureTestsView"]
    end

    subgraph Aplicacao["Camada de Aplicação (server.ts — Express REST)"]
        Api["/api/estado · /api/personagens · /api/loja · /api/combate · /api/poc · /api/testes"]
    end

    subgraph Dominio["Camada de Domínio (src/domain/rpg.ts — POO)"]
        Pers["Personagem (Guerreiro, Mago, Arqueiro, Monstro)"]
        Itens["IUsavel / Item (PocaoVida, PocaoMana, ElixirXP)"]
        Serv["Inventario · Combate · Loja · RPGError"]
    end

    subgraph Persistencia["Camada de Persistência (src/server/repositorio.ts)"]
        Repo["RepositorioRPG (node:sqlite)"]
        DbFile[("rpg.db (3FN)")]
        DbMem[(":memory: (11 Testes)")]
    end

    Apresentacao --> Aplicacao
    Aplicacao --> Dominio
    Aplicacao --> Persistencia
    Persistencia --> Dominio
    Repo --> DbFile
    Repo --> DbMem`,
  },
];

export const UmlDiagramsPanel: React.FC = () => {
  const [ativo, setAtivo] = useState<DiagramaSpec['id']>('classes');
  const [modo, setModo] = useState<'mermaid' | 'visual'>('mermaid');
  const [copiado, setCopiado] = useState(false);

  const atual = DIAGRAMAS.find((d) => d.id === ativo) ?? DIAGRAMAS[0];
  const mermaidLiveUrl = useMemo(() => buildMermaidLiveUrl(atual.mermaid), [atual.mermaid]);

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(atual.mermaid);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      // Clipboard indisponível em contexto restrito
    }
  };

  return (
    <section className="rounded-xl bg-[#11192B] border border-slate-800/80 p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-100">Diagramas UML e Mermaid</h2>
          <p className="text-sm text-slate-400">{atual.subtitulo}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setModo((m) => (m === 'mermaid' ? 'visual' : 'mermaid'))}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          >
            {modo === 'mermaid' ? (
              <>
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                Visualizar Diagrama Vetorial
              </>
            ) : (
              <>
                <Code2 className="w-3.5 h-3.5 text-sky-400" />
                Ver Código Mermaid
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopiar}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          >
            {copiado ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Mermaid Copiado
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-300" />
                Copiar Mermaid
              </>
            )}
          </button>

          <a
            href={mermaidLiveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Abrir no Mermaid Live
          </a>

          <a
            href={atual.arquivo}
            download
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Baixar SVG
          </a>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 p-1 rounded-lg bg-slate-900/80 border border-slate-800 w-fit">
        {DIAGRAMAS.map((d) => {
          const selecionado = d.id === ativo;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setAtivo(d.id)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                selecionado
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {d.titulo}
            </button>
          );
        })}
      </div>

      {modo === 'mermaid' ? (
        <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 overflow-x-auto">
          <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre">
            {atual.mermaid}
          </pre>
        </div>
      ) : (
        <div className="rounded-xl bg-[#0B1120] border border-slate-800 overflow-x-auto p-3">
          <img
            src={atual.arquivo}
            alt={atual.titulo}
            referrerPolicy="no-referrer"
            className="w-full h-auto min-w-[720px] rounded-lg"
          />
        </div>
      )}
    </section>
  );
};
