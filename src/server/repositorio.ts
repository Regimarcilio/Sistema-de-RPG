import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import {
  Arqueiro,
  CATALOGO,
  CLASSES_PERSONAGEM,
  Combate,
  CombateInvalidoError,
  Guerreiro,
  InventarioCheioError,
  ItemNaoEncontradoError,
  Loja,
  Mago,
  Monstro,
  OuroInsuficienteError,
  Personagem,
  PersonagemJaExisteError,
  PersonagemMortoError,
  PocaoVida,
  RPGError,
  TIPOS_ITEM,
  ValorInvalidoError,
  type PersonagemDTO,
} from '../domain/rpg.ts';

export interface TabelaPersonagemRow {
  id: number;
  nome: string;
  classe: string;
  nivel: number;
  vida_max: number;
  vida: number;
  mana_max: number;
  mana: number;
  forca: number;
  xp: number;
  ouro: number;
  capacidade: number;
}

export interface TabelaItemRow {
  id: number;
  nome: string;
  tipo: string;
  preco: number;
  valor_efeito: number;
}

export interface TabelaInventarioRow {
  personagem_id: number;
  item_id: number;
  quantidade: number;
}

export interface TabelaInventarioJoinRow {
  personagem: string;
  item: string;
  tipo: string;
  quantidade: number;
}

export interface InspecaoBanco {
  personagens: TabelaPersonagemRow[];
  itens: TabelaItemRow[];
  inventario: TabelaInventarioRow[];
  inventarioJoin: TabelaInventarioJoinRow[];
}

export interface ResultadoTeste {
  nome: string;
  descricao: string;
  regra: string;
  passou: boolean;
  duracaoMs: number;
  erro?: string;
}

export class RepositorioRPG {
  readonly conn: DatabaseSync;

  constructor(caminho = 'rpg.db') {
    this.conn = new DatabaseSync(caminho);
    this.conn.exec('PRAGMA foreign_keys = ON');
    this.criarTabelas();
  }

  fechar(): void {
    this.conn.close();
  }

  private criarTabelas(): void {
    this.conn.exec(`
      CREATE TABLE IF NOT EXISTS personagens (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        nome       TEXT    NOT NULL UNIQUE,
        classe     TEXT    NOT NULL,
        nivel      INTEGER NOT NULL,
        vida_max   INTEGER NOT NULL,
        vida       INTEGER NOT NULL,
        mana_max   INTEGER NOT NULL,
        mana       INTEGER NOT NULL,
        forca      INTEGER NOT NULL,
        xp         INTEGER NOT NULL,
        ouro       INTEGER NOT NULL,
        capacidade INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS itens (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        nome         TEXT    NOT NULL UNIQUE,
        tipo         TEXT    NOT NULL,
        preco        INTEGER NOT NULL CHECK (preco >= 0),
        valor_efeito INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS inventario (
        personagem_id INTEGER NOT NULL,
        item_id       INTEGER NOT NULL,
        quantidade    INTEGER NOT NULL CHECK (quantidade > 0),
        PRIMARY KEY (personagem_id, item_id),
        FOREIGN KEY (personagem_id) REFERENCES personagens(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id)       REFERENCES itens(id)
      );
    `);
  }

  semearItens(catalogo = CATALOGO): void {
    const stmt = this.conn.prepare(
      'INSERT OR IGNORE INTO itens (nome, tipo, preco, valor_efeito) VALUES (?, ?, ?, ?)',
    );
    for (const i of catalogo) {
      stmt.run(i.nome, i.tipo, i.preco, i.valorEfeito);
    }
  }

  salvar(p: Personagem): void {
    if (!p.jogavel) {
      throw new RPGError(`${p.classe} não é um personagem jogável e não pode ser salvo.`);
    }
    this.conn.exec('BEGIN');
    try {
      const row = this.conn
        .prepare('SELECT id, classe FROM personagens WHERE nome = ?')
        .get(p.nome) as { id: number; classe: string } | undefined;

      if (row && row.classe !== p.classe) {
        throw new PersonagemJaExisteError(
          `O nome '${p.nome}' já pertence a um ${row.classe}; escolha outro nome.`,
        );
      }

      let pid: number;
      if (row) {
        pid = row.id;
        this.conn
          .prepare(
            `UPDATE personagens
             SET nivel=?, vida_max=?, vida=?, mana_max=?, mana=?, forca=?, xp=?, ouro=?, capacidade=?
             WHERE id=?`,
          )
          .run(
            p.nivel,
            p.vidaMax,
            p.vida,
            p.manaMax,
            p.mana,
            p.forca,
            p.xp,
            p.ouro,
            p.inventario.capacidade,
            pid,
          );
      } else {
        const res = this.conn
          .prepare(
            `INSERT INTO personagens
             (nome, classe, nivel, vida_max, vida, mana_max, mana, forca, xp, ouro, capacidade)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            p.nome,
            p.classe,
            p.nivel,
            p.vidaMax,
            p.vida,
            p.manaMax,
            p.mana,
            p.forca,
            p.xp,
            p.ouro,
            p.inventario.capacidade,
          );
        pid = Number(res.lastInsertRowid);
      }

      this.conn.prepare('DELETE FROM inventario WHERE personagem_id = ?').run(pid);
      const insertItem = this.conn.prepare(
        'INSERT OR IGNORE INTO itens (nome, tipo, preco, valor_efeito) VALUES (?, ?, ?, ?)',
      );
      const selectItem = this.conn.prepare('SELECT id FROM itens WHERE nome = ?');
      const insertInv = this.conn.prepare(
        'INSERT INTO inventario (personagem_id, item_id, quantidade) VALUES (?, ?, ?)',
      );

      for (const { item, quantidade } of p.inventario.listar()) {
        insertItem.run(item.nome, item.tipo, item.preco, item.valorEfeito);
        const itemRow = selectItem.get(item.nome) as { id: number };
        insertInv.run(pid, itemRow.id, quantidade);
      }
      this.conn.exec('COMMIT');
    } catch (err) {
      this.conn.exec('ROLLBACK');
      throw err;
    }
  }

  carregar(nome: string): Personagem {
    const row = this.conn
      .prepare(
        `SELECT id, classe, capacidade, nivel, vida_max, vida, mana_max, mana, forca, xp, ouro
         FROM personagens WHERE nome = ?`,
      )
      .get(nome) as
      | {
          id: number;
          classe: string;
          capacidade: number;
          nivel: number;
          vida_max: number;
          vida: number;
          mana_max: number;
          mana: number;
          forca: number;
          xp: number;
          ouro: number;
        }
      | undefined;

    if (!row) {
      throw new ItemNaoEncontradoError(`Personagem '${nome}' não encontrado no banco.`);
    }
    const Construtor = CLASSES_PERSONAGEM[row.classe];
    if (!Construtor) {
      throw new RPGError(`Classe desconhecida no banco: ${row.classe}`);
    }
    const p = new Construtor(nome, row.capacidade);
    p.restaurarEstado(
      row.nivel,
      row.vida_max,
      row.vida,
      row.mana_max,
      row.mana,
      row.forca,
      row.xp,
      row.ouro,
    );

    const invRows = this.conn
      .prepare(
        `SELECT i.tipo, i.nome, i.preco, i.valor_efeito, inv.quantidade
         FROM inventario inv
         JOIN itens i ON i.id = inv.item_id
         WHERE inv.personagem_id = ?`,
      )
      .all(row.id) as {
      tipo: string;
      nome: string;
      preco: number;
      valor_efeito: number;
      quantidade: number;
    }[];

    for (const inv of invRows) {
      const ItemCls = TIPOS_ITEM[inv.tipo];
      if (ItemCls) {
        p.inventario.adicionar(new ItemCls(inv.nome, inv.preco, inv.valor_efeito), inv.quantidade);
      }
    }
    return p;
  }

  listarPersonagensDTO(): PersonagemDTO[] {
    const rows = this.conn
      .prepare('SELECT id, nome FROM personagens ORDER BY id ASC')
      .all() as { id: number; nome: string }[];
    return rows.map((r) => this.carregar(r.nome).toDTO(r.id));
  }

  listarPersonagensResumo(): {
    id: number;
    nome: string;
    classe: string;
    nivel: number;
    vida: number;
    ouro: number;
  }[] {
    return this.conn
      .prepare('SELECT id, nome, classe, nivel, vida, ouro FROM personagens ORDER BY id ASC')
      .all() as {
      id: number;
      nome: string;
      classe: string;
      nivel: number;
      vida: number;
      ouro: number;
    }[];
  }

  excluir(nome: string): void {
    this.conn.prepare('DELETE FROM personagens WHERE nome = ?').run(nome);
  }

  inspecionarTabelas(): InspecaoBanco {
    const personagens = this.conn
      .prepare('SELECT * FROM personagens ORDER BY id ASC')
      .all() as unknown as TabelaPersonagemRow[];
    const itens = this.conn
      .prepare('SELECT * FROM itens ORDER BY id ASC')
      .all() as unknown as TabelaItemRow[];
    const inventario = this.conn
      .prepare('SELECT * FROM inventario ORDER BY personagem_id ASC, item_id ASC')
      .all() as unknown as TabelaInventarioRow[];
    const inventarioJoin = this.conn
      .prepare(
        `SELECT p.nome AS personagem, i.nome AS item, i.tipo AS tipo, inv.quantidade AS quantidade
         FROM inventario inv
         JOIN personagens p ON p.id = inv.personagem_id
         JOIN itens i       ON i.id = inv.item_id
         ORDER BY p.id ASC, i.id ASC`,
      )
      .all() as unknown as TabelaInventarioJoinRow[];
    return { personagens, itens, inventario, inventarioJoin };
  }
}

export function executarPocCompleta(dbPath = 'rpg.db'): {
  logs: string[];
  banco: InspecaoBanco;
} {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  const repo = new RepositorioRPG(dbPath);
  try {
    repo.semearItens(CATALOGO);
    const loja = new Loja(CATALOGO);
    const logs: string[] = [];

    const heroi = new Guerreiro('Arthas');
    logs.push(heroi.toString());
    logs.push('Compras na Loja:');
    for (const nome of ['Poção de Vida Grande', 'Poção de Mana', 'Poção de Vida Pequena']) {
      const item = loja.comprar(heroi, nome);
      logs.push(`  Comprou ${item.nome} -> ouro restante: ${heroi.ouro}`);
    }

    try {
      loja.comprar(heroi, 'Elixir de Experiência');
    } catch (e) {
      if (e instanceof OuroInsuficienteError) {
        logs.push(`Erro tratado (${e.name}): ${e.message}`);
      } else {
        throw e;
      }
    }

    repo.salvar(heroi);
    logs.push('Estado inicial salvo no SQLite (rpg.db).');

    const orc = new Monstro('Orc Selvagem', 90, 12, 120, 40);
    const combate = new Combate(heroi, orc);
    combate.executar();
    logs.push(...combate.log);
    logs.push(heroi.toString());
    logs.push(heroi.usarItem('Poção de Vida Grande'));

    try {
      heroi.usarItem('Espada Lendária');
    } catch (e) {
      if (e instanceof ItemNaoEncontradoError) {
        logs.push(`Erro tratado (${e.name}): ${e.message}`);
      }
    }

    const pequeno = new Mago('Merlin', 1);
    pequeno.ganharOuro(500);
    loja.comprar(pequeno, 'Poção de Mana');
    try {
      loja.comprar(pequeno, 'Poção de Mana');
    } catch (e) {
      if (e instanceof InventarioCheioError) {
        logs.push(`Erro tratado (${e.name}): ${e.message}`);
      }
    }

    try {
      new Combate(heroi, orc).executar();
    } catch (e) {
      if (e instanceof CombateInvalidoError) {
        logs.push(`Erro tratado (${e.name}): ${e.message}`);
      }
    }

    const aprendiz = new Mago('Aprendiz');
    const dragao = new Monstro('Dragão Ancião', 400, 30, 500, 300);
    const c2 = new Combate(aprendiz, dragao);
    c2.executar();
    logs.push(`${c2.log[0]} -> ${c2.log[c2.log.length - 1]}`);

    aprendiz.inventario.adicionar(CATALOGO[0]);
    try {
      aprendiz.usarItem('Poção de Vida Pequena');
    } catch (e) {
      if (e instanceof PersonagemMortoError) {
        logs.push(
          `Erro tratado (${e.name}): ${e.message} | itens preservados: ${aprendiz.inventario.totalUnidades}`,
        );
      }
    }

    repo.salvar(heroi);
    repo.salvar(new Arqueiro('Legolas'));
    logs.push('Estado final salvo no SQLite (Arthas e Legolas).');

    return {
      logs,
      banco: repo.inspecionarTabelas(),
    };
  } finally {
    repo.fechar();
  }
}

function deveFalhar(excecao: new (...args: never[]) => Error, fn: () => void): void {
  try {
    fn();
  } catch (err) {
    if (err instanceof excecao) {
      return;
    }
    throw new Error(
      `Esperava ${excecao.name}, mas recebeu ${err instanceof Error ? err.name : String(err)}`,
    );
  }
  throw new Error(`Esperava ${excecao.name}, mas nenhuma exceção foi lançada`);
}

function assert(condicao: boolean, msg: string): void {
  if (!condicao) {
    throw new Error(msg);
  }
}

export function executarSuiteDeTestes(): ResultadoTeste[] {
  const casos: {
    nome: string;
    descricao: string;
    regra: string;
    fn: () => void;
  }[] = [
    {
      nome: 'pocao_nao_e_perdida_se_efeito_falha',
      descricao: 'Herói morto tenta usar Poção de Vida e mantém o item no inventário.',
      regra: 'Atomicidade do uso de item',
      fn: () => {
        const h = new Guerreiro('T1');
        h.inventario.adicionar(CATALOGO[0]);
        h.receberDano(999);
        deveFalhar(PersonagemMortoError, () => h.usarItem('Poção de Vida Pequena'));
        assert(h.inventario.totalUnidades === 1, 'Item deveria permanecer no inventário');
      },
    },
    {
      nome: 'valores_invalidos_sao_rejeitados',
      descricao: 'Valores negativos ou zero em ouro, XP, cura, dano e quantidade lançam ValorInvalidoError.',
      regra: 'Validação estrita de entradas numéricas',
      fn: () => {
        const h = new Guerreiro('T2');
        const acoes = [
          () => h.gastarOuro(-500),
          () => h.ganharOuro(0),
          () => h.ganharXp(-1),
          () => h.curar(-5),
          () => h.receberDano(-1),
          () => h.inventario.adicionar(CATALOGO[0], -5),
        ];
        for (const fn of acoes) {
          deveFalhar(ValorInvalidoError, fn);
        }
        assert(h.ouro === 100 && h.inventario.totalUnidades === 0, 'Estado não deveria mudar');
      },
    },
    {
      nome: 'monstro_nao_e_salvo',
      descricao: 'NPCs não jogáveis (Monstro) são rejeitados ao tentar salvar no SQLite.',
      regra: 'Separação Jogável vs NPC na persistência',
      fn: () => {
        const r = new RepositorioRPG(':memory:');
        try {
          deveFalhar(RPGError, () => r.salvar(new Monstro('Orc', 90, 12)));
        } finally {
          r.fechar();
        }
      },
    },
    {
      nome: 'capacidade_do_inventario_persiste',
      descricao: 'Capacidade customizada do inventário é salva e restaurada do banco.',
      regra: 'Fidelidade da hidratação',
      fn: () => {
        const r = new RepositorioRPG(':memory:');
        try {
          r.salvar(new Mago('M', 3));
          assert(r.carregar('M').inventario.capacidade === 3, 'Capacidade deveria ser 3');
        } finally {
          r.fechar();
        }
      },
    },
    {
      nome: 'item_desconhecido_e_cadastrado_ao_salvar',
      descricao: 'Item fora do catálogo inicial é inserido automaticamente na tabela itens ao salvar.',
      regra: 'Integridade referencial automática',
      fn: () => {
        const r = new RepositorioRPG(':memory:');
        try {
          const g = new Guerreiro('G');
          g.inventario.adicionar(new PocaoVida('Poção X', 1, 1));
          r.salvar(g);
          const carregado = r.carregar('G');
          assert(
            carregado.inventario.listar()[0].item.nome === 'Poção X',
            'Item deveria ser carregado',
          );
        } finally {
          r.fechar();
        }
      },
    },
    {
      nome: 'nome_duplicado_de_outra_classe_e_rejeitado',
      descricao: 'Tentar salvar um Mago com nome já pertencente a um Guerreiro lança PersonagemJaExisteError.',
      regra: 'Unicidade semântica por nome e classe',
      fn: () => {
        const r = new RepositorioRPG(':memory:');
        try {
          r.salvar(new Guerreiro('Igual'));
          deveFalhar(PersonagemJaExisteError, () => r.salvar(new Mago('Igual')));
          assert(
            r.listarPersonagensResumo()[0].classe === 'Guerreiro' &&
              r.carregar('Igual').vidaMax === 120,
            'Guerreiro original deve permanecer intacto',
          );
        } finally {
          r.fechar();
        }
      },
    },
    {
      nome: 'ids_sao_sequenciais_apos_varios_saves',
      descricao: 'Atualizações repetidas usam UPDATE explícito sem desperdiçar IDs AUTOINCREMENT.',
      regra: 'Eficiência e consistência de chaves primárias',
      fn: () => {
        const r = new RepositorioRPG(':memory:');
        try {
          const a = new Guerreiro('A');
          for (let i = 0; i < 3; i++) {
            r.salvar(a);
          }
          r.salvar(new Mago('B'));
          const ids = r.listarPersonagensResumo().map((x) => x.id);
          assert(ids[0] === 1 && ids[1] === 2, `IDs esperados [1, 2], recebido ${ids.join(',')}`);
        } finally {
          r.fechar();
        }
      },
    },
    {
      nome: 'monstro_morto_nao_luta_de_novo',
      descricao: 'Tentar iniciar combate contra um monstro já derrotado lança CombateInvalidoError.',
      regra: 'Pré-condição de combate',
      fn: () => {
        const h = new Guerreiro('H');
        const m = new Monstro('M', 10, 1);
        new Combate(h, m).executar();
        const xpAntes = h.xp;
        deveFalhar(CombateInvalidoError, () => new Combate(h, m).executar());
        assert(h.xp === xpAntes, 'XP não deve ser duplicado');
      },
    },
    {
      nome: 'loja_nao_cobra_se_inventario_cheio',
      descricao: 'Loja verifica capacidade do inventário antes de descontar ouro do comprador.',
      regra: 'Ordem segura de transação na Loja',
      fn: () => {
        const p = new Mago('P', 1);
        const loja = new Loja(CATALOGO);
        loja.comprar(p, 'Poção de Mana');
        const ouroAntes = p.ouro;
        deveFalhar(InventarioCheioError, () => loja.comprar(p, 'Poção de Mana'));
        assert(p.ouro === ouroAntes, 'Ouro não deveria ser cobrado');
      },
    },
    {
      nome: 'salvar_e_carregar_preserva_estado_e_tipo',
      descricao: 'Fábrica polimórfica recria a subclasse exata (Arqueiro), atributos e inventário.',
      regra: 'Polimorfismo + Persistência 3FN',
      fn: () => {
        const r = new RepositorioRPG(':memory:');
        try {
          const a = new Arqueiro('Arq');
          a.inventario.adicionar(CATALOGO[2], 2);
          a.ganharXp(250);
          a.ganharOuro(7);
          r.salvar(a);
          const b = r.carregar('Arq');
          assert(b instanceof Arqueiro, 'Instância deveria ser Arqueiro');
          assert(
            b.nivel === a.nivel &&
              b.xp === a.xp &&
              b.ouro === a.ouro &&
              b.vidaMax === a.vidaMax &&
              b.inventario.totalUnidades === 2,
            'Atributos e inventário deveriam ser idênticos',
          );
        } finally {
          r.fechar();
        }
      },
    },
    {
      nome: 'excluir_remove_inventario_em_cascata',
      descricao: 'ON DELETE CASCADE limpa automaticamente as linhas associativas da tabela inventario.',
      regra: 'Integridade referencial (FK Cascade)',
      fn: () => {
        const r = new RepositorioRPG(':memory:');
        try {
          const g = new Guerreiro('Del');
          g.inventario.adicionar(CATALOGO[0]);
          r.salvar(g);
          r.excluir('Del');
          const count = r.conn.prepare('SELECT COUNT(*) AS c FROM inventario').get() as {
            c: number;
          };
          assert(count.c === 0, 'Inventário deveria estar vazio após exclusão');
        } finally {
          r.fechar();
        }
      },
    },
  ];

  return casos.map((caso) => {
    const t0 = performance.now();
    try {
      caso.fn();
      return {
        nome: caso.nome,
        descricao: caso.descricao,
        regra: caso.regra,
        passou: true,
        duracaoMs: Number((performance.now() - t0).toFixed(2)),
      };
    } catch (err) {
      return {
        nome: caso.nome,
        descricao: caso.descricao,
        regra: caso.regra,
        passou: false,
        duracaoMs: Number((performance.now() - t0).toFixed(2)),
        erro: err instanceof Error ? err.message : String(err),
      };
    }
  });
}
