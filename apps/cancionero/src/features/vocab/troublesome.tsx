// Liste GLOBALE des « mots à travailler » : les mots sur lesquels l'utilisateur
// bute (touchés en karaoké, ou ratés dans le texte à trous). Persistée localement.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { cleanWord } from '@/features/translate';

const KEY = '@cancionero/trouble-words';

export type TroubleWord = {
  /** Mot espagnol nettoyé (clé unique, en minuscules). */
  es: string;
  /** Traduction française, remplie à la demande. */
  fr?: string;
  /** Titre de la chanson d'origine, pour le contexte. */
  songTitle?: string;
  addedAt: number;
};

const norm = (w: string) => cleanWord(w).toLowerCase();

type Ctx = {
  words: TroubleWord[];
  has: (word: string) => boolean;
  /** Ajoute un mot au vocabulaire (idempotent). Renvoie true si nouvellement ajouté. */
  add: (word: string, songTitle?: string) => boolean;
  remove: (word: string) => void;
  setTranslation: (word: string, fr: string) => void;
};

const TroubleContext = createContext<Ctx | null>(null);

export function TroublesomeProvider({ children }: { children: React.ReactNode }) {
  const [words, setWords] = useState<TroubleWord[]>([]);
  // Copie toujours à jour de la liste : les fonctions ci-dessous sont souvent
  // appelées plus tard (traduction qui arrive, « Annuler » d'un message) avec
  // une liste capturée à un rendu précédent. Partir de la dernière évite
  // qu'une traduction en retard efface le mot ajouté entre-temps.
  const latest = useRef<TroubleWord[]>([]);

  const save = useCallback((update: (prev: TroubleWord[]) => TroubleWord[]) => {
    const next = update(latest.current);
    latest.current = next;
    setWords(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        latest.current = JSON.parse(raw);
        setWords(latest.current);
      })
      .catch(() => {});
  }, []);

  const has = useCallback((word: string) => words.some((w) => w.es === norm(word)), [words]);

  // Idempotent : re-ajouter un mot déjà présent ne fait rien (immunise contre le
  // double-déclenchement tactile qui, avec un toggle, ajoutait puis retirait).
  const add = useCallback(
    (word: string, songTitle?: string) => {
      const es = norm(word);
      if (!es || latest.current.some((w) => w.es === es)) return false;
      save((prev) => [{ es, songTitle, addedAt: Date.now() }, ...prev]);
      return true;
    },
    [save],
  );

  const remove = useCallback(
    (word: string) => {
      const es = norm(word);
      save((prev) => prev.filter((w) => w.es !== es));
    },
    [save],
  );

  const setTranslation = useCallback(
    (word: string, fr: string) => {
      const es = norm(word);
      save((prev) => prev.map((w) => (w.es === es ? { ...w, fr } : w)));
    },
    [save],
  );

  const value = useMemo(
    () => ({ words, has, add, remove, setTranslation }),
    [words, has, add, remove, setTranslation],
  );

  return <TroubleContext.Provider value={value}>{children}</TroubleContext.Provider>;
}

export function useTroublesome(): Ctx {
  const ctx = useContext(TroubleContext);
  if (!ctx) throw new Error('useTroublesome doit être dans <TroublesomeProvider>');
  return ctx;
}
