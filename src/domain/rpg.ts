export class RPGError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InventarioCheioError extends RPGError {}
export class OuroInsuficienteError extends RPGError {}
export class ItemNaoEncontradoError extends RPGError {}
export class ManaInsuficienteError extends RPGError {}
export class PersonagemMortoError extends RPGError {}
export class ValorInvalidoError extends RPGError {}
export class PersonagemJaExisteError extends RPGError {}
export class CombateInvalidoError extends RPGError {}

export function positivo(valor: unknown, campo = 'valor'): number {
  if (typeof valor !== 'number' || !Number.isInteger(valor) || valor <= 0) {
    throw new ValorInvalidoError(
      `${campo} deve ser um inteiro positivo (recebido: ${String(valor)}).`,
    );
  }
  return valor;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export interface IUsavel {
  usar(alvo: Personagem): string;
}

export abstract class Item implements IUsavel {
  static readonly TIPO: string = 'Item';

  protected readonly _nome: string;
  protected readonly _preco: number;
  protected readonly _valorEfeito: number;

  constructor(nome: string, preco: number, valorEfeito: number) {
    this._nome = nome;
    this._preco = preco;
    this._valorEfeito = valorEfeito;
  }

  get nome(): string {
    return this._nome;
  }
  get preco(): number {
    return this._preco;
  }
  get valorEfeito(): number {
    return this._valorEfeito;
  }
  get tipo(): string {
    return (this.constructor as typeof Item).TIPO;
  }

  abstract usar(alvo: Personagem): string;

  toString(): string {
    return `${this.tipo}(${this._nome}, ${this._preco} ouro)`;
  }
}

export class PocaoVida extends Item {
  static override readonly TIPO = 'PocaoVida';

  usar(alvo: Personagem): string {
    const curado = alvo.curar(this._valorEfeito);
    return `${alvo.nome} bebeu ${this.nome} e recuperou ${curado} de vida.`;
  }
}

export class PocaoMana extends Item {
  static override readonly TIPO = 'PocaoMana';

  usar(alvo: Personagem): string {
    const rec = alvo.recuperarMana(this._valorEfeito);
    return `${alvo.nome} bebeu ${this.nome} e recuperou ${rec} de mana.`;
  }
}

export class ElixirXP extends Item {
  static override readonly TIPO = 'ElixirXP';

  usar(alvo: Personagem): string {
    const subiu = alvo.ganharXp(this._valorEfeito);
    return (
      `${alvo.nome} usou ${this.nome} e ganhou ${this._valorEfeito} XP.` +
      (subiu ? ' SUBIU DE NÍVEL!' : '')
    );
  }
}

export type ItemConstructor = new (nome: string, preco: number, valorEfeito: number) => Item;

export const TIPOS_ITEM: Record<string, ItemConstructor> = {
  [PocaoVida.TIPO]: PocaoVida,
  [PocaoMana.TIPO]: PocaoMana,
  [ElixirXP.TIPO]: ElixirXP,
};

export const CATALOGO: Item[] = [
  new PocaoVida('Poção de Vida Pequena', 20, 30),
  new PocaoVida('Poção de Vida Grande', 50, 80),
  new PocaoMana('Poção de Mana', 30, 40),
  new ElixirXP('Elixir de Experiência', 60, 50),
];

export interface ItemQuantidade {
  item: Item;
  quantidade: number;
}

export class Inventario {
  private readonly _capacidade: number;
  private readonly _itens = new Map<string, [Item, number]>();

  constructor(capacidade = 10) {
    this._capacidade = positivo(capacidade, 'capacidade');
  }

  get capacidade(): number {
    return this._capacidade;
  }

  get totalUnidades(): number {
    let total = 0;
    for (const [, qtd] of this._itens.values()) {
      total += qtd;
    }
    return total;
  }

  adicionar(item: Item, quantidade = 1): void {
    positivo(quantidade, 'quantidade');
    if (this.totalUnidades + quantidade > this._capacidade) {
      throw new InventarioCheioError(
        `Inventário cheio (${this.totalUnidades}/${this._capacidade}).`,
      );
    }
    const existente = this._itens.get(item.nome);
    if (existente) {
      existente[1] += quantidade;
    } else {
      this._itens.set(item.nome, [item, quantidade]);
    }
  }

  obter(nome: string): Item {
    const entry = this._itens.get(nome);
    if (!entry) {
      throw new ItemNaoEncontradoError(`'${nome}' não está no inventário.`);
    }
    return entry[0];
  }

  remover(nome: string): Item {
    const item = this.obter(nome);
    const entry = this._itens.get(nome)!;
    if (entry[1] === 1) {
      this._itens.delete(nome);
    } else {
      entry[1] -= 1;
    }
    return item;
  }

  listar(): ItemQuantidade[] {
    return Array.from(this._itens.values()).map(([item, quantidade]) => ({
      item,
      quantidade,
    }));
  }
}

export interface PersonagemDTO {
  id?: number;
  nome: string;
  classe: string;
  nivel: number;
  vidaMax: number;
  vida: number;
  manaMax: number;
  mana: number;
  forca: number;
  xp: number;
  ouro: number;
  capacidade: number;
  vivo: boolean;
  custoEspecial: number;
  nomeEspecial: string;
  inventario: {
    nome: string;
    tipo: string;
    preco: number;
    valorEfeito: number;
    quantidade: number;
  }[];
}

export abstract class Personagem {
  static readonly CUSTO_ESPECIAL: number = 0;
  static readonly NOME_ESPECIAL: string = 'Especial';
  static readonly JOGAVEL: boolean = true;

  protected readonly _nome: string;
  protected _vidaMax: number;
  protected _vida: number;
  protected _manaMax: number;
  protected _mana: number;
  protected _forca: number;
  protected _xp = 0;
  protected _nivel = 1;
  protected _ouro: number;
  protected readonly _inventario: Inventario;

  constructor(
    nome: string,
    vidaMax: number,
    manaMax: number,
    forca: number,
    ouro = 100,
    capacidade = 10,
  ) {
    if (!nome || !nome.trim()) {
      throw new ValorInvalidoError('nome deve ser uma string não vazia.');
    }
    this._nome = nome.trim();
    this._vidaMax = vidaMax;
    this._vida = vidaMax;
    this._manaMax = manaMax;
    this._mana = manaMax;
    this._forca = forca;
    this._ouro = ouro;
    this._inventario = new Inventario(capacidade);
  }

  get nome(): string {
    return this._nome;
  }
  get vida(): number {
    return this._vida;
  }
  get vidaMax(): number {
    return this._vidaMax;
  }
  get mana(): number {
    return this._mana;
  }
  get manaMax(): number {
    return this._manaMax;
  }
  get forca(): number {
    return this._forca;
  }
  get xp(): number {
    return this._xp;
  }
  get nivel(): number {
    return this._nivel;
  }
  get ouro(): number {
    return this._ouro;
  }
  get vivo(): boolean {
    return this._vida > 0;
  }
  get classe(): string {
    return this.constructor.name;
  }
  get inventario(): Inventario {
    return this._inventario;
  }
  get jogavel(): boolean {
    return (this.constructor as typeof Personagem).JOGAVEL;
  }
  get custoEspecial(): number {
    return (this.constructor as typeof Personagem).CUSTO_ESPECIAL;
  }
  get nomeEspecial(): string {
    return (this.constructor as typeof Personagem).NOME_ESPECIAL;
  }

  receberDano(dano: number): number {
    if (typeof dano !== 'number' || !Number.isInteger(dano) || dano < 0) {
      throw new ValorInvalidoError(`dano inválido: ${String(dano)}`);
    }
    this._vida = Math.max(0, this._vida - dano);
    return dano;
  }

  curar(qtd: number): number {
    positivo(qtd, 'cura');
    if (!this.vivo) {
      throw new PersonagemMortoError(`${this.nome} está morto.`);
    }
    const antes = this._vida;
    this._vida = Math.min(this._vidaMax, this._vida + qtd);
    return this._vida - antes;
  }

  gastarMana(qtd: number): void {
    positivo(qtd, 'mana');
    if (this._mana < qtd) {
      throw new ManaInsuficienteError(`${this.nome} não tem mana (${this._mana}/${qtd}).`);
    }
    this._mana -= qtd;
  }

  recuperarMana(qtd: number): number {
    positivo(qtd, 'mana');
    const antes = this._mana;
    this._mana = Math.min(this._manaMax, this._mana + qtd);
    return this._mana - antes;
  }

  ganharOuro(qtd: number): void {
    this._ouro += positivo(qtd, 'ouro');
  }

  gastarOuro(qtd: number): void {
    positivo(qtd, 'ouro');
    if (qtd > this._ouro) {
      throw new OuroInsuficienteError(
        `Ouro insuficiente: precisa de ${qtd}, possui ${this._ouro}.`,
      );
    }
    this._ouro -= qtd;
  }

  ganharXp(qtd: number): boolean {
    this._xp += positivo(qtd, 'xp');
    let subiu = false;
    while (this._xp >= this._nivel * 100) {
      this._xp -= this._nivel * 100;
      this._nivel += 1;
      this._vidaMax += 10;
      this._manaMax += 5;
      this._forca += 2;
      this._vida += 10;
      this._mana += 5;
      subiu = true;
    }
    return subiu;
  }

  usarItem(nomeItem: string): string {
    const item = this.inventario.obter(nomeItem);
    const msg = item.usar(this);
    this.inventario.remover(nomeItem);
    return msg;
  }

  abstract atacar(alvo: Personagem): number;
  abstract habilidadeEspecial(alvo: Personagem): number;

  restaurarEstado(
    nivel: number,
    vidaMax: number,
    vida: number,
    manaMax: number,
    mana: number,
    forca: number,
    xp: number,
    ouro: number,
  ): void {
    this._nivel = nivel;
    this._vidaMax = vidaMax;
    this._vida = vida;
    this._manaMax = manaMax;
    this._mana = mana;
    this._forca = forca;
    this._xp = xp;
    this._ouro = ouro;
  }

  toDTO(id?: number): PersonagemDTO {
    return {
      id,
      nome: this._nome,
      classe: this.classe,
      nivel: this._nivel,
      vidaMax: this._vidaMax,
      vida: this._vida,
      manaMax: this._manaMax,
      mana: this._mana,
      forca: this._forca,
      xp: this._xp,
      ouro: this._ouro,
      capacidade: this._inventario.capacidade,
      vivo: this.vivo,
      custoEspecial: this.custoEspecial,
      nomeEspecial: this.nomeEspecial,
      inventario: this._inventario.listar().map(({ item, quantidade }) => ({
        nome: item.nome,
        tipo: item.tipo,
        preco: item.preco,
        valorEfeito: item.valorEfeito,
        quantidade,
      })),
    };
  }

  toString(): string {
    return `${this.classe} ${this.nome} | Nv ${this.nivel} | HP ${this.vida}/${this.vidaMax} | MP ${this.mana}/${this.manaMax} | XP ${this.xp} | Ouro ${this.ouro}`;
  }
}

export class Guerreiro extends Personagem {
  static override readonly CUSTO_ESPECIAL = 10;
  static override readonly NOME_ESPECIAL = 'Golpe Poderoso';

  constructor(nome: string, capacidade = 10) {
    super(nome, 120, 30, 15, 100, capacidade);
  }

  atacar(alvo: Personagem): number {
    return alvo.receberDano(this._forca + randInt(0, 5));
  }

  habilidadeEspecial(alvo: Personagem): number {
    this.gastarMana(Guerreiro.CUSTO_ESPECIAL);
    return alvo.receberDano(this._forca * 2);
  }
}

export class Mago extends Personagem {
  static override readonly CUSTO_ESPECIAL = 20;
  static override readonly NOME_ESPECIAL = 'Bola de Fogo';

  constructor(nome: string, capacidade = 10) {
    super(nome, 70, 100, 6, 100, capacidade);
  }

  atacar(alvo: Personagem): number {
    return alvo.receberDano(this._forca + randInt(0, 3));
  }

  habilidadeEspecial(alvo: Personagem): number {
    this.gastarMana(Mago.CUSTO_ESPECIAL);
    return alvo.receberDano(this._forca * 2 + 25);
  }
}

export class Arqueiro extends Personagem {
  static override readonly CUSTO_ESPECIAL = 12;
  static override readonly NOME_ESPECIAL = 'Chuva de Flechas';

  constructor(nome: string, capacidade = 10) {
    super(nome, 90, 50, 11, 100, capacidade);
  }

  atacar(alvo: Personagem): number {
    return alvo.receberDano(this._forca + randInt(2, 8));
  }

  habilidadeEspecial(alvo: Personagem): number {
    this.gastarMana(Arqueiro.CUSTO_ESPECIAL);
    let total = 0;
    for (let i = 0; i < 3; i++) {
      total += alvo.receberDano(Math.floor(this._forca / 2) + randInt(0, 4));
    }
    return total;
  }
}

export class Monstro extends Personagem {
  static override readonly JOGAVEL = false;
  readonly recompensaXp: number;
  readonly recompensaOuro: number;

  constructor(
    nome: string,
    vida: number,
    forca: number,
    recompensaXp = 40,
    recompensaOuro = 25,
  ) {
    super(nome, vida, 0, forca, 0, 1);
    this.recompensaXp = recompensaXp;
    this.recompensaOuro = recompensaOuro;
  }

  atacar(alvo: Personagem): number {
    return alvo.receberDano(this._forca + randInt(0, 4));
  }

  habilidadeEspecial(alvo: Personagem): number {
    return this.atacar(alvo);
  }
}

export type JogavelConstructor = new (nome: string, capacidade?: number) => Personagem;

export const CLASSES_PERSONAGEM: Record<string, JogavelConstructor> = {
  Guerreiro,
  Mago,
  Arqueiro,
};

export interface MonstroPreset {
  id: string;
  nome: string;
  vida: number;
  forca: number;
  recompensaXp: number;
  recompensaOuro: number;
  dificuldade: 'Fácil' | 'Médio' | 'Difícil' | 'Chefe';
}

export const BESTIARIO: MonstroPreset[] = [
  {
    id: 'goblin',
    nome: 'Goblin Saqueador',
    vida: 45,
    forca: 7,
    recompensaXp: 50,
    recompensaOuro: 25,
    dificuldade: 'Fácil',
  },
  {
    id: 'orc',
    nome: 'Orc Selvagem',
    vida: 90,
    forca: 12,
    recompensaXp: 120,
    recompensaOuro: 40,
    dificuldade: 'Médio',
  },
  {
    id: 'cavaleiro',
    nome: 'Cavaleiro Negro',
    vida: 145,
    forca: 18,
    recompensaXp: 210,
    recompensaOuro: 85,
    dificuldade: 'Difícil',
  },
  {
    id: 'dragao',
    nome: 'Dragão Ancião',
    vida: 400,
    forca: 30,
    recompensaXp: 500,
    recompensaOuro: 300,
    dificuldade: 'Chefe',
  },
];

export class Combate {
  readonly heroi: Personagem;
  readonly monstro: Monstro;
  readonly log: string[] = [];

  constructor(heroi: Personagem, monstro: Monstro) {
    this.heroi = heroi;
    this.monstro = monstro;
  }

  executar(): boolean {
    const h = this.heroi;
    const m = this.monstro;
    if (!h.vivo) {
      throw new PersonagemMortoError(`${h.nome} está morto e não pode lutar.`);
    }
    if (!m.vivo) {
      throw new CombateInvalidoError(`${m.nome} já foi derrotado.`);
    }
    this.log.push(`${h.nome} (${h.classe}) vs ${m.nome}`);
    let turno = 0;
    while (h.vivo && m.vivo) {
      turno += 1;
      let dano: number;
      let acao: string;
      try {
        dano = h.habilidadeEspecial(m);
        acao = h.nomeEspecial.toLowerCase();
      } catch (err) {
        if (err instanceof ManaInsuficienteError) {
          dano = h.atacar(m);
          acao = 'ataque básico';
        } else {
          throw err;
        }
      }
      this.log.push(`T${turno}: ${h.nome} usa ${acao} -> ${dano} dano (monstro HP ${m.vida})`);
      if (!m.vivo) {
        break;
      }
      const danoM = m.atacar(h);
      this.log.push(`T${turno}: ${m.nome} ataca -> ${danoM} dano (herói HP ${h.vida})`);
    }

    if (h.vivo) {
      const subiu = h.ganharXp(m.recompensaXp);
      h.ganharOuro(m.recompensaOuro);
      this.log.push(
        `Vitória! +${m.recompensaXp} XP, +${m.recompensaOuro} ouro.` +
          (subiu ? ' SUBIU DE NÍVEL!' : ''),
      );
    } else {
      this.log.push(`${h.nome} foi derrotado.`);
    }
    return h.vivo;
  }

  executarTurno(acaoHeroi: 'atacar' | 'especial' | { usarItem: string }): {
    finalizado: boolean;
    venceu: boolean | null;
    subiuNivel: boolean;
    danoHeroi: number;
    danoMonstro: number;
    mensagens: string[];
  } {
    const h = this.heroi;
    const m = this.monstro;
    if (!h.vivo) {
      throw new PersonagemMortoError(`${h.nome} está morto e não pode lutar.`);
    }
    if (!m.vivo) {
      throw new CombateInvalidoError(`${m.nome} já foi derrotado.`);
    }

    const mensagens: string[] = [];
    let danoHeroi = 0;
    let danoMonstro = 0;
    let subiuNivel = false;

    if (acaoHeroi === 'atacar') {
      danoHeroi = h.atacar(m);
      mensagens.push(`${h.nome} usa ataque básico -> ${danoHeroi} dano (monstro HP ${m.vida})`);
    } else if (acaoHeroi === 'especial') {
      danoHeroi = h.habilidadeEspecial(m);
      mensagens.push(
        `${h.nome} usa ${h.nomeEspecial} -> ${danoHeroi} dano (monstro HP ${m.vida})`,
      );
    } else {
      const msgItem = h.usarItem(acaoHeroi.usarItem);
      mensagens.push(msgItem);
    }

    if (!m.vivo) {
      subiuNivel = h.ganharXp(m.recompensaXp);
      h.ganharOuro(m.recompensaOuro);
      mensagens.push(
        `Vitória! +${m.recompensaXp} XP, +${m.recompensaOuro} ouro.` +
          (subiuNivel ? ' SUBIU DE NÍVEL!' : ''),
      );
      return {
        finalizado: true,
        venceu: true,
        subiuNivel,
        danoHeroi,
        danoMonstro: 0,
        mensagens,
      };
    }

    danoMonstro = m.atacar(h);
    mensagens.push(`${m.nome} ataca -> ${danoMonstro} dano (herói HP ${h.vida})`);

    if (!h.vivo) {
      mensagens.push(`${h.nome} foi derrotado.`);
      return {
        finalizado: true,
        venceu: false,
        subiuNivel: false,
        danoHeroi,
        danoMonstro,
        mensagens,
      };
    }

    return {
      finalizado: false,
      venceu: null,
      subiuNivel: false,
      danoHeroi,
      danoMonstro,
      mensagens,
    };
  }
}

export class Loja {
  private readonly _catalogo = new Map<string, Item>();

  constructor(catalogo: Item[]) {
    for (const item of catalogo) {
      this._catalogo.set(item.nome, item);
    }
  }

  listar(): Item[] {
    return Array.from(this._catalogo.values());
  }

  comprar(comprador: Personagem, nomeItem: string): Item {
    const item = this._catalogo.get(nomeItem);
    if (!item) {
      throw new ItemNaoEncontradoError(`'${nomeItem}' não existe na loja.`);
    }
    if (comprador.inventario.totalUnidades >= comprador.inventario.capacidade) {
      throw new InventarioCheioError('Inventário cheio, compra cancelada.');
    }
    comprador.gastarOuro(item.preco);
    comprador.inventario.adicionar(item);
    return item;
  }
}
