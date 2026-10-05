// Liste GLOBALE des « mots à travailler » : les mots sur lesquels l'utilisateur
// bute (touchés en karaoké, ou ratés dans le texte à trous). Persistée localement.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

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
  /** Ajoute ou retire un mot ; renvoie true s'il est désormais marqué. */
  /** Ajoute un mot au vocabulaire (idempotent). Renvoie true si nouvellement ajouté. */
  add: (word: string, songTitle?: string) => boolean;
  remove: (word: string) => void;
  setTranslation: (word: string, fr: string) => void;
};

const TroubleContext = createContext<Ctx | null>(null);

export function TroublesomeProvider({ children }: { children: React.ReactNode }) {
  const [words, setWords] = useState<TroubleWord[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setWords(JSON.parse(raw));
      })
      .catch(() => {});
  }, []);

  const save = useCallback((next: TroubleWord[]) => {
    setWords(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const has = useCallback((word: string) => words.some((w) => w.es === norm(word)), [words]);

  // Idempotent : re-ajouter un mot déjà présent ne fait rien (immunise contre le
  // double-déclenchement tactile qui, avec un toggle, ajoutait puis retirait).
  const add = useCallback(
    (word: string, songTitle?: string) => {
      const es = norm(word);
      if (!es) return false;
      if (words.some((w) => w.es === es)) return false;
      save([{ es, songTitle, addedAt: Date.now() }, ...words]);
      return true;
    },
    [words, save],
  );

  const remove = useCallback(
    (word: string) => save(words.filter((w) => w.es !== norm(word))),
    [words, save],
  );

  const setTranslation = useCallback(
    (word: string, fr: string) => {
      const es = norm(word);
      save(words.map((w) => (w.es === es ? { ...w, fr } : w)));
    },
    [words, save],
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
