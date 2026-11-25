import React from 'react';
import { Flame, Shield, Sparkles, Sword, Target, Skull } from 'lucide-react';

interface ClassEmblemProps {
  tipo: string;
  morto?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ClassEmblem: React.FC<ClassEmblemProps> = ({
  tipo,
  morto = false,
  size = 'md',
}) => {
  const dims =
    size === 'lg'
      ? 'w-16 h-16'
      : size === 'sm'
        ? 'w-9 h-9'
        : 'w-12 h-12';
  const iconDims =
    size === 'lg'
      ? 'w-7 h-7'
      : size === 'sm'
        ? 'w-4 h-4'
        : 'w-5 h-5';

  if (morto) {
    return (
      <div
        className={`${dims} rounded-xl bg-slate-900 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0`}
      >
        <Skull className={iconDims} />
      </div>
    );
  }

  if (tipo === 'Guerreiro') {
    return (
      <div
        className={`${dims} rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0`}
      >
        <Shield className={iconDims} />
      </div>
    );
  }

  if (tipo === 'Mago') {
    return (
      <div
        className={`${dims} rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0`}
      >
        <Sparkles className={iconDims} />
      </div>
    );
  }

  if (tipo === 'Arqueiro') {
    return (
      <div
        className={`${dims} rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0`}
      >
        <Target className={iconDims} />
      </div>
    );
  }

  if (tipo.includes('Dragão')) {
    return (
      <div
        className={`${dims} rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0`}
      >
        <Flame className={iconDims} />
      </div>
    );
  }

  return (
    <div
      className={`${dims} rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-300 shrink-0`}
    >
      <Sword className={iconDims} />
    </div>
  );
};
