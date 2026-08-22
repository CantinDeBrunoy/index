using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Security.Cryptography;
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

            // 7bis. Le coffre portable (MITHRIL3, sans DPAPI).
            TesterCoffrePortable();

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

        // --- Forge de fichiers coffre au format documenté, SANS passer par Coffre.cs :
        // c'est ce qui permet de prouver la lecture d'un fichier venu d'ailleurs. ---

        static byte[] SerialiserUneEntree(string libelle, string identifiant, string mdp)
        {
            using (var flux = new MemoryStream())
            using (var ecrivain = new BinaryWriter(flux, Encoding.UTF8))
            {
                ecrivain.Write(1);
                ecrivain.Write(libelle);
                ecrivain.Write(identifiant);
                ecrivain.Write(DateTime.Now.Ticks);
                byte[] octets = Encoding.UTF8.GetBytes(mdp);
                ecrivain.Write(octets.Length);
                ecrivain.Write(octets);
                ecrivain.Write(0); // pas d'icone (format v2)
                ecrivain.Flush();
                return flux.ToArray();
            }
        }

        static byte[] ConstruireBlocMaitre(string magie, string maitre, int iterations, byte[] charge)
        {
            var sel = new byte[16];
            var iv = new byte[16];
            using (var rng = new RNGCryptoServiceProvider()) { rng.GetBytes(sel); rng.GetBytes(iv); }
            byte[] derive;
            using (var pbkdf2 = new Rfc2898DeriveBytes(maitre, sel, iterations))
                derive = pbkdf2.GetBytes(64);
            var cleAes = new byte[32];
            Array.Copy(derive, cleAes, 32);
            byte[] chiffre;
            using (var aes = new AesCryptoServiceProvider())
            {
                aes.Key = cleAes;
                aes.IV = iv;
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;
                using (var transformation = aes.CreateEncryptor())
                    chiffre = transformation.TransformFinalBlock(charge, 0, charge.Length);
            }
            var bloc = new byte[77 + chiffre.Length];
            Array.Copy(Encoding.ASCII.GetBytes(magie), bloc, 8);
            bloc[8] = 1;
            Array.Copy(sel, 0, bloc, 9, 16);
            Array.Copy(BitConverter.GetBytes(iterations), 0, bloc, 25, 4);
            Array.Copy(iv, 0, bloc, 29, 16);
            Array.Copy(chiffre, 0, bloc, 77, chiffre.Length);
            var cleHmac = new byte[32];
            Array.Copy(derive, 32, cleHmac, 0, 32);
            using (var hmac = new HMACSHA256(cleHmac))
            {
                hmac.TransformBlock(bloc, 0, 45, null, 0);
                hmac.TransformFinalBlock(bloc, 77, chiffre.Length);
                Array.Copy(hmac.Hash, 0, bloc, 45, 32);
            }
            return bloc;
        }

        static void TesterCoffrePortable()
        {
            string dossier = Path.Combine(Path.GetTempPath(), "MithrilBancP_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(dossier);
            try
            {
                string fichier = Path.Combine(dossier, "portable.mithril");

                // 7p-a. Sans maitre, rien ne s'ecrit : c'est la seule protection du fichier.
                var sansMaitre = Coffre.PortableSur(fichier);
                sansMaitre.Ouvrir(); // inexistant : vide, deverrouille, portable
                bool refuse = false;
                try { sansMaitre.Ajouter("X", "", "mdp"); } // Ajouter -> Sauver -> refus
                catch (CoffreException) { refuse = true; }
                Verifier(refuse && !File.Exists(fichier), "portable : refus d'ecrire sans maitre");

                // 7p-b. Aller-retour complet ; le fichier brut commence par la magie MITHRIL3.
                sansMaitre.DefinirMaitre("phrase de passe portable");
                byte[] brut = File.ReadAllBytes(fichier);
                Verifier(brut.Length > 77 && Encoding.ASCII.GetString(brut, 0, 8) == "MITHRIL3",
                    "portable : fichier ecrit nu avec magie MITHRIL3");
                var relecture = Coffre.PortableSur(fichier);
                relecture.Ouvrir();
                Verifier(relecture.Portable && relecture.MaitreActif && !relecture.Deverrouille,
                    "portable : verrouille a l'ouverture");
                relecture.Deverrouiller("phrase de passe portable");
                Verifier(relecture.Deverrouille && relecture.Entrees.Count == 1
                      && relecture.Entrees[0].RevelerMdp() == "mdp",
                    "portable : aller-retour avec le bon maitre");

                // 7p-c. Plancher d'iterations renforce (PBKDF2 est la seule barriere hors ligne).
                Verifier(BitConverter.ToInt32(brut, 25) >= Coffre.IterationsPortableDefaut,
                    "portable : au moins 1 300 000 iterations PBKDF2");

                // 7p-d. Mauvais maitre rejete par le HMAC, avant tout dechiffrement.
                var mauvais = Coffre.PortableSur(fichier);
                mauvais.Ouvrir();
                bool rejete = false;
                try { mauvais.Deverrouiller("pas le bon"); } catch (CoffreException) { rejete = true; }
                Verifier(rejete && !mauvais.Deverrouille, "portable : mauvais maitre rejete (HMAC)");

                // 7p-e. Le maitre d'un portable est irrevocable.
                bool retraitRefuse = false;
                try { relecture.RetirerMaitre(); } catch (CoffreException) { retraitRefuse = true; }
                Verifier(retraitRefuse && relecture.MaitreActif, "portable : retrait du maitre refuse");

                // 7p-f. LE COEUR : un fichier forge ici meme, sans jamais toucher DPAPI, s'ouvre
                // et se dechiffre avec le maitre seul — c'est ce qui simule une autre machine
                // (aucune cle liee a la session Windows n'intervient dans la lecture).
                string fichierForge = Path.Combine(dossier, "autre-machine.mithril");
                byte[] charge = SerialiserUneEntree("Ailleurs", "didier", "secret-d-ailleurs");
                File.WriteAllBytes(fichierForge, ConstruireBlocMaitre("MITHRIL3", "maitre nomade", 12000, charge));
                var nomade = Coffre.PortableSur(fichierForge);
                nomade.Ouvrir();
                nomade.Deverrouiller("maitre nomade");
                Verifier(nomade.Deverrouille && nomade.Entrees.Count == 1
                      && nomade.Entrees[0].RevelerMdp() == "secret-d-ailleurs",
                    "portable : fichier forge hors DPAPI lisible (simule une autre machine)");

                // 7p-g. Alteration detectee, dans le chiffre comme dans l'en-tete.
                byte[] casse = File.ReadAllBytes(fichierForge);
                casse[casse.Length - 1] ^= 0xFF; // dernier octet du chiffre
                File.WriteAllBytes(fichierForge, casse);
                var altere1 = Coffre.PortableSur(fichierForge);
                altere1.Ouvrir();
                bool detecte1 = false;
                try { altere1.Deverrouiller("maitre nomade"); } catch (CoffreException) { detecte1 = true; }
                casse[casse.Length - 1] ^= 0xFF; // restaure le chiffre
                casse[9] ^= 0xFF;                // premier octet du sel : l'en-tete est couvert aussi
                File.WriteAllBytes(fichierForge, casse);
                var altere2 = Coffre.PortableSur(fichierForge);
                altere2.Ouvrir();
                bool detecte2 = false;
                try { altere2.Deverrouiller("maitre nomade"); } catch (CoffreException) { detecte2 = true; }
                Verifier(detecte1 && detecte2, "portable : alteration du chiffre ou de l'en-tete detectee");

                // 7p-h. Retrocompatibilite : un DPAPI(MITHRIL2) forge par le test reste lisible
                // exactement comme avant l'arrivee du format portable.
                byte[] chargeAncien = SerialiserUneEntree("Ancien", "", "mdp-ancien");
                byte[] blocAncien = ConstruireBlocMaitre("MITHRIL2", "maitre ancien", 12000, chargeAncien);
                File.WriteAllBytes(Path.Combine(dossier, "coffre.mithril"), ProtectedData.Protect(
                    blocAncien, Encoding.ASCII.GetBytes("Mithril.Coffre.v1"), DataProtectionScope.CurrentUser));
                var ancien = new Coffre(dossier);
                ancien.Ouvrir();
                ancien.Deverrouiller("maitre ancien");
                Verifier(!ancien.Portable && ancien.Deverrouille
                      && ancien.Entrees[0].RevelerMdp() == "mdp-ancien",
                    "portable : un coffre DPAPI existant reste lisible a l'identique");

                // 7p-i. La copie vers un portable exige un maitre et laisse l'origine intacte.
                var origine = new Coffre(Path.Combine(dossier, "origine"));
                origine.Ouvrir();
                origine.Ajouter("Site C", "didi", "mdp-c");
                string fichierOrigine = Path.Combine(dossier, "origine", "coffre.mithril");
                byte[] avantCopie = File.ReadAllBytes(fichierOrigine);
                string fichierCopie = Path.Combine(dossier, "copie.mithril");
                bool copieRefusee = false;
                try { origine.CopierVersPortable(fichierCopie, ""); }
                catch (CoffreException) { copieRefusee = true; }
                Verifier(copieRefusee && !File.Exists(fichierCopie), "portable : creation refusee sans maitre");
                var copiePortable = origine.CopierVersPortable(fichierCopie, "maitre de la copie");
                byte[] apresCopie = File.ReadAllBytes(fichierOrigine);
                bool intact = avantCopie.Length == apresCopie.Length;
                for (int i = 0; intact && i < avantCopie.Length; i++)
                    if (avantCopie[i] != apresCopie[i]) intact = false;
                var relectureCopie = Coffre.PortableSur(fichierCopie);
                relectureCopie.Ouvrir();
                relectureCopie.Deverrouiller("maitre de la copie");
                Verifier(intact && copiePortable.Portable && relectureCopie.Entrees.Count == 1
                      && relectureCopie.Entrees[0].RevelerMdp() == "mdp-c",
                    "portable : copie complete, coffre d'origine intact octet pour octet");
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
