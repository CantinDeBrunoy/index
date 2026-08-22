using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Text;
using Mithril;

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

            // 7. Le coffre : chiffrement, maître, altération, protection mémoire.
            TesterCoffre();

            // 8. Auto-type : primitives sûres (sans envoyer de vraies frappes).
            TesterAutoType();

            // 9. Réglages : logique pure (sans toucher au fichier de config réel).
            Verifier(Reglages.DecrireRaccourci(0x0002 | 0x0001, 0x4D) == "Ctrl+Alt+M",
                "reglages : description du raccourci Ctrl+Alt+M");
            var copie = Reglages.Actuels.Copie();
            copie.VerrouInactiviteMin = 99;
            Verifier(copie.VerrouInactiviteMin == 99 && Reglages.Actuels.VerrouInactiviteMin != 99,
                "reglages : la copie de travail est independante de l'original");

            // 10. Emblème : dessin et fabrication du .ico (icône de la fenêtre et du .exe).
            TesterEmbleme();

            Console.WriteLine(echecs == 0 ? "\nTOUS LES TESTS PASSENT" : "\n" + echecs + " ECHEC(S)");
            Environment.Exit(echecs == 0 ? 0 : 1);
        }

        static void TesterCoffre()
        {
            string dossier = Path.Combine(Path.GetTempPath(), "MithrilBanc_" + Guid.NewGuid().ToString("N"));
            try
            {
                // 7a. SecretMemoire : aller-retour et effacement du tampon d'origine.
                byte[] original = Encoding.UTF8.GetBytes("tres-secret");
                byte[] copieAttendue = (byte[])original.Clone();
                var secret = new SecretMemoire(original);
                bool efface = true;
                foreach (byte octet in original) if (octet != 0) efface = false;
                Verifier(efface, "coffre : le tampon d'origine est efface apres protection");
                byte[] revele = secret.Reveler();
                bool identique = revele.Length == copieAttendue.Length;
                for (int i = 0; identique && i < revele.Length; i++)
                    if (revele[i] != copieAttendue[i]) identique = false;
                Verifier(identique, "coffre : aller-retour CryptProtectMemory fidele");
                secret.Dispose();

                // 7b. Aller-retour sans maitre (DPAPI seul).
                var coffre = new Coffre(dossier);
                coffre.Ouvrir();
                coffre.Ajouter("Site A", "didier", "MotDePasse#1");
                coffre.Ajouter("Site B", "", "autre$mdp2");
                var relecture = new Coffre(dossier);
                relecture.Ouvrir();
                Verifier(relecture.Deverrouille && relecture.Entrees.Count == 2
                      && relecture.Entrees[0].Libelle == "Site A"
                      && relecture.Entrees[0].RevelerMdp() == "MotDePasse#1"
                      && relecture.Entrees[1].RevelerMdp() == "autre$mdp2",
                    "coffre : aller-retour DPAPI sans maitre");

                // 7c. Pose du maitre : verrouille a la relecture, mauvais maitre rejete.
                relecture.DefinirMaitre("grand-maitre-solide");
                var verrouille = new Coffre(dossier);
                verrouille.Ouvrir();
                Verifier(verrouille.MaitreActif && !verrouille.Deverrouille,
                    "coffre : maitre actif => verrouille a l'ouverture");
                bool rejete = false;
                try { verrouille.Deverrouiller("mauvais"); }
                catch (CoffreException) { rejete = true; }
                Verifier(rejete && !verrouille.Deverrouille, "coffre : mauvais maitre rejete (HMAC)");
                verrouille.Deverrouiller("grand-maitre-solide");
                Verifier(verrouille.Deverrouille && verrouille.Entrees.Count == 2
                      && verrouille.Entrees[0].RevelerMdp() == "MotDePasse#1",
                    "coffre : bon maitre => donnees restituees");

                // 7d. Verrouiller efface l'etat ; redeverrouillage apres rechargement.
                verrouille.Verrouiller();
                Verifier(!verrouille.Deverrouille && verrouille.Entrees.Count == 0,
                    "coffre : verrouillage vide l'etat en memoire");
                verrouille.Ouvrir();
                verrouille.Deverrouiller("grand-maitre-solide");
                Verifier(verrouille.Entrees.Count == 2, "coffre : redeverrouillage apres verrouillage");

                // 7e. Changement puis retrait du maitre.
                verrouille.DefinirMaitre("nouveau-maitre");
                var rechange = new Coffre(dossier);
                rechange.Ouvrir();
                bool ancienRejete = false;
                try { rechange.Deverrouiller("grand-maitre-solide"); }
                catch (CoffreException) { ancienRejete = true; }
                rechange.Deverrouiller("nouveau-maitre");
                Verifier(ancienRejete && rechange.Entrees.Count == 2, "coffre : changement de maitre");
                rechange.RetirerMaitre();
                var sansMaitre = new Coffre(dossier);
                sansMaitre.Ouvrir();
                Verifier(sansMaitre.Deverrouille && !sansMaitre.MaitreActif && sansMaitre.Entrees.Count == 2,
                    "coffre : retrait du maitre, donnees intactes");

                // 7i. Icône : aller-retour v2 (avant la suppression, 2 entrées disponibles).
                byte[] fauxPng = { 1, 2, 3, 4, 5, 6, 7, 8 };
                sansMaitre.DefinirIcone(sansMaitre.Entrees[0], fauxPng);
                var reIcone = new Coffre(dossier);
                reIcone.Ouvrir();
                byte[] relu = reIcone.Entrees[0].Icone;
                bool iconeOk = relu != null && relu.Length == fauxPng.Length;
                for (int k = 0; iconeOk && k < relu.Length; k++) if (relu[k] != fauxPng[k]) iconeOk = false;
                Verifier(iconeOk, "coffre : icone conservee (format v2)");
                Verifier(reIcone.Entrees.Count > 1 && reIcone.Entrees[1].Icone == null,
                    "coffre : entree sans icone reste sans icone");
                Verifier(AutoType.EstNavigateur(@"C:\x\chrome.exe")
                      && AutoType.EstNavigateur(@"D:\Program Files\Microsoft\msedge.EXE")
                      && !AutoType.EstNavigateur(@"C:\Windows\notepad.exe"),
                    "autotype : detection des navigateurs");

                // 7j. Appariement titre de fenêtre → entrée (auto-type contextuel).
                var m1 = sansMaitre.Correspondances("Connexion — Site A — Google Chrome");
                Verifier(m1.Count == 1 && m1[0].Libelle == "Site A",
                    "coffre : appariement par titre de fenetre");
                Verifier(sansMaitre.Correspondances("Fenetre sans rapport").Count == 0,
                    "coffre : aucun appariement hors sujet");

                // 7f. Suppression persistante.
                sansMaitre.Supprimer(sansMaitre.Entrees[0]);
                var apresSuppr = new Coffre(dossier);
                apresSuppr.Ouvrir();
                Verifier(apresSuppr.Entrees.Count == 1 && apresSuppr.Entrees[0].Libelle == "Site B",
                    "coffre : suppression persistee");

                // 7g. Fichier altere detecte (un octet retourne).
                string fichier = Path.Combine(dossier, "coffre.mithril");
                byte[] brut = File.ReadAllBytes(fichier);
                brut[brut.Length / 2] ^= 0xFF;
                File.WriteAllBytes(fichier, brut);
                bool altere = false;
                var casse = new Coffre(dossier);
                try { casse.Ouvrir(); }
                catch (CoffreException) { altere = true; }
                Verifier(altere, "coffre : fichier altere detecte a l'ouverture");

                // 7h. Export en clair.
                sansMaitre.Verrouiller();
                // (le coffre en memoire 'apresSuppr' est reste deverrouille et intact)
                string export = Path.Combine(dossier, "export.txt");
                apresSuppr.Exporter(export);
                Verifier(File.ReadAllText(export).Contains("autre$mdp2"), "coffre : export en clair complet");
            }
            finally
            {
                try { Directory.Delete(dossier, true); } catch { }
            }
        }

        static void TesterEmbleme()
        {
            // L'emblème n'existe que sous forme de code : on vérifie qu'il produit un
            // .ico structurellement valide (c'est lui que le build embarque dans le
            // .exe, une erreur ici ne se verrait qu'a l'oeil nu dans l'explorateur).
            int[] tailles = { 16, 32, 256 };
            byte[] ico = Embleme.Ico(tailles);
            Verifier(ico.Length > 6 && ico[0] == 0 && ico[1] == 0 &&    // reserve
                     ico[2] == 1 && ico[3] == 0 &&                      // type : icone
                     ico[4] == tailles.Length && ico[5] == 0,
                "embleme : en-tete du .ico conforme");

            bool entreesOk = true;
            for (int i = 0; i < tailles.Length; i++)
            {
                int e = 6 + 16 * i;
                int longueur = BitConverter.ToInt32(ico, e + 8);
                int decalage = BitConverter.ToInt32(ico, e + 12);
                if (ico[e] != (tailles[i] >= 256 ? 0 : tailles[i])) entreesOk = false;   // 0 = 256
                if (longueur <= 0 || decalage < 6 || decalage + longueur > ico.Length) entreesOk = false;
            }
            Verifier(entreesOk, "embleme : entrees du .ico coherentes avec le contenu");

            bool relectureOk;
            try
            {
                using (var icone = new Icon(Embleme.Icone(), new Size(16, 16)))
                    relectureOk = icone.Width == 16 && icone.Height == 16;
            }
            catch { relectureOk = false; }
            Verifier(relectureOk, "embleme : icone d'ecran relue a 16 px");

            // Le dessin s'allege quand la place manque ; il doit rester quelque chose.
            bool traitOk = true;
            foreach (int cote in new[] { 16, 32, 64 })
                using (Bitmap image = Embleme.Rendre(cote))
                {
                    int pixels = 0;
                    for (int y = 0; y < cote; y++)
                        for (int x = 0; x < cote; x++)
                        {
                            Color p = image.GetPixel(x, y);
                            if (p.A > 200 && p.B > 150) pixels++;
                        }
                    if (pixels < cote) traitOk = false;
                }
            Verifier(traitOk, "embleme : dessin visible a 16, 32 et 64 px");
        }

        static void TesterAutoType()
        {
            // On n'appelle PAS Taper() : cela enverrait de vraies frappes. On vérifie que les
            // primitives d'introspection répondent sans exception et de façon cohérente.
            bool sansPlantage = true;
            try
            {
                string titre = AutoType.TitreFenetreActive();
                if (titre == null) sansPlantage = false;
                AutoType.EchapPresse();
                AutoType.FenetreActive();
            }
            catch { sansPlantage = false; }
            Verifier(sansPlantage, "autotype : primitives d'introspection sans exception");
            Verifier(!AutoType.CibleProbablementElevee(IntPtr.Zero),
                "autotype : fenetre nulle n'est pas consideree elevee");
        }
    }
}
