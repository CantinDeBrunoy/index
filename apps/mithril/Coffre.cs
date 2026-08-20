using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;

namespace MdpGen
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
    /// </summary>
    class Coffre
    {
        // --- Format du bloc interne (sous DPAPI) ---
        // [0..7]  magie "MITHRIL1"
        // [8]     drapeaux : bit 0 = maître actif
        // maître actif :   [9..24] sel  [25..28] itérations  [29..44] IV
        //                  [45..76] HMAC-SHA256(magie|drapeaux|sel|itérations|IV|chiffré)
        //                  [77..]  données chiffrées AES-256-CBC
        // sans maître :    [9..]   données en clair (mais toujours sous DPAPI)
        static readonly byte[] Magie = Encoding.ASCII.GetBytes("MITHRIL1");
        static readonly byte[] EntropieDpapi = Encoding.ASCII.GetBytes("Mithril.Coffre.v1");
        public const int IterationsDefaut = 600000;

        readonly string chemin;
        readonly string cheminSecours;
        readonly List<EntreeCoffre> entrees = new List<EntreeCoffre>();

        bool maitreActif;
        byte[] sel;
        int iterations;
        SecretMemoire cle;       // 64 octets dérivés : 32 AES + 32 HMAC
        byte[] blocEnAttente;    // bloc interne lu, en attente du maître (ciphertext, sans danger)
        bool deverrouille;

        public Coffre(string dossier)
        {
            chemin = Path.Combine(dossier, "coffre.mithril");
            cheminSecours = Path.Combine(dossier, "coffre.bak");
        }

        public static Coffre ParDefaut()
        {
            return new Coffre(Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Mithril"));
        }

        public bool Existe { get { return File.Exists(chemin); } }
        public bool MaitreActif { get { return maitreActif; } }
        public bool Deverrouille { get { return deverrouille; } }
        public IList<EntreeCoffre> Entrees { get { return entrees.AsReadOnly(); } }

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

            byte[] bloc;
            try { bloc = ProtectedData.Unprotect(File.ReadAllBytes(chemin), EntropieDpapi, DataProtectionScope.CurrentUser); }
            catch (CryptographicException)
            {
                throw new CoffreException(
                    "Le coffre est illisible sur cette session Windows (autre compte, profil réinstallé, ou fichier altéré).");
            }

            if (bloc.Length < 9 || !Compare(bloc, 0, Magie))
                throw new CoffreException("Ce fichier n'est pas un coffre Mithril valide.");

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

        /// <summary>Active le maître ou le remplace (le coffre doit être déverrouillé).</summary>
        public void DefinirMaitre(string nouveau)
        {
            ExigerDeverrouille();
            sel = new byte[16];
            using (var rng = new RNGCryptoServiceProvider()) rng.GetBytes(sel);
            iterations = IterationsDefaut;
            byte[] derive = Deriver(nouveau, sel, iterations);
            if (cle != null) cle.Dispose();
            cle = new SecretMemoire(derive);
            maitreActif = true;
            Sauver();
        }

        public void RetirerMaitre()
        {
            ExigerDeverrouille();
            if (cle != null) { cle.Dispose(); cle = null; }
            maitreActif = false;
            Sauver();
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
            byte[] charge = SerialiserEntrees();
            byte[] bloc;

            if (maitreActif)
            {
                byte[] derive = cle.Reveler();
                byte[] iv = new byte[16];
                using (var rng = new RNGCryptoServiceProvider()) rng.GetBytes(iv);
                byte[] chiffre = Aes(derive, iv, charge, 0, charge.Length, true);

                bloc = new byte[77 + chiffre.Length];
                Array.Copy(Magie, bloc, 8);
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
                Array.Copy(Magie, bloc, 8);
                bloc[8] = 0;
                Array.Copy(charge, 0, bloc, 9, charge.Length);
            }
            Array.Clear(charge, 0, charge.Length);

            byte[] fichier = ProtectedData.Protect(bloc, EntropieDpapi, DataProtectionScope.CurrentUser);
            Array.Clear(bloc, 0, bloc.Length);

            Directory.CreateDirectory(Path.GetDirectoryName(chemin));
            string temporaire = chemin + ".tmp";
            File.WriteAllBytes(temporaire, fichier);
            if (File.Exists(chemin)) File.Replace(temporaire, chemin, cheminSecours);
            else File.Move(temporaire, chemin);
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
