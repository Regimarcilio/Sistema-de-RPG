import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, Volume2, VolumeX, X } from 'lucide-react';
import { ArenaView } from './components/ArenaView.tsx';
import { ArchitectureTestsView } from './components/ArchitectureTestsView.tsx';
import { DatabaseView } from './components/DatabaseView.tsx';
import { ShopInventoryView } from './components/ShopInventoryView.tsx';
import type {
  EstadoRPG,
  FeedbackEvento,
  MonstroAtivo,
  MonstroPreset,
  ResultadoTeste,
} from './types/api.ts';
import { somRPG } from './utils/sound.ts';

type Aba = 'arena' | 'loja' | 'banco' | 'testes';

export default function App() {
  const [aba, setAba] = useState<Aba>('arena');
  const [estado, setEstado] = useState<EstadoRPG | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [somAtivo, setSomAtivo] = useState(true);

  const [heroiNome, setHeroiNome] = useState<string>('Arthas');
  const [monstroAtivo, setMonstroAtivo] = useState<MonstroAtivo>({
    nome: 'Orc Selvagem',
    vida: 90,
    vidaMax: 90,
    forca: 12,
    recompensaXp: 120,
    recompensaOuro: 40,
    vivo: true,
  });

  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [pocLogs, setPocLogs] = useState<string[]>([]);
  const [resultadosTestes, setResultadosTestes] = useState<ResultadoTeste[]>([]);
  const [animacaoHit, setAnimacaoHit] = useState<'heroi' | 'monstro' | null>(null);
  const [feedback, setFeedback] = useState<FeedbackEvento | null>(null);

  const heroiSelecionado = useMemo(() => {
    if (!estado || estado.personagens.length === 0) return null;
    return (
      estado.personagens.find((p) => p.nome === heroiNome) ?? estado.personagens[0]
    );
  }, [estado, heroiNome]);

  const carregarEstado = useCallback(async () => {
    try {
      const res = await fetch('/api/estado');
      const data = (await res.json()) as EstadoRPG;
      setEstado(data);
      if (data.personagens.length > 0) {
        setHeroiNome((atual) =>
          data.personagens.some((p) => p.nome === atual) ? atual : data.personagens[0].nome,
        );
      }
    } catch (err) {
      setFeedback({
        tipo: 'erro',
        titulo: 'Falha ao carregar estado',
        detalhe: err instanceof Error ? err.message : 'Erro de comunicação com o servidor.',
      });
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarEstado();
  }, [carregarEstado]);

  const dispararAnimacaoHit = (alvo: 'heroi' | 'monstro') => {
    setAnimacaoHit(alvo);
    window.setTimeout(() => setAnimacaoHit(null), 220);
  };

  const tratarErroResposta = (data: { erro?: string; tipoErro?: string }) => {
    somRPG.erro(somAtivo);
    setFeedback({
      tipo: 'erro',
      titulo: data.tipoErro ? `Exceção tratada: ${data.tipoErro}` : 'Erro de domínio',
      detalhe: data.erro ?? 'Operação rejeitada pelas regras de negócio.',
      codigoErro: data.tipoErro,
    });
  };

  const handleSelecionarMonstro = (preset: MonstroPreset) => {
    setMonstroAtivo({
      nome: preset.nome,
      vida: preset.vida,
      vidaMax: preset.vida,
      forca: preset.forca,
      recompensaXp: preset.recompensaXp,
      recompensaOuro: preset.recompensaOuro,
      vivo: true,
    });
    setCombatLog((prev) => [
      ...prev,
      `Novo oponente invocado: ${preset.nome} (HP ${preset.vida}, Força ${preset.forca}).`,
    ]);
  };

  const handleCriarPersonagem = async (nome: string, classe: string, capacidade: number) => {
    setOcupado(true);
    try {
      const res = await fetch('/api/personagens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, classe, capacidade }),
      });
      const data = await res.json();
      if (!res.ok) {
        tratarErroResposta(data);
        return;
      }
      setEstado(data.estado);
      setHeroiNome(nome);
      somRPG.compra(somAtivo);
      setFeedback({
        tipo: 'sucesso',
        titulo: 'Personagem criado',
        detalhe: data.mensagem,
      });
    } finally {
      setOcupado(false);
    }
  };

  const handleExcluirPersonagem = async (nome: string) => {
    setOcupado(true);
    try {
      const res = await fetch(`/api/personagens/${encodeURIComponent(nome)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        tratarErroResposta(data);
        return;
      }
      setEstado(data.estado);
      if (heroiNome === nome && data.estado.personagens.length > 0) {
        setHeroiNome(data.estado.personagens[0].nome);
      }
      setFeedback({
        tipo: 'info',
        titulo: 'Personagem excluído',
        detalhe: data.mensagem,
      });
    } finally {
      setOcupado(false);
    }
  };

  const handleReviverHeroi = async (nome: string) => {
    setOcupado(true);
    try {
      const res = await fetch(`/api/personagens/${encodeURIComponent(nome)}/reviver`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        tratarErroResposta(data);
        return;
      }
      setEstado(data.estado);
      somRPG.pocao(somAtivo);
      setFeedback({
        tipo: 'sucesso',
        titulo: 'Estado restaurado',
        detalhe: data.mensagem,
      });
    } finally {
      setOcupado(false);
    }
  };

  const handleTurnoCombate = async (
    acao: 'atacar' | 'especial' | 'usarItem',
    nomeItem?: string,
  ) => {
    if (!heroiSelecionado) return;
    setOcupado(true);
    try {
      const res = await fetch('/api/combate/turno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomePersonagem: heroiSelecionado.nome,
          monstro: monstroAtivo,
          acao,
          nomeItem,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        tratarErroResposta(data);
        return;
      }

      setEstado(data.estado);
      setMonstroAtivo(data.monstro);
      setCombatLog((prev) => [...prev, ...data.mensagens]);

      if (acao === 'usarItem') {
        somRPG.pocao(somAtivo);
      } else if (acao === 'especial') {
        somRPG.especial(somAtivo);
        dispararAnimacaoHit('monstro');
      } else {
        somRPG.ataque(somAtivo);
        dispararAnimacaoHit('monstro');
      }

      if (data.danoMonstro > 0) {
        window.setTimeout(() => dispararAnimacaoHit('heroi'), 120);
      }

      if (data.finalizado && data.venceu) {
        somRPG.vitoria(somAtivo);
        setFeedback({
          tipo: 'sucesso',
          titulo: data.subiuNivel ? 'Vitória e Subida de Nível!' : 'Vitória em Combate',
          detalhe: data.mensagens[data.mensagens.length - 1],
        });
      } else if (data.finalizado && data.venceu === false) {
        somRPG.erro(somAtivo);
        setFeedback({
          tipo: 'erro',
          titulo: 'Herói Derrotado',
          detalhe: `${heroiSelecionado.nome} caiu em combate. Você pode testar PersonagemMortoError ou restaurá-lo.`,
        });
      }
    } finally {
      setOcupado(false);
    }
  };

  const handleCombateAutomatico = async () => {
    if (!heroiSelecionado) return;
    setOcupado(true);
    try {
      const res = await fetch('/api/combate/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomePersonagem: heroiSelecionado.nome,
          monstro: monstroAtivo,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        tratarErroResposta(data);
        return;
      }
      setEstado(data.estado);
      setMonstroAtivo((prev) => ({
        ...prev,
        vida: data.monstroVida,
        vivo: data.monstroVida > 0,
      }));
      setCombatLog((prev) => [...prev, ...data.log]);
      if (data.venceu) {
        somRPG.vitoria(somAtivo);
        setFeedback({
          tipo: 'sucesso',
          titulo: 'Combate resolvido',
          detalhe: data.log[data.log.length - 1] ?? 'Vitória registrada no SQLite.',
        });
      } else {
        somRPG.erro(somAtivo);
        setFeedback({
          tipo: 'erro',
          titulo: 'Derrota registrada',
          detalhe: data.log[data.log.length - 1] ?? 'O herói foi derrotado.',
        });
      }
    } finally {
      setOcupado(false);
    }
  };

  const handleComprarItem = async (nomeItem: string) => {
    if (!heroiSelecionado) return;
    setOcupado(true);
    try {
      const res = await fetch('/api/loja/comprar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomePersonagem: heroiSelecionado.nome,
          nomeItem,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        tratarErroResposta(data);
        return;
      }
      setEstado(data.estado);
      somRPG.compra(somAtivo);
      setFeedback({
        tipo: 'sucesso',
        titulo: 'Compra concluída',
        detalhe: data.mensagem,
      });
    } finally {
      setOcupado(false);
    }
  };

  const handleUsarItemForaCombate = async (nomeItem: string) => {
    if (!heroiSelecionado) return;
    setOcupado(true);
    try {
      const res = await fetch(
        `/api/personagens/${encodeURIComponent(heroiSelecionado.nome)}/usar-item`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nomeItem }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        tratarErroResposta(data);
        return;
      }
      setEstado(data.estado);
      somRPG.pocao(somAtivo);
      setFeedback({
        tipo: 'sucesso',
        titulo: 'Item utilizado',
        detalhe: data.mensagem,
      });
    } finally {
      setOcupado(false);
    }
  };

  const handleTestarExcecao = async (
    cenario: 'item_inexistente' | 'nome_duplicado_classe',
  ) => {
    if (!heroiSelecionado) return;
    if (cenario === 'item_inexistente') {
      await handleUsarItemForaCombate('Espada Lendária');
      return;
    }
    const outraClasse =
      heroiSelecionado.classe === 'Guerreiro' ? 'Mago' : 'Guerreiro';
    await handleCriarPersonagem(heroiSelecionado.nome, outraClasse, 10);
  };

  const handleExecutarPoc = async () => {
    setOcupado(true);
    try {
      const res = await fetch('/api/poc/executar', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        tratarErroResposta(data);
        return;
      }
      setEstado(data.estado);
      setPocLogs(data.logs);
      setHeroiNome('Arthas');
      setCombatLog([]);
      somRPG.vitoria(somAtivo);
      setFeedback({
        tipo: 'sucesso',
        titulo: 'PoC executada e rpg.db recriado',
        detalhe:
          'Arthas (Guerreiro Nv 2) e Legolas (Arqueiro Nv 1) foram persistidos no SQLite.',
      });
      setAba('banco');
    } finally {
      setOcupado(false);
    }
  };

  const handleExecutarTestes = async () => {
    setOcupado(true);
    try {
      const res = await fetch('/api/testes/executar', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        tratarErroResposta(data);
        return;
      }
      setResultadosTestes(data.resultados);
      somRPG.vitoria(somAtivo);
      setFeedback({
        tipo: 'sucesso',
        titulo: 'Suíte de testes concluída',
        detalhe: `${data.aprovados} de ${data.total} testes passaram em banco SQLite :memory:.`,
      });
    } finally {
      setOcupado(false);
    }
  };

  const navItems: { id: Aba; label: string }[] = [
    { id: 'arena', label: 'Arena de Combate' },
    { id: 'loja', label: 'Loja e Inventário' },
    { id: 'banco', label: 'Banco SQLite' },
    { id: 'testes', label: 'Testes e POO' },
  ];

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      {/* Barra Superior: Contrato estrito de 3 zonas */}
      <header className="border-b border-slate-800/80 bg-[#0B1120]/95 sticky top-0 z-30 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setAba('arena');
            }}
            className="font-display text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
          >
            Sistema de RPG
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navItems.map((item) => {
              const ativo = aba === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAba(item.id)}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                    ativo
                      ? 'text-amber-400 border-amber-400'
                      : 'text-slate-400 border-transparent hover:text-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              disabled={ocupado}
              onClick={handleExecutarPoc}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              Executar PoC
            </button>
          </div>
        </div>

        {/* Navegação mobile compacta */}
        <div className="md:hidden border-t border-slate-800/70 px-4 py-2 flex items-center gap-2 overflow-x-auto">
          {navItems.map((item) => {
            const ativo = aba === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setAba(item.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 ${
                  ativo
                    ? 'bg-amber-500/15 text-amber-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-6 py-8 space-y-6 flex-1">
        {/* Cabeçalho de Contexto da Área de Trabalho */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="space-y-1.5 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 text-balance">
              Arquitetura Orientada a Objetos e Persistência em SQLite
            </h1>
            <p className="text-sm text-slate-400">
              Camada de domínio com abstração, encapsulamento, herança e polimorfismo persistida em esquema relacional 3FN.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSomAtivo((v) => !v)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 transition-colors whitespace-nowrap shrink-0"
          >
            {somAtivo ? (
              <>
                <Volume2 className="w-4 h-4 text-amber-400" />
                Efeitos Sonoros Ativos
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-500" />
                Som Desativado
              </>
            )}
          </button>
        </div>

        {/* Notificação de Evento / Exceção de Domínio */}
        {feedback && (
          <div
            role="status"
            className={`rounded-xl border px-5 py-3.5 flex items-start justify-between gap-4 ${
              feedback.tipo === 'erro'
                ? 'bg-rose-950/35 border-rose-500/40 text-rose-100'
                : feedback.tipo === 'sucesso'
                  ? 'bg-emerald-950/30 border-emerald-500/35 text-emerald-100'
                  : 'bg-slate-900 border-slate-700 text-slate-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {feedback.tipo === 'erro' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              ) : feedback.tipo === 'sucesso' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
              )}
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">{feedback.titulo}</p>
                <p className="text-xs opacity-90">{feedback.detalhe}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              aria-label="Fechar aviso"
              className="p-1 rounded hover:bg-white/10 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Conteúdo da Aba Selecionada */}
        {carregando || !estado ? (
          <div className="rounded-xl bg-[#11192B] border border-slate-800/80 p-12 text-center text-sm text-slate-400">
            Carregando estado do banco SQLite...
          </div>
        ) : aba === 'arena' ? (
          <ArenaView
            personagens={estado.personagens}
            heroiSelecionado={heroiSelecionado}
            onSelecionarHeroi={setHeroiNome}
            bestiario={estado.bestiario}
            monstroAtivo={monstroAtivo}
            onSelecionarMonstro={handleSelecionarMonstro}
            onCriarPersonagem={handleCriarPersonagem}
            onExcluirPersonagem={handleExcluirPersonagem}
            onReviverHeroi={handleReviverHeroi}
            onTurnoCombate={handleTurnoCombate}
            onCombateAutomatico={handleCombateAutomatico}
            onUsarItemForaCombate={handleUsarItemForaCombate}
            combatLog={combatLog}
            animacaoHit={animacaoHit}
            ocupado={ocupado}
          />
        ) : aba === 'loja' ? (
          <ShopInventoryView
            personagens={estado.personagens}
            heroiSelecionado={heroiSelecionado}
            onSelecionarHeroi={setHeroiNome}
            catalogo={estado.catalogo}
            onComprarItem={handleComprarItem}
            onUsarItem={handleUsarItemForaCombate}
            onTestarExcecao={handleTestarExcecao}
            ocupado={ocupado}
          />
        ) : aba === 'banco' ? (
          <DatabaseView
            banco={estado.banco}
            pocLogs={pocLogs}
            onRecarregarBanco={carregarEstado}
            onExecutarPoc={handleExecutarPoc}
            ocupado={ocupado}
          />
        ) : (
          <ArchitectureTestsView
            resultadosTestes={resultadosTestes}
            onExecutarTestes={handleExecutarTestes}
            ocupado={ocupado}
          />
        )}
      </main>
    </div>
  );
}
