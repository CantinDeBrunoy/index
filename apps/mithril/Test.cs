using System;
using System.Collections.Generic;
using MdpGen;

namespace Banc
{
    /// <summary>Banc de test du tirage (non embarqué dans l'exécutable final).</summary>
    static class Programme
    {
        static int echecs;

        static void Verifier(bool condition, string libelle)
        {
            Console.WriteLine((condition ? "OK   " : "ECHEC") + "  " + libelle);
            if (!condition) echecs++;
        }

        static void Main()
        {
            // 1. Uniformité du tirage : chi2 grossier sur 26 valeurs, 260 000 tirages.
            int[] compteur = new int[26];
            const int n = 260000;
            for (int i = 0; i < n; i++) compteur[Alea.Suivant(26)]++;
            double attendu = n / 26.0, chi2 = 0;
            int min = int.MaxValue, max = 0;
            foreach (int c in compteur)
            {
                chi2 += (c - attendu) * (c - attendu) / attendu;
                if (c < min) min = c;
                if (c > max) max = c;
            }
            Console.WriteLine(string.Format("     chi2 = {0:0.0} (seuil 1% pour 25 ddl = 44,3), min={1} max={2}", chi2, min, max));
            Verifier(chi2 < 44.3, "distribution uniforme sur 26 symboles");

            // 2. Chaque classe cochée est bien représentée, longueur exacte.
            string[] jeux = { Generateur.Minuscules, Generateur.Majuscules, Generateur.Chiffres, Generateur.Symboles };
            bool longueurOk = true, classesOk = true;
            for (int i = 0; i < 20000; i++)
            {
                string mdp = Generateur.Generer(jeux, 8);
                if (mdp.Length != 8) longueurOk = false;
                foreach (string jeu in jeux)
                {
                    bool trouve = false;
                    foreach (char c in mdp) if (jeu.IndexOf(c) >= 0) { trouve = true; break; }
                    if (!trouve) { classesOk = false; break; }
                }
            }
            Verifier(longueurOk, "longueur exacte demandée (20 000 tirages)");
            Verifier(classesOk, "au moins un caractère de chaque classe (20 000 tirages)");

            // 3. Les caractères imposés ne restent pas collés au début (le mélange agit).
            int[] positionChiffre = new int[8];
            for (int i = 0; i < 40000; i++)
            {
                string mdp = Generateur.Generer(new[] { Generateur.Minuscules, Generateur.Chiffres }, 8);
                for (int p = 0; p < 8; p++) if (char.IsDigit(mdp[p])) { positionChiffre[p]++; break; }
            }
            int pMin = int.MaxValue, pMax = 0;
            foreach (int c in positionChiffre) { if (c < pMin) pMin = c; if (c > pMax) pMax = c; }
            Console.WriteLine(string.Format("     1er chiffre par position : min={0} max={1}", pMin, pMax));
            Verifier(pMin > 0, "le mélange disperse les caractères imposés");

            // 4. Pas de collision sur des mots de passe longs.
            var vus = new HashSet<string>();
            bool unique = true;
            for (int i = 0; i < 50000; i++) if (!vus.Add(Generateur.Generer(jeux, 32))) unique = false;
            Verifier(unique, "50 000 mots de passe de 32 caractères tous distincts");

            // 5. Filtrage des ambigus et calcul d'entropie.
            Verifier(Generateur.Filtrer(Generateur.Chiffres, true) == "34679", "exclusion des chiffres ambigus (0 1 2 5 8)");
            Verifier(Math.Abs(Generateur.Entropie(94, 32) - 209.75) < 0.5, "entropie 32 car. / alphabet 94 ~ 210 bits");

            // 6. Restriction aux symboles faciles a taper sur mobile.
            bool sousEnsemble = true;
            foreach (char c in Generateur.SymbolesMobiles)
                if (Generateur.Symboles.IndexOf(c) < 0) sousEnsemble = false;
            Verifier(sousEnsemble, "les symboles mobiles sont un sous-ensemble du jeu complet");

            const string Penibles = "#%*+<>[]^_{|}~";
            bool aucunPenible = true;
            foreach (char c in Generateur.SymbolesMobiles)
                if (Penibles.IndexOf(c) >= 0) aucunPenible = false;
            Verifier(aucunPenible, "aucun symbole de 2e page de clavier dans le jeu mobile");

            Verifier(Generateur.JeuSymboles(true) == Generateur.SymbolesMobiles
                  && Generateur.JeuSymboles(false) == Generateur.Symboles, "selection du jeu de symboles");

            // Un mot de passe genere sous contrainte mobile ne doit contenir aucun symbole penible.
            string[] jeuxMobiles = {
                Generateur.Minuscules, Generateur.Majuscules,
                Generateur.Chiffres, Generateur.JeuSymboles(true)
            };
            bool mobileOk = true;
            for (int i = 0; i < 20000; i++)
            {
                string mdp = Generateur.Generer(jeuxMobiles, 24);
                foreach (char c in mdp) if (Penibles.IndexOf(c) >= 0) { mobileOk = false; break; }
                if (!mobileOk) break;
            }
            Verifier(mobileOk, "20 000 mdp sous contrainte mobile, aucun caractere penible");

            // La contrainte reste combinable avec l'exclusion des ambigus.
            string mobileSansAmbigus = Generateur.Filtrer(Generateur.JeuSymboles(true), true);
            Verifier(mobileSansAmbigus.IndexOf('|') < 0 && mobileSansAmbigus.Length > 8,
                "jeu mobile + exclusion des ambigus reste exploitable");

            int poolMobile = 26 + 26 + 10 + Generateur.SymbolesMobiles.Length;
            Console.WriteLine(string.Format("     alphabet mobile = {0} symboles, pool = {1}, 32 car. = {2:0} bits",
                Generateur.SymbolesMobiles.Length, poolMobile, Generateur.Entropie(poolMobile, 32)));
            Verifier(Generateur.Entropie(poolMobile, 32) > 190, "entropie mobile a 32 car. > 190 bits");

            Console.WriteLine(echecs == 0 ? "\nTOUS LES TESTS PASSENT" : "\n" + echecs + " ECHEC(S)");
            Environment.Exit(echecs == 0 ? 0 : 1);
        }
    }
}
