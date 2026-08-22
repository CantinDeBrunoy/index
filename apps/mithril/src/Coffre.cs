using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;

namespace Mithril
{
    /// <summary>Erreur du coffre présentable à l'utilisateur (mauvais maître, fichier altéré...).</summary>
    class CoffreException : Exception
    {
        public CoffreException(string message) : base(message) { }
    }

    /// <summary>
    /// Secret gardé chiffré en mémoire entre deux usages (CryptProtectMemory, palier 2) :
    /// un scan de la mémoire du processus ne trouve la valeur en clair que pendant les
    /// quelques millisecondes d'une opération.
    /// </summary>
    sealed class SecretMemoire : IDisposable
    {
        [DllImport("crypt32.dll", SetLastError = true)]
        static extern bool CryptProtectMemory(byte[] donnees, uint taille, uint options);
        [DllImport("crypt32.dll", SetLastError = true)]
        static extern bool CryptUnprotectMemory(byte[] donnees, uint taille, uint options);
        const uint MemeProcessus = 0; // CRYPTPROTECTMEMORY_SAME_PROCESS

        readonly byte[] protege; // arrondi au bloc de 16 exigé par l'API
        readonly int longueur;
        static bool apiDisponible = true;

        /// <summary>Prend possession du tampon fourni et l'efface.</summary>
        public SecretMemoire(byte[] clair)
        {
            longueur = clair.Length;
            protege = new byte[(longueur + 15) / 16 * 16];
            Array.Copy(clair, protege, longueur);
            Array.Clear(clair, 0, clair.Length);
            if (apiDisponible)
            {
                try { apiDisponible = CryptProtectMemory(protege, (uint)protege.Length, MemeProcessus); }
                catch (DllNotFoundException) { apiDisponible = false; }
                catch (EntryPointNotFoundException) { apiDisponible = false; }
            }
            // Si l'API manque (Windows exotique), le secret reste en clair dans ce tampon :
            // on perd le palier 2 mais rien d'autre.
        }

        /// <summary>Copie en clair, à effacer par l'appelant sitôt utilisée.</summary>
        public byte[] Reveler()
        {
            var copie = (byte[])protege.Clone();
            if (apiDisponible) CryptUnprotectMemory(copie, (uint)copie.Length, MemeProcessus);
            if (copie.Length == longueur) return copie;
            var exact = new byte[longueur];
            Array.Copy(copie, exact, longueur);
            Array.Clear(copie, 0, copie.Length);
            return exact;
        }

        public void Dispose()
        {
            Array.Clear(protege, 0, protege.Length);
        }
    }

    /// <summary>Une entrée du coffre ; le mot de passe n'existe en clair qu'à la demande.</summary>
    class EntreeCoffre
    {
        public string Libelle;
        public string Identifiant;
        public DateTime Creation;
        public byte[] Icone; // PNG de l'appli cible (facultatif) ; null = avatar monogramme
        SecretMemoire secret;

        public void DefinirMdp(byte[] mdpUtf8)
        {
            if (secret != null) secret.Dispose();
            secret = new SecretMemoire(mdpUtf8); // prend possession et efface le tampon
        }

        /// <summary>Déchiffre le mot de passe à l'instant de l'usage (copie, affichage).</summary>
        public string RevelerMdp()
        {
            var octets = secret.Reveler();
            string mdp = Encoding.UTF8.GetString(octets);
            Array.Clear(octets, 0, octets.Length);
            return mdp;
        }

        internal byte[] RevelerMdpUtf8() { return secret.Reveler(); }

        public void Effacer()
        {
            if (secret != null) { secret.Dispose(); secret = null; }
        }
    }

    /// <summary>
    /// Coffre local : fichier unique chiffré DPAPI (session Windows), avec en option une
    /// couche AES-256 + HMAC-SHA256 dérivée d'un mot de passe maître (PBKDF2).
    /// Emboîtement : DPAPI( AES_maître( données ) ) — illisible hors de la machine même
    /// sans maître, et illisible par un autre processus tant que le maître n'est pas saisi.
    /// En mode portable (MITHRIL3), la couche DPAPI disparaît : le fichier, chiffré par le
    /// maître seul (obligatoire), voyage entre machines et se synchronise.
    /// </summary>
    class Coffre
    {
        // --- Format du bloc interne (sous DPAPI) ---
        // [0..7]  magie : "MITHRIL1" (entrées sans icône) ou "MITHRIL2" (avec icône)
        // [8]     drapeaux : bit 0 = maître actif
        // maître actif :   [9..24] sel  [25..28] itérations  [29..44] IV
        //                  [45..76] HMAC-SHA256(magie|drapeaux|sel|itérations|IV|chiffré)
        //                  [77..]  données chiffrées AES-256-CBC
        // sans maître :    [9..]   données en clair (mais toujours sous DPAPI)
        //
        // --- Format portable : "MITHRIL3" ---
        // Même bloc que MITHRIL2 avec maître (mêmes décalages 8/9/25/29/45/77), mais écrit
        // NU sur le disque, sans couche DPAPI : le fichier voyage entre machines et n'est
        // protégé que par le maître, obligatoire (bit 0 toujours à 1). Le HMAC couvrant la
        // magie, un MITHRIL3 ne peut pas être maquillé en MITHRIL2 sans invalider le MAC.
        static readonly byte[] Magie = Encoding.ASCII.GetBytes("MITHRIL1");  // ancien, encore lu
        static readonly byte[] Magie2 = Encoding.ASCII.GetBytes("MITHRIL2"); // écrit désormais (sous DPAPI)
        static readonly byte[] Magie3 = Encoding.ASCII.GetBytes("MITHRIL3"); // coffre portable, sans DPAPI
        static readonly byte[] EntropieDpapi = Encoding.ASCII.GetBytes("Mithril.Coffre.v1");
        public const int IterationsDefaut = 600000;
        public const int IterationsPortableDefaut = 1300000; // OWASP pour PBKDF2-HMAC-SHA1 : seule barrière sans DPAPI

        readonly string chemin;
        readonly string cheminSecours;
        readonly List<EntreeCoffre> entrees = new List<EntreeCoffre>();

        bool maitreActif;
        bool avecIcones; // format de la charge en cours (déterminé par la magie lue)
        byte[] sel;
        int iterations;
        SecretMemoire cle;       // 64 octets dérivés : 32 AES + 32 HMAC
        byte[] blocEnAttente;    // bloc interne lu, en attente du maître (ciphertext, sans danger)
        bool deverrouille;
        bool portable;               // fichier MITHRIL3 : chiffré par maître seul, sans DPAPI
        DateTime horodatageDisque;   // LastWriteTimeUtc constaté à l'ouverture / au dernier Sauver

        /// <summary>Signalé quand Sauver() écrase une version modifiée ailleurs (synchro concurrente).</summary>
        public event Action<string> AvertissementSynchro;

        public Coffre(string dossier)
        {
            chemin = Path.Combine(dossier, "coffre.mithril");
            cheminSecours = Path.Combine(dossier, "coffre.bak");
        }

        Coffre(string cheminFichier, bool portable)
        {
            chemin = cheminFichier;
            cheminSecours = cheminFichier + ".bak";
            this.portable = portable;
        }

        /// <summary>Coffre portable : fichier chiffré par maître seul (sans DPAPI), qui voyage entre machines.</summary>
        public static Coffre PortableSur(string cheminFichier)
        {
            return new Coffre(cheminFichier, true);
        }

        public static Coffre ParDefaut()
        {
            return new Coffre(Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Mithril"));
        }

        public bool Existe { get { return File.Exists(chemin); } }
        public bool MaitreActif { get { return maitreActif; } }
        public bool Deverrouille { get { return deverrouille; } }
        public bool Portable { get { return portable; } }
        public string Chemin { get { return chemin; } }
        public IList<EntreeCoffre> Entrees { get { return entrees.AsReadOnly(); } }

        /// <summary>
        /// Entrées dont le libellé apparaît dans le titre de fenêtre donné (appariement de
        /// l'auto-type contextuel). Casse ignorée ; les plus longs libellés d'abord, pour que
        /// « Amazon AWS » l'emporte sur « Amazon ». Vide si le coffre n'est pas déverrouillé.
        /// </summary>
        public List<EntreeCoffre> Correspondances(string titreFenetre)
        {
            var trouvees = new List<EntreeCoffre>();
            if (!deverrouille || string.IsNullOrEmpty(titreFenetre)) return trouvees;
            string titre = titreFenetre.ToLowerInvariant();
            foreach (var e in entrees)
            {
                if (string.IsNullOrEmpty(e.Libelle)) continue;
                if (titre.IndexOf(e.Libelle.ToLowerInvariant(), StringComparison.Ordinal) >= 0)
                    trouvees.Add(e);
            }
            trouvees.Sort(delegate(EntreeCoffre a, EntreeCoffre b)
            {
                return b.Libelle.Length.CompareTo(a.Libelle.Length);
            });
            return trouvees;
        }

        /// <summary>
        /// Ouvre le fichier : sans maître, charge les entrées ; avec maître, s'arrête au
        /// seuil et attend Deverrouiller(). Un coffre inexistant s'ouvre vide, déverrouillé.
        /// </summary>
        public void Ouvrir()
        {
            Verrouiller();
            if (!Existe)
            {
                maitreActif = false;
                deverrouille = true;
                return;
            }

            byte[] brut = File.ReadAllBytes(chemin);
            byte[] bloc;
            if (brut.Length >= 9 && Compare(brut, 0, Magie3))
            {
                // Coffre portable : le bloc est écrit nu, jamais de DPAPI — c'est ce qui le
                // rend lisible sur n'importe quelle machine, avec le maître pour seule clé.
                portable = true;
                avecIcones = true;
                bloc = brut;
                if ((bloc[8] & 1) == 0)
                    throw new CoffreException("Coffre portable sans mot de passe maître : fichier invalide.");
            }
            else
            {
                portable = false;
                try { bloc = ProtectedData.Unprotect(brut, EntropieDpapi, DataProtectionScope.CurrentUser); }
                catch (CryptographicException)
                {
                    throw new CoffreException(
                        "Le coffre est illisible sur cette session Windows (autre compte, profil réinstallé, ou fichier altéré).");
                }
                bool magie1 = bloc.Length >= 9 && Compare(bloc, 0, Magie);
                avecIcones = bloc.Length >= 9 && Compare(bloc, 0, Magie2);
                if (!magie1 && !avecIcones)
                    throw new CoffreException("Ce fichier n'est pas un coffre Mithril valide.");
            }
            horodatageDisque = File.GetLastWriteTimeUtc(chemin);

            maitreActif = (bloc[8] & 1) != 0;
            if (maitreActif)
            {
                if (bloc.Length < 78) throw new CoffreException("Coffre tronqué.");
                sel = Extraire(bloc, 9, 16);
                iterations = BitConverter.ToInt32(bloc, 25);
                if (iterations < 1000 || iterations > 100000000)
                    throw new CoffreException("Coffre altéré (itérations aberrantes).");
                blocEnAttente = bloc;
                deverrouille = false;
            }
            else
            {
                ChargerEntrees(bloc, 9, bloc.Length - 9);
                Array.Clear(bloc, 0, bloc.Length);
                deverrouille = true;
            }
        }

        /// <summary>Vérifie le maître (via HMAC) puis charge les entrées.</summary>
        public void Deverrouiller(string maitre)
        {
            if (!maitreActif || blocEnAttente == null) throw new InvalidOperationException("Rien à déverrouiller.");
            byte[] derive = Deriver(maitre, sel, iterations);
            var bloc = blocEnAttente;

            byte[] hmacAttendu = Extraire(bloc, 45, 32);
            byte[] hmacCalcule = CalculerHmac(derive, bloc, 77, bloc.Length - 77);
            if (!ComparerConstant(hmacAttendu, hmacCalcule))
            {
                Array.Clear(derive, 0, derive.Length);
                throw new CoffreException("Mot de passe maître incorrect (ou fichier altéré).");
            }

            byte[] iv = Extraire(bloc, 29, 16);
            byte[] clair = Aes(derive, iv, bloc, 77, bloc.Length - 77, false);
            ChargerEntrees(clair, 0, clair.Length);
            Array.Clear(clair, 0, clair.Length);

            cle = new SecretMemoire(derive); // prend possession et efface derive
            blocEnAttente = null;
            deverrouille = true;
        }

        /// <summary>Efface de la mémoire les secrets et la clé ; l'état revient « au seuil ».</summary>
        public void Verrouiller()
        {
            foreach (var e in entrees) e.Effacer();
            entrees.Clear();
            if (cle != null) { cle.Dispose(); cle = null; }
            blocEnAttente = null;
            deverrouille = false;
        }

        // --- Édition (coffre déverrouillé) ---

        public EntreeCoffre Ajouter(string libelle, string identifiant, string mdp)
        {
            ExigerDeverrouille();
            var entree = new EntreeCoffre { Libelle = libelle, Identifiant = identifiant, Creation = DateTime.Now };
            entree.DefinirMdp(Encoding.UTF8.GetBytes(mdp));
            entrees.Add(entree);
            Sauver();
            return entree;
        }

        public void Supprimer(EntreeCoffre entree)
        {
            ExigerDeverrouille();
            entree.Effacer();
            entrees.Remove(entree);
            Sauver();
        }

        /// <summary>Associe (ou retire, avec null) l'icône d'une entrée et enregistre.</summary>
        public void DefinirIcone(EntreeCoffre entree, byte[] png)
        {
            ExigerDeverrouille();
            entree.Icone = png;
            Sauver();
        }

        /// <summary>Active le maître ou le remplace (le coffre doit être déverrouillé).</summary>
        public void DefinirMaitre(string nouveau)
        {
            ExigerDeverrouille();
            sel = new byte[16];
            using (var rng = new RNGCryptoServiceProvider()) rng.GetBytes(sel);
            // En portable, PBKDF2 est la seule barrière contre une attaque hors-ligne : le
            // plancher renforcé s'impose même si le réglage utilisateur est plus bas.
            int plancher = portable ? IterationsPortableDefaut : IterationsDefaut;
            int demande = Reglages.Actuels.IterationsMaitre;
            iterations = demande > plancher ? demande : plancher;
            byte[] derive = Deriver(nouveau, sel, iterations);
            if (cle != null) cle.Dispose();
            cle = new SecretMemoire(derive);
            maitreActif = true;
            Sauver();
        }

        public void RetirerMaitre()
        {
            ExigerDeverrouille();
            if (portable)
                throw new CoffreException("Impossible de retirer le maître d'un coffre portable : c'est sa seule protection.");
            if (cle != null) { cle.Dispose(); cle = null; }
            maitreActif = false;
            Sauver();
        }

        /// <summary>
        /// Copie les entrées vers un NOUVEAU coffre portable (MITHRIL3) à l'emplacement donné.
        /// Le coffre d'origine n'est ni modifié ni converti ; le maître est obligatoire.
        /// </summary>
        public Coffre CopierVersPortable(string cheminFichier, string maitre)
        {
            ExigerDeverrouille();
            if (string.IsNullOrEmpty(maitre))
                throw new CoffreException("Un coffre portable exige un mot de passe maître.");
            var cible = PortableSur(cheminFichier);
            cible.deverrouille = true; // coffre neuf, encore vide
            foreach (var e in entrees)
            {
                var copie = new EntreeCoffre
                {
                    Libelle = e.Libelle,
                    Identifiant = e.Identifiant,
                    Creation = e.Creation,
                    Icone = e.Icone
                };
                copie.DefinirMdp(e.RevelerMdpUtf8()); // DefinirMdp prend possession et efface
                cible.entrees.Add(copie);
            }
            cible.DefinirMaitre(maitre); // dérive la clé puis Sauver() écrit le fichier MITHRIL3
            return cible;
        }

        /// <summary>Exportation EN CLAIR, sur action explicite : c'est la sauvegarde de secours.</summary>
        public void Exporter(string cheminTexte)
        {
            ExigerDeverrouille();
            var sb = new StringBuilder();
            sb.AppendLine("# Export Mithril du " + DateTime.Now.ToString("yyyy-MM-dd HH:mm"));
            sb.AppendLine("# ATTENTION : ce fichier est en clair. À stocker en lieu sûr puis à détruire.");
            sb.AppendLine("# libellé <TAB> identifiant <TAB> mot de passe <TAB> créé le");
            foreach (var e in entrees)
                sb.AppendLine(e.Libelle + "\t" + e.Identifiant + "\t" + e.RevelerMdp() + "\t" +
                              e.Creation.ToString("yyyy-MM-dd"));
            File.WriteAllText(cheminTexte, sb.ToString(), Encoding.UTF8);
        }

        // --- Persistance ---

        /// <summary>Chiffre et écrit le fichier de façon atomique (.tmp puis remplacement, .bak conservé).</summary>
        public void Sauver()
        {
            ExigerDeverrouille();
            if (portable && !maitreActif)
                throw new CoffreException("Un coffre portable exige un mot de passe maître : définis-le d'abord.");
            byte[] charge = SerialiserEntrees();
            byte[] bloc;

            if (maitreActif)
            {
                byte[] derive = cle.Reveler();
                byte[] iv = new byte[16];
                using (var rng = new RNGCryptoServiceProvider()) rng.GetBytes(iv);
                byte[] chiffre = Aes(derive, iv, charge, 0, charge.Length, true);

                bloc = new byte[77 + chiffre.Length];
                Array.Copy(portable ? Magie3 : Magie2, bloc, 8);
                bloc[8] = 1;
                Array.Copy(sel, 0, bloc, 9, 16);
                Array.Copy(BitConverter.GetBytes(iterations), 0, bloc, 25, 4);
                Array.Copy(iv, 0, bloc, 29, 16);
                Array.Copy(chiffre, 0, bloc, 77, chiffre.Length);
                byte[] hmac = CalculerHmac(derive, bloc, 77, chiffre.Length);
                Array.Copy(hmac, 0, bloc, 45, 32);
                Array.Clear(derive, 0, derive.Length);
            }
            else
            {
                bloc = new byte[9 + charge.Length];
                Array.Copy(Magie2, bloc, 8);
                bloc[8] = 0;
                Array.Copy(charge, 0, bloc, 9, charge.Length);
            }
            Array.Clear(charge, 0, charge.Length);

            byte[] fichier;
            if (portable)
            {
                fichier = bloc; // écrit nu : la seule protection est le maître (PBKDF2 + AES + HMAC)
            }
            else
            {
                fichier = ProtectedData.Protect(bloc, EntropieDpapi, DataProtectionScope.CurrentUser);
                Array.Clear(bloc, 0, bloc.Length);
            }

            // Synchro concurrente (portable) : si le fichier a changé depuis notre ouverture, on
            // écrase quand même — dernier écrit gagne, l'autre version bascule en .bak — mais on
            // le signale. Pas de fusion : la limite est assumée et documentée dans le README.
            bool ecraseAutreVersion = portable && horodatageDisque != DateTime.MinValue
                && File.Exists(chemin) && File.GetLastWriteTimeUtc(chemin) != horodatageDisque;

            Directory.CreateDirectory(Path.GetDirectoryName(chemin));
            string temporaire = chemin + ".tmp";
            File.WriteAllBytes(temporaire, fichier);
            if (File.Exists(chemin)) File.Replace(temporaire, chemin, cheminSecours);
            else File.Move(temporaire, chemin);
            if (portable) Array.Clear(bloc, 0, bloc.Length);
            horodatageDisque = File.GetLastWriteTimeUtc(chemin);
            if (portable) PoserReglesSynchro(Path.GetDirectoryName(chemin));

            if (ecraseAutreVersion)
            {
                var gestionnaire = AvertissementSynchro;
                if (gestionnaire != null) gestionnaire(
                    "Le coffre portable avait été modifié ailleurs : cette version l'écrase (la précédente est dans " +
                    Path.GetFileName(cheminSecours) + ").");
            }
        }

        // --- Règles de synchronisation ---

        /// <summary>Première ligne du .stignore : c'est elle qui dit que le fichier est à Mithril.</summary>
        public const string EnteteReglesSynchro = "// Pose par Mithril : fichiers de travail locaux, jamais synchronises";

        /// <summary>Contenu canonique du .stignore : .tmp (écriture atomique), .bak (secours
        /// local) et fichiers de verrou. Identique sur chaque appareil, Windows comme Android —
        /// un motif ignoré d'un seul côté bloque la synchronisation pour toujours, puisqu'un
        /// relais qui ignore un fichier ne le transmet jamais.</summary>
        public static readonly string ReglesSynchro =
            EnteteReglesSynchro + "\n*.tmp\n*.bak\n~*\n.~*\n";

        /// <summary>Pose le .stignore dans le dossier du coffre portable. Créé s'il manque,
        /// réaligné s'il porte l'en-tête de Mithril, jamais touché s'il est à l'utilisateur.</summary>
        public static void PoserReglesSynchro(string dossier)
        {
            string fichier = Path.Combine(dossier, ".stignore");
            try
            {
                if (File.Exists(fichier))
                {
                    string actuel = File.ReadAllText(fichier, Encoding.UTF8);
                    if (actuel == ReglesSynchro) return;
                    if (!actuel.StartsWith(EnteteReglesSynchro) && !actuel.Contains("Mithril")) return;
                }
                File.WriteAllText(fichier, ReglesSynchro, new UTF8Encoding(false));
            }
            catch (IOException) { }            // un .stignore manquant n'empêche pas le coffre de vivre
            catch (UnauthorizedAccessException) { }
        }

        // charge : int32 nombre, puis par entrée libellé, identifiant, ticks, mdp (UTF-8 préfixé longueur)
        byte[] SerialiserEntrees()
        {
            using (var flux = new MemoryStream())
            using (var ecrivain = new BinaryWriter(flux, Encoding.UTF8))
            {
                ecrivain.Write(entrees.Count);
                foreach (var e in entrees)
                {
                    ecrivain.Write(e.Libelle ?? "");
                    ecrivain.Write(e.Identifiant ?? "");
                    ecrivain.Write(e.Creation.Ticks);
                    byte[] mdp = e.RevelerMdpUtf8();
                    ecrivain.Write(mdp.Length);
                    ecrivain.Write(mdp);
                    Array.Clear(mdp, 0, mdp.Length);
                    // Icône (format v2, écrit toujours) : longueur puis octets ; 0 = aucune.
                    byte[] icone = e.Icone;
                    if (icone == null) ecrivain.Write(0);
                    else { ecrivain.Write(icone.Length); ecrivain.Write(icone); }
                }
                ecrivain.Flush();
                byte[] resultat = flux.ToArray();
                // Le tampon interne du MemoryStream a vu les mots de passe : on l'efface aussi.
                byte[] interne = flux.GetBuffer();
                Array.Clear(interne, 0, interne.Length);
                return resultat;
            }
        }

        void ChargerEntrees(byte[] donnees, int debut, int longueur)
        {
            entrees.Clear();
            try
            {
                using (var flux = new MemoryStream(donnees, debut, longueur))
                using (var lecteur = new BinaryReader(flux, Encoding.UTF8))
                {
                    int nombre = lecteur.ReadInt32();
                    if (nombre < 0 || nombre > 100000) throw new CoffreException("Coffre altéré.");
                    for (int i = 0; i < nombre; i++)
                    {
                        var e = new EntreeCoffre();
                        e.Libelle = lecteur.ReadString();
                        e.Identifiant = lecteur.ReadString();
                        e.Creation = new DateTime(lecteur.ReadInt64());
                        int taille = lecteur.ReadInt32();
                        if (taille < 0 || taille > 4096) throw new CoffreException("Coffre altéré.");
                        e.DefinirMdp(lecteur.ReadBytes(taille));
                        if (avecIcones)
                        {
                            int tIcone = lecteur.ReadInt32();
                            if (tIcone < 0 || tIcone > 1048576) throw new CoffreException("Coffre altéré.");
                            if (tIcone > 0) e.Icone = lecteur.ReadBytes(tIcone);
                        }
                        entrees.Add(e);
                    }
                }
            }
            catch (EndOfStreamException)
            {
                throw new CoffreException("Coffre tronqué ou altéré.");
            }
        }

        // --- Primitives ---

        static byte[] Deriver(string maitre, byte[] sel, int iterations)
        {
            using (var pbkdf2 = new Rfc2898DeriveBytes(maitre, sel, iterations))
                return pbkdf2.GetBytes(64); // 32 octets AES + 32 octets HMAC
        }

        static byte[] Aes(byte[] derive, byte[] iv, byte[] donnees, int debut, int longueur, bool chiffrer)
        {
            byte[] cleAes = Extraire(derive, 0, 32);
            try
            {
                using (var aes = new AesCryptoServiceProvider())
                {
                    aes.Key = cleAes;
                    aes.IV = iv;
                    aes.Mode = CipherMode.CBC;
                    aes.Padding = PaddingMode.PKCS7;
                    using (var transformation = chiffrer ? aes.CreateEncryptor() : aes.CreateDecryptor())
                        return transformation.TransformFinalBlock(donnees, debut, longueur);
                }
            }
            catch (CryptographicException)
            {
                throw new CoffreException("Coffre altéré (déchiffrement impossible).");
            }
            finally
            {
                Array.Clear(cleAes, 0, cleAes.Length);
            }
        }

        static byte[] CalculerHmac(byte[] derive, byte[] bloc, int debutChiffre, int longueurChiffre)
        {
            byte[] cleHmac = Extraire(derive, 32, 32);
            try
            {
                using (var hmac = new HMACSHA256(cleHmac))
                {
                    // Couvre l'en-tête (magie|drapeaux|sel|itérations|IV) puis le chiffré.
                    hmac.TransformBlock(bloc, 0, 45, null, 0);
                    hmac.TransformFinalBlock(bloc, debutChiffre, longueurChiffre);
                    return hmac.Hash;
                }
            }
            finally
            {
                Array.Clear(cleHmac, 0, cleHmac.Length);
            }
        }

        /// <summary>Comparaison en temps constant : ne fuit pas la position du premier octet faux.</summary>
        static bool ComparerConstant(byte[] a, byte[] b)
        {
            if (a.Length != b.Length) return false;
            int difference = 0;
            for (int i = 0; i < a.Length; i++) difference |= a[i] ^ b[i];
            return difference == 0;
        }

        static bool Compare(byte[] donnees, int debut, byte[] attendu)
        {
            for (int i = 0; i < attendu.Length; i++)
                if (donnees[debut + i] != attendu[i]) return false;
            return true;
        }

        static byte[] Extraire(byte[] source, int debut, int longueur)
        {
            var resultat = new byte[longueur];
            Array.Copy(source, debut, resultat, 0, longueur);
            return resultat;
        }

        void ExigerDeverrouille()
        {
            if (!deverrouille) throw new InvalidOperationException("Coffre verrouillé.");
        }
    }
}
