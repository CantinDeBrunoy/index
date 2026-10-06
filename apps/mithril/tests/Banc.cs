using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Security;
using System.Net.Sockets;
using System.Security.Authentication;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Threading;
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
            // 1. Uniformité du tirage : chi2 grossier sur 26 valeurs, 260 000 tirages. Le seuil à
            // 1 % fait échouer un tirage parfaitement uniforme une fois sur cent : on accorde un
            // second tirage indépendant, ce qui ramène le faux positif à un sur dix mille sans
            // rien masquer — un générateur biaisé échoue les deux fois.
            const int n = 260000;
            double chi2 = 0;
            int min = int.MaxValue, max = 0;
            bool uniforme = false;
            for (int essai = 0; essai < 2 && !uniforme; essai++)
            {
                int[] compteur = new int[26];
                for (int i = 0; i < n; i++) compteur[Alea.Suivant(26)]++;
                double attendu = n / 26.0;
                chi2 = 0; min = int.MaxValue; max = 0;
                foreach (int c in compteur)
                {
                    chi2 += (c - attendu) * (c - attendu) / attendu;
                    if (c < min) min = c;
                    if (c > max) max = c;
                }
                Console.WriteLine(string.Format("     chi2 = {0:0.0} (seuil 1% pour 25 ddl = 44,3), min={1} max={2}", chi2, min, max));
                uniforme = chi2 < 44.3;
            }
            Verifier(uniforme, "distribution uniforme sur 26 symboles");

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

            // 11. Appairage : identifiant Syncthing derive du certificat, et encodeur QR.
            TesterAppairage();

            // 12. Synchronisation native (MSYN1) : socle sans reseau.
            TesterSynchroSocle();

            // 13. Synchronisation native : le moteur du PC en boucle locale, le banc joue le telephone.
            TesterSynchroBoucleLocale();

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
            // Les magies 1/2/3 derivent en SHA-1 (formats anterieurs), 4/5 en SHA-256.
            bool sha256 = magie == "MITHRIL4" || magie == "MITHRIL5";
            var sel = new byte[16];
            var iv = new byte[16];
            using (var rng = new RNGCryptoServiceProvider()) { rng.GetBytes(sel); rng.GetBytes(iv); }
            byte[] derive;
            using (var pbkdf2 = new Rfc2898DeriveBytes(maitre, sel, iterations, sha256 ? HashAlgorithmName.SHA256 : HashAlgorithmName.SHA1))
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
                Verifier(brut.Length > 77 && Encoding.ASCII.GetString(brut, 0, 8) == "MITHRIL5",
                    "portable : fichier ecrit nu avec magie MITHRIL5 (PBKDF2-SHA256)");
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
                    "portable : au moins 600 000 iterations PBKDF2-HMAC-SHA256");

                // 7p-d. Mauvais maitre rejete par le HMAC, avant tout dechiffrement.
                var mauvais = Coffre.PortableSur(fichier);
                mauvais.Ouvrir();
                bool rejete = false;
                try { mauvais.Deverrouiller("pas le bon"); } catch (CoffreException) { rejete = true; }
                Verifier(rejete && !mauvais.Deverrouille, "portable : mauvais maitre rejete (HMAC)");

                // 7p-e0. Le .stignore est pose a cote, identique partout ; celui de l'utilisateur
                // est respecte, celui de Mithril (meme ancien) est realigne.
                string regles = Path.Combine(dossier, ".stignore");
                Verifier(File.Exists(regles) && File.ReadAllText(regles) == Coffre.ReglesSynchro,
                    "portable : .stignore canonique pose a la sauvegarde");
                File.WriteAllText(regles, "// Fichiers de travail de Mithril\n*.tmp\n");
                Coffre.PoserReglesSynchro(dossier);
                bool realigne = File.ReadAllText(regles) == Coffre.ReglesSynchro;
                File.WriteAllText(regles, "*.log\n");
                Coffre.PoserReglesSynchro(dossier);
                Verifier(realigne && File.ReadAllText(regles) == "*.log\n",
                    "portable : .stignore de Mithril realigne, celui de l'utilisateur respecte");

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

                // 7q. Migration du PRF : le MITHRIL2 (SHA-1) vient d'etre reecrit en MITHRIL4
                // (SHA-256) au deverrouillage ; il se rouvre avec la meme phrase, entrees intactes.
                byte[] migre = ProtectedData.Unprotect(File.ReadAllBytes(Path.Combine(dossier, "coffre.mithril")),
                    Encoding.ASCII.GetBytes("Mithril.Coffre.v1"), DataProtectionScope.CurrentUser);
                var remigre = new Coffre(dossier);
                remigre.Ouvrir();
                remigre.Deverrouiller("maitre ancien");
                Verifier(Encoding.ASCII.GetString(migre, 0, 8) == "MITHRIL4" && remigre.DerivationSha256
                      && BitConverter.ToInt32(migre, 25) >= 600000
                      && remigre.Entrees.Count == 1 && remigre.Entrees[0].RevelerMdp() == "mdp-ancien",
                    "format : coffre SHA-1 migre en MITHRIL4 (SHA-256, >= 600 000 it.) au deverrouillage, entrees intactes");

                // 7q-b. Meme chose pour un portable MITHRIL3 forge (SHA-1) : lu, migre en MITHRIL5,
                // puis mauvais maitre et alteration rejetes sur le nouveau format.
                string fichierV3 = Path.Combine(dossier, "ancien-portable.mithril");
                File.WriteAllBytes(fichierV3, ConstruireBlocMaitre("MITHRIL3", "phrase v3", 12000,
                    SerialiserUneEntree("V3", "moi", "mdp-v3")));
                var v3 = Coffre.PortableSur(fichierV3);
                v3.Ouvrir();
                bool lisaitSha1 = !v3.DerivationSha256;
                v3.Deverrouiller("phrase v3");
                byte[] brutV5 = File.ReadAllBytes(fichierV3);
                var v5 = Coffre.PortableSur(fichierV3);
                v5.Ouvrir();
                v5.Deverrouiller("phrase v3");
                Verifier(lisaitSha1 && Encoding.ASCII.GetString(brutV5, 0, 8) == "MITHRIL5" && v5.DerivationSha256
                      && v5.Entrees[0].RevelerMdp() == "mdp-v3",
                    "format : portable SHA-1 migre en MITHRIL5, rouvert avec la meme phrase");
                var v5Mauvais = Coffre.PortableSur(fichierV3);
                v5Mauvais.Ouvrir();
                bool rejetV5 = false;
                try { v5Mauvais.Deverrouiller("pas la phrase"); } catch (CoffreException) { rejetV5 = true; }
                brutV5[brutV5.Length - 1] ^= 0x01;
                File.WriteAllBytes(fichierV3, brutV5);
                var v5Altere = Coffre.PortableSur(fichierV3);
                v5Altere.Ouvrir();
                bool altereV5 = false;
                try { v5Altere.Deverrouiller("phrase v3"); } catch (CoffreException) { altereV5 = true; }
                Verifier(rejetV5 && altereV5, "format : MITHRIL5 rejette mauvais maitre et alteration");

                // 7q-c. Un MITHRIL5 forge directement en SHA-256 (comme l'ecrirait Android) est lisible.
                string fichierV5 = Path.Combine(dossier, "forge-v5.mithril");
                File.WriteAllBytes(fichierV5, ConstruireBlocMaitre("MITHRIL5", "phrase v5", 600000,
                    SerialiserUneEntree("V5", "", "mdp-v5")));
                var forgeV5 = Coffre.PortableSur(fichierV5);
                forgeV5.Ouvrir();
                forgeV5.Deverrouiller("phrase v5");
                Verifier(forgeV5.DerivationSha256 && forgeV5.Entrees[0].RevelerMdp() == "mdp-v5",
                    "format : MITHRIL5 forge hors de Mithril (SHA-256) lisible");

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

        static void TesterAppairage()
        {
            // 11a. Identifiant Syncthing : SHA-256("abc") = ba7816bf 8f01cfea 414140de ..., dont
            // la base32 commence par XJ4BNP4PAHH6U ; 4 groupes de 13 + Luhn, 8 blocs de 7.
            string id = Syncthing.IdentifiantDepuisCertificat(Encoding.ASCII.GetBytes("abc"));
            Verifier(id.Length == 63 && id.StartsWith("XJ4BNP4-PAHH6U") && id.Split('-').Length == 8,
                "appairage : identifiant derive comme Syncthing (base32 de SHA-256, 8 blocs de 7)");
            string plat = id.Replace("-", "");
            bool luhnOk = true;
            for (int g = 0; g < 4; g++)
                if (Syncthing.Luhn32(plat.Substring(g * 14, 13)) != plat[g * 14 + 13]) luhnOk = false;
            Verifier(luhnOk, "appairage : caractere de controle Luhn mod 32 sur chaque groupe");

            // 11b. Le certificat PEM est bien extrait (base64 sur plusieurs lignes).
            string pem = "-----BEGIN CERTIFICATE-----\r\nYW\r\nJj\r\n-----END CERTIFICATE-----\r\n";
            Verifier(Encoding.ASCII.GetString(Syncthing.LireCertificatDer(pem)) == "abc",
                "appairage : lecture du certificat PEM");

            // 11c. QR : 63 caracteres -> version 5 (37 modules) ; viseurs, synchronisation,
            // module sombre, et information de format identique dans ses deux copies.
            bool[,] qr = Qr.Encoder("GQYEPSG-HJIKN4Y-ZU23BOM-IQSXYNK-NYZOBWD-2ZGA4DG-IWYLFSY-G4NU2QA");
            int n = qr.GetLength(0);
            Verifier(n == 37, "qr : version 5 (37 modules) pour un identifiant de 63 caracteres");
            bool viseurs = qr[0, 0] && qr[3, 3] && !qr[1, 1] && qr[0, n - 1] && qr[n - 1, 0] && !qr[7, 7]
                        && qr[n - 4, 3] && qr[3, n - 4];
            bool synchro = true;
            for (int i = 8; i < n - 8; i++) if (qr[6, i] != (i % 2 == 0) || qr[i, 6] != (i % 2 == 0)) synchro = false;
            Verifier(viseurs && synchro && qr[n - 8, 8], "qr : viseurs, synchronisation et module sombre en place");
            int format1 = 0, format2 = 0;
            for (int i = 0; i < 15; i++)
            {
                bool b1 = i < 6 ? qr[i, 8] : i == 6 ? qr[7, 8] : i == 7 ? qr[8, 8] : i == 8 ? qr[8, 7] : qr[8, 14 - i];
                bool b2 = i < 8 ? qr[8, n - 1 - i] : qr[n - 15 + i, 8];
                if (b1) format1 |= 1 << i;
                if (b2) format2 |= 1 << i;
            }
            int demasque = format1 ^ 0x5412, reste = demasque;
            for (int i = 14; i >= 10; i--) if (((reste >> i) & 1) != 0) reste ^= 0x537 << (i - 10);
            Verifier(format1 == format2 && reste == 0 && ((demasque >> 13) & 3) == 0,
                "qr : information de format coherente (niveau M, BCH valide, deux copies egales)");
            bool[,] court = Qr.Encoder("A");
            Verifier(court.GetLength(0) == 21, "qr : version 1 (21 modules) pour un texte court");
        }

        static void TesterSynchroSocle()
        {
            // 12a. Filtre d'adresses : privees acceptees, publiques refusees.
            bool privees = Reseau.EstAdressePrivee(System.Net.IPAddress.Parse("192.168.1.126"))
                && Reseau.EstAdressePrivee(System.Net.IPAddress.Parse("10.0.0.1"))
                && Reseau.EstAdressePrivee(System.Net.IPAddress.Parse("172.16.5.5"))
                && Reseau.EstAdressePrivee(System.Net.IPAddress.Parse("100.115.205.85"))
                && Reseau.EstAdressePrivee(System.Net.IPAddress.Parse("127.0.0.1"))
                && Reseau.EstAdressePrivee(System.Net.IPAddress.Parse("::ffff:192.168.0.9"))
                && Reseau.EstAdressePrivee(System.Net.IPAddress.Parse("fe80::1"));
            bool publiques = !Reseau.EstAdressePrivee(System.Net.IPAddress.Parse("8.8.8.8"))
                && !Reseau.EstAdressePrivee(System.Net.IPAddress.Parse("172.32.0.1"))
                && !Reseau.EstAdressePrivee(System.Net.IPAddress.Parse("100.128.0.1"))
                && !Reseau.EstAdressePrivee(System.Net.IPAddress.Parse("2001:db8::1"))
                && !Reseau.EstAdressePrivee(null);
            Verifier(privees && publiques, "synchro : filtre d'adresses privees (RFC 1918, CGNAT, lien-local, v6)");

            // 12b. Trames : aller-retour, et refus des trames malformees.
            using (var flux = new MemoryStream())
            {
                Trame.Ecrire(flux, "ETAT", new byte[] { 1, 2, 3 });
                flux.Position = 0;
                string type;
                byte[] charge = Trame.Lire(flux, out type);
                Verifier(type == "ETAT" && charge.Length == 3 && charge[2] == 3, "synchro : trame ecrite puis relue");
            }
            bool refusTaille = false, refusType = false;
            using (var flux = new MemoryStream(new byte[] { 0xFF, 0xFF, 0xFF, 0xFF, 65, 65, 65, 65 }))
            {
                string t;
                try { Trame.Lire(flux, out t); } catch (SynchroException) { refusTaille = true; }
            }
            using (var flux = new MemoryStream(new byte[] { 0, 0, 0, 4, 0x65, 0x74, 0x61, 0x74 }))
            {
                string t;
                try { Trame.Lire(flux, out t); } catch (SynchroException) { refusType = true; }
            }
            Verifier(refusTaille && refusType, "synchro : trame trop longue ou type invalide refuses");

            // 12c. Appairage complet en boucle locale : memes empreintes des deux cotes,
            // codes egaux, preuves mutuelles acceptees.
            byte[] fp = Reseau.Aleatoire(32), ft = Reseau.Aleatoire(32);
            int codePc, codeTel;
            bool preuves;
            using (var tel = new Appairage(fp, ft))
            using (var pc = new Appairage(fp, ft))
            {
                byte[] app2 = pc.PcRepondre(tel.TelEngagement());
                pc.PcRecevoir(tel.TelReveler(app2));
                codePc = pc.Code();
                codeTel = tel.Code();
                preuves = tel.TelVerifierCode(codePc) && pc.PcVerifierTel(tel.TelPreuve())
                       && tel.TelVerifierPc(pc.PcPreuve("DJ")) == "DJ";
            }
            Verifier(codePc == codeTel && codePc >= 0 && codePc < 1000000 && preuves,
                "synchro : appairage en boucle locale, code commun et preuves mutuelles");

            // 12d. Intrus actif : deux connexions, donc deux empreintes differentes de chaque
            // cote -> les codes divergent, le telephone refuse celui affiche par le PC.
            byte[] fIntrus = Reseau.Aleatoire(32);
            bool intrusDetecte;
            using (var tel = new Appairage(fIntrus, ft))   // le telephone voit l'intrus comme PC
            using (var intrusCotePc = new Appairage(fp, fIntrus)) // le PC voit l'intrus comme telephone
            using (var pc = new Appairage(fp, fIntrus))
            using (var intrusCoteTel = new Appairage(fIntrus, ft))
            {
                // l'intrus relaie fidelement les messages : meme ainsi, les codes divergent
                byte[] app2 = pc.PcRepondre(intrusCotePc.TelEngagement());
                pc.PcRecevoir(intrusCotePc.TelReveler(app2));
                byte[] app2b = intrusCoteTel.PcRepondre(tel.TelEngagement());
                intrusCoteTel.PcRecevoir(tel.TelReveler(app2b));
                intrusDetecte = !tel.TelVerifierCode(pc.Code());
            }
            Verifier(intrusDetecte, "synchro : intrus actif detecte (codes lies aux empreintes TLS)");

            // 12e. Engagement falsifie : le PC refuse APP3.
            bool engagementRefuse = false;
            using (var tel = new Appairage(fp, ft))
            using (var pc = new Appairage(fp, ft))
            {
                byte[] app2 = pc.PcRepondre(Reseau.Aleatoire(32));
                try { pc.PcRecevoir(tel.TelReveler(app2)); } catch (SynchroException) { engagementRefuse = true; }
            }
            bool mauvaisCode;
            using (var tel = new Appairage(fp, ft))
            using (var pc = new Appairage(fp, ft))
            {
                byte[] app2 = pc.PcRepondre(tel.TelEngagement());
                pc.PcRecevoir(tel.TelReveler(app2));
                mauvaisCode = !tel.TelVerifierCode((pc.Code() + 1) % 1000000) && !pc.PcVerifierTel(Reseau.Aleatoire(32));
            }
            Verifier(engagementRefuse && mauvaisCode, "synchro : engagement falsifie, code faux et preuve fausse refuses");

            // 12f. Identite : certificat ECDSA P-256 sur cle CNG, empreinte stable d'un
            // chargement a l'autre, cle privee disponible pour TLS.
            string dossier = Path.Combine(Path.GetTempPath(), "MithrilBancS_" + Guid.NewGuid().ToString("N"));
            string nomCle = "Mithril.Banc." + Guid.NewGuid().ToString("N");
            try
            {
                var id1 = Identite.Charger(dossier, nomCle);
                var id2 = Identite.Charger(dossier, nomCle);
                Verifier(id1.HasPrivateKey && id2.HasPrivateKey
                      && Coffre.ComparerConstant(Identite.Empreinte(id1), Identite.Empreinte(id2))
                      && id1.PublicKey.Oid.FriendlyName == "ECC",
                    "synchro : identite ECDSA P-256 persistante, empreinte stable");

                // 12g. Annuaire DPAPI : aller-retour, recherche par empreinte, retrait.
                var annuaire = new Annuaire(dossier);
                var tel = new AppareilAppaire { Nom = "Xiaomi", Empreinte = ft };
                tel.Adresses.Add("192.168.1.138");
                annuaire.Ajouter(tel);
                var relu = new Annuaire(dossier);
                bool trouve = relu.Trouver(ft) != null && relu.Trouver(ft).Nom == "Xiaomi"
                           && relu.Trouver(ft).Adresses[0] == "192.168.1.138" && relu.Trouver(fp) == null;
                relu.Retirer(ft);
                Verifier(trouve && new Annuaire(dossier).Appareils.Count == 0, "synchro : annuaire scelle DPAPI, aller-retour et retrait");
            }
            finally
            {
                try { System.Security.Cryptography.CngKey.Open(nomCle).Delete(); } catch (System.Security.Cryptography.CryptographicException) { }
                try { Directory.Delete(dossier, true); } catch (IOException) { }
            }
        }

        // --- Un « telephone » minimal pour eprouver le moteur du PC ---

        sealed class TelephoneBanc : IDisposable
        {
            public readonly X509Certificate2 Identite;
            public readonly byte[] Empreinte;
            public byte[] DernierEchange = new byte[32];
            public string Chemin;
            public Decision DerniereDecision;
            public TelephoneBanc(string dossier, string nomCle, string chemin)
            {
                Identite = Mithril.Identite.Charger(dossier, nomCle);
                Empreinte = Mithril.Identite.Empreinte(Identite);
                Chemin = chemin;
            }

            /// <summary>Ouvre une connexion TLS mutuelle vers le PC ; renvoie le flux et l'empreinte vue du PC.</summary>
            public SslStream Connecter(int port, out byte[] empreintePc, out TcpClient client)
            {
                client = new TcpClient("127.0.0.1", port);
                client.ReceiveTimeout = 10000;
                X509Certificate2 vu = null;
                var tls = new SslStream(client.GetStream(), false,
                    delegate(object s, X509Certificate c, X509Chain ch, SslPolicyErrors e) { vu = new X509Certificate2(c); return true; });
                tls.AuthenticateAsClient("mithril", new X509Certificate2Collection(Identite), (SslProtocols)3072, false);
                empreintePc = Mithril.Identite.Empreinte(vu);
                return tls;
            }

            /// <summary>Deroule l'appairage cote telephone ; codeVu recoit le code affiche par le PC.</summary>
            public string Appairer(int port, Func<int> codeAffiche, int? codeForce)
            {
                byte[] fpPc; TcpClient client;
                using (var tls = Connecter(port, out fpPc, out client))
                using (client)
                using (var app = new Appairage(fpPc, Empreinte))
                {
                    string type;
                    Trame.Ecrire(tls, "APP1", app.TelEngagement());
                    byte[] app2 = Trame.Lire(tls, out type);
                    Trame.Ecrire(tls, "APP3", app.TelReveler(app2));
                    int code = codeAffiche();
                    if (codeForce.HasValue) code = codeForce.Value;
                    if (!app.TelVerifierCode(code))
                    {
                        Trame.Ecrire(tls, "APP4", new byte[32]); // le vrai telephone s'arreterait ; on force le refus cote PC
                        return null;
                    }
                    Trame.Ecrire(tls, "APP4", app.TelPreuve());
                    byte[] app5 = Trame.Lire(tls, out type);
                    string nomPc = app.TelVerifierPc(app5);
                    Trame.Ecrire(tls, "NOMT", Trame.Chaine("Banc"));
                    return nomPc;
                }
            }

            /// <summary>Une session complete, selon la regle du protocole, cote telephone.</summary>
            public void Synchroniser(int port)
            {
                byte[] fpPc; TcpClient client;
                using (var tls = Connecter(port, out fpPc, out client))
                using (client)
                {
                    string type;
                    var moi = EtatCoffre.Lire(Chemin, DernierEchange);
                    Trame.Ecrire(tls, "ETAT", moi.Encoder());
                    var pc = EtatCoffre.Decoder(Trame.Lire(tls, out type));
                    DerniereDecision = Synchroniseur.Decider(moi, pc);
                    switch (DerniereDecision)
                    {
                        case Decision.Rien:
                            if (!moi.Absent) DernierEchange = moi.Empreinte;
                            break;
                        case Decision.JEnvoie:
                        case Decision.ConflitJEnvoie:
                            {
                                byte[] contenu = File.ReadAllBytes(Chemin);
                                var charge = new byte[8 + contenu.Length];
                                for (int i = 0; i < 8; i++) charge[i] = (byte)(moi.Mtime >> (56 - 8 * i));
                                Array.Copy(contenu, 0, charge, 8, contenu.Length);
                                Trame.Ecrire(tls, "FICH", charge);
                                byte[] recu = Trame.Lire(tls, out type);
                                if (type != "RECU") throw new Exception("RECU attendu");
                                DernierEchange = recu;
                                break;
                            }
                        case Decision.JeRecois:
                        case Decision.ConflitJeRecois:
                            {
                                byte[] charge = Trame.Lire(tls, out type);
                                if (type != "FICH") throw new Exception("FICH attendu");
                                byte[] contenu = new byte[charge.Length - 8];
                                Array.Copy(charge, 8, contenu, 0, contenu.Length);
                                if (DerniereDecision == Decision.ConflitJeRecois && File.Exists(Chemin))
                                    File.Copy(Chemin, Chemin + ".conflit", true);
                                File.WriteAllBytes(Chemin, contenu);
                                DernierEchange = Reseau.Sha256(contenu);
                                Trame.Ecrire(tls, "RECU", DernierEchange);
                                break;
                            }
                    }
                    Trame.Lire(tls, out type); if (type != "ADRS") throw new Exception("ADRS attendu");
                    Trame.Lire(tls, out type); if (type != "FINI") throw new Exception("FINI attendu");
                }
            }

            public void Dispose() { Identite.Dispose(); }
        }

        static void EcrireCoffrePortable(string chemin, string maitre, string libelle)
        {
            var c = Coffre.PortableSur(chemin);
            c.Ouvrir();
            if (c.MaitreActif) c.Deverrouiller(maitre); else c.DefinirMaitre(maitre);
            c.Ajouter(libelle, "", "mdp-" + libelle);
            c.Verrouiller();
        }

        static void TesterSynchroBoucleLocale()
        {
            string racine = Path.Combine(Path.GetTempPath(), "MithrilBancL_" + Guid.NewGuid().ToString("N"));
            string dossierPc = Path.Combine(racine, "pc"), dossierTel = Path.Combine(racine, "tel"), dossierAutre = Path.Combine(racine, "autre");
            string cheminPc = Path.Combine(racine, "sync", "coffre-portable.mithril");
            string cheminTel = Path.Combine(dossierTel, "coffre-portable.mithril");
            string clePc = "Mithril.Banc.PC." + Guid.NewGuid().ToString("N");
            string cleTel = "Mithril.Banc.Tel." + Guid.NewGuid().ToString("N");
            string cleAutre = "Mithril.Banc.Autre." + Guid.NewGuid().ToString("N");
            Directory.CreateDirectory(dossierPc); Directory.CreateDirectory(dossierTel); Directory.CreateDirectory(dossierAutre);
            var journal = new List<string>();
            int codeAffiche = -1;
            var codePret = new ManualResetEvent(false);
            try
            {
                using (var pc = new Synchroniseur(dossierPc, "DJ", delegate { return cheminPc; }, clePc, 0))
                using (var tel = new TelephoneBanc(dossierTel, cleTel, cheminTel))
                {
                    pc.Journal += delegate(string m, bool alerte) { lock (journal) journal.Add((alerte ? "! " : "  ") + m); };
                    pc.CodeAppairage += delegate(int code) { if (code >= 0) { codeAffiche = code; codePret.Set(); } };
                    int recus = 0;
                    pc.CoffreRecu += delegate { recus++; };
                    pc.Demarrer(true);
                    int port = pc.PortEcoute;
                    Func<int> attendreCode = delegate { codePret.WaitOne(10000); codePret.Reset(); return codeAffiche; };

                    // 13-0. Decouverte ciblee : muette pour un inconnu hors appairage, bavarde si
                    // l'empreinte cible est la notre ou si l'appairage est ouvert.
                    Func<byte[], byte[]> sonder = delegate(byte[] cibleEmpreinte)
                    {
                        using (var udp = new UdpClient(new IPEndPoint(IPAddress.Loopback, 0)))
                        {
                            udp.Client.ReceiveTimeout = 700;
                            byte[] nonce = Reseau.Aleatoire(16);
                            byte[] req = cibleEmpreinte == null
                                ? Reseau.Concat(Encoding.ASCII.GetBytes("DECO"), nonce)
                                : Reseau.Concat(Encoding.ASCII.GetBytes("DECO"), nonce, cibleEmpreinte);
                            udp.Send(req, req.Length, new IPEndPoint(IPAddress.Loopback, pc.PortDecouverte));
                            var de = new IPEndPoint(IPAddress.Any, 0);
                            try { return udp.Receive(ref de); } catch (SocketException) { return null; }
                        }
                    };
                    byte[] muet = sonder(null);
                    byte[] parEmpreinte = sonder(pc.Empreinte);
                    byte[] mauvaiseCible = sonder(Reseau.Aleatoire(32));
                    pc.OuvrirAppairage();
                    byte[] enAppairage = sonder(null);
                    pc.FermerAppairage();
                    bool reponseValide = parEmpreinte != null && parEmpreinte.Length > 52
                        && Encoding.ASCII.GetString(parEmpreinte, 0, 4) == "DECO";
                    Verifier(muet == null && mauvaiseCible == null && reponseValide && enAppairage != null,
                        "synchro : decouverte muette pour un inconnu, repond a son empreinte ou en appairage");

                    // 13a. Inconnu hors appairage : la connexion est fermee sans un mot.
                    bool fermeSansMot = false;
                    try
                    {
                        byte[] fp; TcpClient cl;
                        using (var tls = tel.Connecter(port, out fp, out cl))
                        using (cl)
                        {
                            string t;
                            Trame.Ecrire(tls, "ETAT", new byte[76]);
                            try { Trame.Lire(tls, out t); } catch (SynchroException) { fermeSansMot = true; } catch (IOException) { fermeSansMot = true; }
                        }
                    }
                    catch (IOException) { fermeSansMot = true; }
                    Verifier(fermeSansMot && pc.Annuaire.Appareils.Count == 0, "synchro : appareil inconnu hors appairage ferme sans reponse");

                    // 13b. Appairage avec un code faux : refuse, annuaire intact.
                    pc.OuvrirAppairage();
                    string nomPcVu = tel.Appairer(port, attendreCode, 0);
                    Thread.Sleep(200);
                    Verifier(nomPcVu == null && pc.Annuaire.Appareils.Count == 0, "synchro : appairage avec un code faux refuse");

                    // 13c. Appairage avec le bon code : le PC se nomme, le telephone entre a l'annuaire.
                    nomPcVu = tel.Appairer(port, attendreCode, null);
                    Thread.Sleep(200);
                    var entree = pc.Annuaire.Trouver(tel.Empreinte);
                    Verifier(nomPcVu == "DJ" && entree != null && entree.Nom == "Banc" && !pc.AppairageOuvert,
                        "synchro : appairage en boucle locale TLS, appareil memorise");

                    // 13d. Premier echange : le PC a un coffre, le telephone rien -> le telephone recoit.
                    EcrireCoffrePortable(cheminPc, "maitre banc", "Depuis PC");
                    tel.Synchroniser(port);
                    Verifier(tel.DerniereDecision == Decision.JeRecois && File.Exists(cheminTel)
                          && Coffre.ComparerConstant(File.ReadAllBytes(cheminTel), File.ReadAllBytes(cheminPc)),
                        "synchro : premier echange, le telephone recoit le coffre du PC");

                    // 13e. Rien a faire quand les deux sont a jour.
                    tel.Synchroniser(port);
                    Verifier(tel.DerniereDecision == Decision.Rien, "synchro : coffres identiques, rien n'est transfere");

                    // 13f. Le telephone modifie seul -> le PC recoit, pose un .bak, signale.
                    EcrireCoffrePortable(cheminTel, "maitre banc", "Depuis tel");
                    tel.Synchroniser(port);
                    Verifier(tel.DerniereDecision == Decision.JEnvoie && recus == 1 && File.Exists(cheminPc + ".bak")
                          && Coffre.ComparerConstant(File.ReadAllBytes(cheminTel), File.ReadAllBytes(cheminPc)),
                        "synchro : modification du telephone recue par le PC, .bak pose");
                    var relu = Coffre.PortableSur(cheminPc); relu.Ouvrir(); relu.Deverrouiller("maitre banc");
                    Verifier(relu.Entrees.Count == 2, "synchro : le coffre recu s'ouvre avec le maitre et contient les deux entrees");
                    relu.Verrouiller();

                    // 13g. Conflit : les deux modifient ; le PC est plus ancien -> il recoit et garde sa version en .conflit.
                    EcrireCoffrePortable(cheminPc, "maitre banc", "Conflit PC");
                    File.SetLastWriteTimeUtc(cheminPc, DateTime.UtcNow.AddMinutes(-5));
                    EcrireCoffrePortable(cheminTel, "maitre banc", "Conflit tel");
                    tel.Synchroniser(port);
                    string[] conflits = Directory.GetFiles(Path.GetDirectoryName(cheminPc), "*.conflit-*.mithril");
                    Verifier(tel.DerniereDecision == Decision.ConflitJEnvoie && conflits.Length == 1
                          && Coffre.ComparerConstant(File.ReadAllBytes(cheminTel), File.ReadAllBytes(cheminPc)),
                        "synchro : conflit tranche par le plus recent, version perdante conservee en .conflit");
                    bool alerteConflit = false;
                    lock (journal) foreach (string l in journal) if (l.StartsWith("! Conflit")) alerteConflit = true;
                    Verifier(alerteConflit, "synchro : le conflit est signale a l'utilisateur");

                    // 13g2. Plafond de connexions : au-dela de 8 connexions simultanees, la suivante
                    // est fermee sans poignee de main (un voisin en rafale n'epuise pas le PC).
                    var rafale = new List<TcpClient>();
                    try
                    {
                        for (int i = 0; i < 8; i++) { var c = new TcpClient("127.0.0.1", port); rafale.Add(c); }
                        Thread.Sleep(300);
                        bool neuviemeFermee = false;
                        using (var neuvieme = new TcpClient("127.0.0.1", port))
                        {
                            neuvieme.ReceiveTimeout = 3000;
                            try { neuviemeFermee = neuvieme.GetStream().Read(new byte[1], 0, 1) == 0; }
                            catch (IOException) { neuviemeFermee = true; }
                        }
                        Verifier(neuviemeFermee, "synchro : neuvieme connexion simultanee fermee aussitot (plafond)");
                    }
                    finally { foreach (var c in rafale) c.Close(); }
                    Thread.Sleep(300);

                    // 13h. Un autre appareil, jamais appaire, meme avec le bon protocole : refuse.
                    using (var autre = new TelephoneBanc(dossierAutre, cleAutre, null))
                    {
                        bool refuse = false;
                        try { autre.Synchroniser(port); } catch (SynchroException) { refuse = true; } catch (IOException) { refuse = true; }
                        Verifier(refuse, "synchro : appareil non appaire refuse en session");
                    }
                    pc.Arreter();
                }
            }
            finally
            {
                foreach (string k in new[] { clePc, cleTel, cleAutre })
                    try { CngKey.Open(k).Delete(); } catch (CryptographicException) { }
                try { Directory.Delete(racine, true); } catch (IOException) { }
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
