import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import {
  BESTIARIO,
  CATALOGO,
  CLASSES_PERSONAGEM,
  Combate,
  Loja,
  Monstro,
  RPGError,
} from './src/domain/rpg.ts';
import {
  RepositorioRPG,
  executarPocCompleta,
  executarSuiteDeTestes,
} from './src/server/repositorio.ts';

const DB_PATH = path.resolve(process.cwd(), 'rpg.db');

function ensureSeededDatabase(): void {
  if (!fs.existsSync(DB_PATH)) {
    executarPocCompleta(DB_PATH);
  } else {
    const repo = new RepositorioRPG(DB_PATH);
    try {
      repo.semearItens(CATALOGO);
    } finally {
      repo.fechar();
    }
  }
}

function withRepo<T>(fn: (repo: RepositorioRPG) => T): T {
  const repo = new RepositorioRPG(DB_PATH);
  try {
    repo.semearItens(CATALOGO);
    return fn(repo);
  } finally {
    repo.fechar();
  }
}

function handleDomainError(res: express.Response, err: unknown): void {
  if (err instanceof RPGError) {
    res.status(400).json({
      erro: err.message,
      tipoErro: err.name,
    });
    return;
  }
  const message = err instanceof Error ? err.message : 'Erro interno do servidor.';
  res.status(500).json({ erro: message, tipoErro: 'ServerError' });
}

function buildEstadoPayload() {
  return withRepo((repo) => ({
    personagens: repo.listarPersonagensDTO(),
    catalogo: CATALOGO.map((i) => ({
      nome: i.nome,
      tipo: i.tipo,
      preco: i.preco,
      valorEfeito: i.valorEfeito,
    })),
    bestiario: BESTIARIO,
    banco: repo.inspecionarTabelas(),
  }));
}

async function startServer() {
  ensureSeededDatabase();

  const app = express();
  app.use(express.json());

  app.get('/api/estado', (_req, res) => {
    try {
      res.json(buildEstadoPayload());
    } catch (err) {
      handleDomainError(res, err);
    }
  });

  app.post('/api/personagens', (req, res) => {
    try {
      const { nome, classe, capacidade } = req.body as {
        nome?: string;
        classe?: string;
        capacidade?: number;
      };
      if (!classe || !CLASSES_PERSONAGEM[classe]) {
        throw new RPGError(`Classe inválida: ${String(classe)}. Escolha Guerreiro, Mago ou Arqueiro.`);
      }
      const Construtor = CLASSES_PERSONAGEM[classe];
      const cap = typeof capacidade === 'number' ? capacidade : 10;
      const novo = new Construtor(nome ?? '', cap);
      withRepo((repo) => {
        repo.salvar(novo);
      });
      res.status(201).json({
        mensagem: `${novo.classe} ${novo.nome} criado e salvo no SQLite.`,
        estado: buildEstadoPayload(),
      });
    } catch (err) {
      handleDomainError(res, err);
    }
  });

  app.post('/api/personagens/:nome/reviver', (req, res) => {
    try {
      const nome = req.params.nome;
      withRepo((repo) => {
        const p = repo.carregar(nome);
        p.restaurarEstado(p.nivel, p.vidaMax, p.vidaMax, p.manaMax, p.manaMax, p.forca, p.xp, p.ouro);
        repo.salvar(p);
      });
      res.json({
        mensagem: `${nome} recuperou toda a vida e mana na estalagem.`,
        estado: buildEstadoPayload(),
      });
    } catch (err) {
      handleDomainError(res, err);
    }
  });

  app.delete('/api/personagens/:nome', (req, res) => {
    try {
      const nome = req.params.nome;
      withRepo((repo) => {
        repo.carregar(nome);
        repo.excluir(nome);
      });
      res.json({
        mensagem: `Personagem ${nome} excluído (ON DELETE CASCADE aplicado no inventário).`,
        estado: buildEstadoPayload(),
      });
    } catch (err) {
      handleDomainError(res, err);
    }
  });

  app.post('/api/loja/comprar', (req, res) => {
    try {
      const { nomePersonagem, nomeItem } = req.body as {
        nomePersonagem?: string;
        nomeItem?: string;
      };
      const loja = new Loja(CATALOGO);
      const mensagem = withRepo((repo) => {
        const p = repo.carregar(nomePersonagem ?? '');
        const item = loja.comprar(p, nomeItem ?? '');
        repo.salvar(p);
        return `${p.nome} comprou ${item.nome} por ${item.preco} ouro (restante: ${p.ouro}).`;
      });
      res.json({
        mensagem,
        estado: buildEstadoPayload(),
      });
    } catch (err) {
      handleDomainError(res, err);
    }
  });

  app.post('/api/personagens/:nome/usar-item', (req, res) => {
    try {
      const nome = req.params.nome;
      const { nomeItem } = req.body as { nomeItem?: string };
      const mensagem = withRepo((repo) => {
        const p = repo.carregar(nome);
        const msg = p.usarItem(nomeItem ?? '');
        repo.salvar(p);
        return msg;
      });
      res.json({
        mensagem,
        estado: buildEstadoPayload(),
      });
    } catch (err) {
      handleDomainError(res, err);
    }
  });

  app.post('/api/combate/auto', (req, res) => {
    try {
      const { nomePersonagem, monstro } = req.body as {
        nomePersonagem?: string;
        monstro?: {
          nome: string;
          vida: number;
          vidaMax?: number;
          forca: number;
          recompensaXp: number;
          recompensaOuro: number;
        };
      };
      if (!monstro || !monstro.nome) {
        throw new RPGError('Dados do monstro ausentes.');
      }
      const m = new Monstro(
        monstro.nome,
        monstro.vidaMax ?? monstro.vida,
        monstro.forca,
        monstro.recompensaXp,
        monstro.recompensaOuro,
      );
      if (monstro.vida < m.vidaMax) {
        m.receberDano(m.vidaMax - monstro.vida);
      }

      const resultado = withRepo((repo) => {
        const h = repo.carregar(nomePersonagem ?? '');
        const combate = new Combate(h, m);
        const venceu = combate.executar();
        repo.salvar(h);
        return {
          venceu,
          log: combate.log,
          monstroVida: m.vida,
        };
      });

      res.json({
        ...resultado,
        estado: buildEstadoPayload(),
      });
    } catch (err) {
      handleDomainError(res, err);
    }
  });

  app.post('/api/combate/turno', (req, res) => {
    try {
      const { nomePersonagem, monstro, acao, nomeItem } = req.body as {
        nomePersonagem?: string;
        monstro?: {
          nome: string;
          vida: number;
          vidaMax: number;
          forca: number;
          recompensaXp: number;
          recompensaOuro: number;
        };
        acao?: 'atacar' | 'especial' | 'usarItem';
        nomeItem?: string;
      };
      if (!monstro || !monstro.nome) {
        throw new RPGError('Dados do monstro ausentes.');
      }

      const m = new Monstro(
        monstro.nome,
        monstro.vidaMax,
        monstro.forca,
        monstro.recompensaXp,
        monstro.recompensaOuro,
      );
      if (monstro.vida < m.vidaMax) {
        m.receberDano(m.vidaMax - monstro.vida);
      }

      const resultado = withRepo((repo) => {
        const h = repo.carregar(nomePersonagem ?? '');
        const combate = new Combate(h, m);
        const acaoResolvida =
          acao === 'usarItem'
            ? { usarItem: nomeItem ?? '' }
            : acao === 'especial'
              ? 'especial'
              : 'atacar';
        const turno = combate.executarTurno(acaoResolvida);
        repo.salvar(h);
        return {
          ...turno,
          monstro: {
            nome: m.nome,
            vida: m.vida,
            vidaMax: m.vidaMax,
            forca: m.forca,
            recompensaXp: m.recompensaXp,
            recompensaOuro: m.recompensaOuro,
            vivo: m.vivo,
          },
        };
      });

      res.json({
        ...resultado,
        estado: buildEstadoPayload(),
      });
    } catch (err) {
      handleDomainError(res, err);
    }
  });

  app.post('/api/poc/executar', (_req, res) => {
    try {
      const { logs } = executarPocCompleta(DB_PATH);
      res.json({
        logs,
        estado: buildEstadoPayload(),
      });
    } catch (err) {
      handleDomainError(res, err);
    }
  });

  app.post('/api/testes/executar', (_req, res) => {
    try {
      const resultados = executarSuiteDeTestes();
      res.json({
        total: resultados.length,
        aprovados: resultados.filter((r) => r.passou).length,
        resultados,
      });
    } catch (err) {
      handleDomainError(res, err);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor RPG ativo em http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Falha ao iniciar servidor:', err);
  process.exit(1);
});
