import type { MonstroPreset, PersonagemDTO } from '../domain/rpg.ts';
import type { InspecaoBanco, ResultadoTeste } from '../server/repositorio.ts';

export type { PersonagemDTO, MonstroPreset, InspecaoBanco, ResultadoTeste };

export interface CatalogoItemDTO {
  nome: string;
  tipo: string;
  preco: number;
  valorEfeito: number;
}

export interface EstadoRPG {
  personagens: PersonagemDTO[];
  catalogo: CatalogoItemDTO[];
  bestiario: MonstroPreset[];
  banco: InspecaoBanco;
}

export interface MonstroAtivo {
  nome: string;
  vida: number;
  vidaMax: number;
  forca: number;
  recompensaXp: number;
  recompensaOuro: number;
  vivo: boolean;
}

export interface FeedbackEvento {
  tipo: 'sucesso' | 'erro' | 'info';
  titulo: string;
  detalhe: string;
  codigoErro?: string;
}
