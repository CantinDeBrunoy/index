import { useEffect, useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';

import { InkCanvas } from '@/components/InkCanvas';
import type { InkCanvasHandle } from '@/components/InkCanvas';
import { paintWords } from '@/components/inkWords';
import { readableTextOn } from '@/lib/emotions';
import { REVEAL_MS, revealFrame, revealPlan } from '@/lib/ink';
import type { RevealPlan, Size } from '@/lib/ink';

type Run = { plan: RevealPlan; frame: Size };

/**
 * La journée du binôme arrive **sous son encre** : une carte couverte de sa
 * couleur, et une invitation — « Découvre la journée de Léa en couleur ».
 * Au toucher, une goutte d'eau tombe là où le doigt s'est posé, fait ses
 * ronds, et l'eau claire repousse la couleur jusqu'à découvrir ses photos.
 * Sa couleur ne disparaît pas pour autant : le bandeau de sa journée, qui la
 * porte, était sous la nappe et y reste.
 *
 * C'est la même eau que celle qui efface l'encre de validation, en miroir :
 * sa propre journée, on la pose ; celle de l'autre, on la découvre. Et c'est
 * **au toucher**, jamais d'office — comme la réaction en grand, elle prend sa
 * place quand on a décidé de la regarder.
 *
 * Une fois par journée du binôme : le parent dit si elle a déjà été
 * découverte (`initiallyOpen`) et retient la découverte (`onReveal`). La
 * carte n'est pas un écran : pendant le trajet, le contenu est déjà là,
 * dessous, et le dévoilement ne bloque rien d'autre que lui.
 */
export function InkReveal({
  color,
  label,
  initiallyOpen,
  onReveal,
  children,
}: {
  /** La couleur du binôme : c'est elle qui couvre la carte. */
  color: string;
  /** L'invitation, qui est aussi le nom du bouton. */
  label: string;
  initiallyOpen: boolean;
  onReveal: () => void;
  children: ReactNode;
}) {
  const [state, setState] = useState<'covered' | 'fading' | 'revealing' | 'open'>(initiallyOpen ? 'open' : 'covered');
  const [run, setRun] = useState<Run | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<InkCanvasHandle>(null);
  const words = useRef<HTMLSpanElement>(null);

  const reveal = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    // Retenue tout de suite, pas à la fin : quitter le panneau pendant le
    // trajet ne doit pas faire rejouer la cérémonie au retour.
    onReveal();

    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (calm) {
      setState('fading');
      return;
    }

    // La goutte tombe là où le doigt s'est posé. Au clavier (`detail === 0`),
    // il n'y a pas de doigt : elle tombe au centre.
    const frame = { width: rect.width, height: rect.height };
    const impact =
      event.detail === 0
        ? { x: frame.width / 2, y: frame.height / 2 }
        : { x: event.clientX - rect.left, y: event.clientY - rect.top };
    setRun({ plan: revealPlan(frame, impact, Math.random), frame });
    setState('revealing');
  };

  useEffect(() => {
    if (!run) return;
    let raf = 0;
    let start: number | null = null;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      setState('open');
    };

    const paint = (now: number) => {
      start ??= now;
      const t = (now - start) / REVEAL_MS;
      const image = revealFrame(run.plan, t);
      canvas.current?.paint(image);
      paintWords(words.current, image.message);
      if (t >= 1) finish();
      else raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);
    // Même filet que l'encre de validation : `requestAnimationFrame` dort
    // quand l'onglet passe en arrière-plan.
    const timer = window.setTimeout(finish, REVEAL_MS + 200);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [run]);

  const ink = readableTextOn(color);

  return (
    <div ref={box} className="reveal">
      {/* Tant que la carte est couverte, ce qu'il y a dessous n'existe pour
          personne : ni au doigt, ni au clavier, ni pour un lecteur d'écran. */}
      <div inert={state === 'covered' || state === 'fading'}>{children}</div>
      {state === 'covered' || state === 'fading' ? (
        <button
          type="button"
          className={`reveal__cover${state === 'fading' ? ' reveal__cover--fading' : ''}`}
          style={{ background: color, color: ink }}
          onClick={reveal}
          onAnimationEnd={() => setState('open')}
          disabled={state === 'fading'}
        >
          <span className="reveal__words">{label}</span>
        </button>
      ) : null}
      {state === 'revealing' && run ? (
        <div className="reveal__cover reveal__cover--ink" aria-hidden>
          {/* `covered` : la nappe est là dès le premier rendu, sans attendre
              la première frame — sinon les photos apparaîtraient un instant
              entre le bouton qui s'en va et l'encre qui arrive. */}
          <InkCanvas ref={canvas} id="reveal" color={color} frame={run.frame} covered className="reveal__ink" />
          <span ref={words} className="reveal__words" style={{ color: ink }}>
            {label}
          </span>
        </div>
      ) : null}
    </div>
  );
}
