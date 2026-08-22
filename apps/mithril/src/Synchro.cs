using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Security;
using System.Net.Sockets;
using System.Security.Authentication;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Threading;

// Seul fichier du projet autorisé à toucher au réseau (règle d'audit R01). Le protocole
// est fixé par docs/SYNCHRO.md (MSYN1), commun à Mithril Android : ne rien changer ici
// qui ne soit d'abord changé là-bas.

namespace Mithril
{
    /// <summary>Erreur de synchronisation présentable à l'utilisateur.</summary>
    class SynchroException : Exception
    {
        public SynchroException(string message) : base(message) { }
    }

    /// <summary>Ce qui est partagé par tout le module : port, limites, filtre d'adresses.</summary>
    static class Reseau
    {
        public const int Port = 27027;
        public const int TailleTrameMax = 4 * 1024 * 1024;
        public const int DelaiTrameMs = 10000;
        public const int DelaiPoigneeMs = 5000;

        /// <summary>
        /// Vrai pour une adresse de réseau privé : RFC 1918, lien-local, boucle locale, et la
        /// plage 100.64/10 (CGNAT, utilisée par Tailscale). Tout le reste est refusé avant
        /// même de lire un octet — Mithril ne parle jamais à Internet.
        /// </summary>
        public static bool EstAdressePrivee(IPAddress adresse)
        {
            if (adresse == null) return false;
            if (adresse.IsIPv4MappedToIPv6) adresse = adresse.MapToIPv4();
            if (adresse.AddressFamily == AddressFamily.InterNetworkV6)
                return IPAddress.IsLoopback(adresse) || adresse.IsIPv6LinkLocal || adresse.IsIPv6SiteLocal
                    || (adresse.GetAddressBytes()[0] & 0xFE) == 0xFC; // fc00::/7 (ULA)
            if (adresse.AddressFamily != AddressFamily.InterNetwork) return false;
            byte[] o = adresse.GetAddressBytes();
            if (o[0] == 10) return true;
            if (o[0] == 127) return true;
            if (o[0] == 172 && o[1] >= 16 && o[1] <= 31) return true;
            if (o[0] == 192 && o[1] == 168) return true;
            if (o[0] == 169 && o[1] == 254) return true;
            if (o[0] == 100 && o[1] >= 64 && o[1] <= 127) return true;
            return false;
        }

        public static byte[] Aleatoire(int taille)
        {
            var t = new byte[taille];
            using (var rng = new RNGCryptoServiceProvider()) rng.GetBytes(t);
            return t;
        }

        public static byte[] Sha256(params byte[][] morceaux)
        {
            using (var sha = new SHA256Managed())
            {
                foreach (byte[] m in morceaux) sha.TransformBlock(m, 0, m.Length, null, 0);
                sha.TransformFinalBlock(new byte[0], 0, 0);
                return sha.Hash;
            }
        }

        public static byte[] Hmac(byte[] cle, params byte[][] morceaux)
        {
            using (var h = new HMACSHA256(cle))
            {
                foreach (byte[] m in morceaux) h.TransformBlock(m, 0, m.Length, null, 0);
                h.TransformFinalBlock(new byte[0], 0, 0);
                return h.Hash;
            }
        }

        public static byte[] Concat(params byte[][] morceaux)
        {
            int total = 0;
            foreach (byte[] m in morceaux) total += m.Length;
            var r = new byte[total];
            int p = 0;
            foreach (byte[] m in morceaux) { Array.Copy(m, 0, r, p, m.Length); p += m.Length; }
            return r;
        }
    }

    /// <summary>
    /// Identité de ce PC : clé ECDSA P-256 persistante dans CNG (jamais exportée) et
    /// certificat auto-signé conservé en clair (il est public) dans le dossier de Mithril.
    /// Seule l'empreinte du certificat compte ; elle doit rester stable, d'où le fichier.
    /// </summary>
    static class Identite
    {
        public const string NomCle = "Mithril.Identite";
        const string NomFichier = "identite.cer";

        public static X509Certificate2 Charger(string dossier)
        {
            return Charger(dossier, NomCle);
        }

        /// <summary>Variante à nom de clé paramétrable, pour le banc (deux identités dans un processus).</summary>
        public static X509Certificate2 Charger(string dossier, string nomCle)
        {
            CngKey cle = CngKey.Exists(nomCle)
                ? CngKey.Open(nomCle)
                : CngKey.Create(CngAlgorithm.ECDsaP256, nomCle, new CngKeyCreationParameters
                {
                    ExportPolicy = CngExportPolicies.None,
                    KeyUsage = CngKeyUsages.Signing,
                });
            var ecdsa = new ECDsaCng(cle);
            string chemin = Path.Combine(dossier, nomCle == NomCle ? NomFichier : nomCle + ".cer");

            if (File.Exists(chemin))
            {
                try
                {
                    var existant = new X509Certificate2(File.ReadAllBytes(chemin));
                    using (var cleDuCert = existant.GetECDsaPublicKey())
                        if (cleDuCert != null && MemePubliques(cleDuCert, ecdsa))
                            return existant.CopyWithPrivateKey(ecdsa);
                }
                catch (CryptographicException) { }
                // Certificat illisible ou orphelin d'une autre clé : on le refait (l'empreinte
                // change, les appairages devront être refaits — c'est signalé par l'échec).
            }

            var demande = new CertificateRequest("CN=Mithril", ecdsa, HashAlgorithmName.SHA256);
            var debut = DateTimeOffset.UtcNow.AddDays(-1);
            using (var ephemere = demande.CreateSelfSigned(debut, debut.AddYears(20)))
            {
                byte[] der = ephemere.Export(X509ContentType.Cert);
                Directory.CreateDirectory(dossier);
                File.WriteAllBytes(chemin, der);
                return new X509Certificate2(der).CopyWithPrivateKey(ecdsa);
            }
        }

        static bool MemePubliques(ECDsa a, ECDsa b)
        {
            ECParameters pa = a.ExportParameters(false), pb = b.ExportParameters(false);
            return Coffre.ComparerConstant(pa.Q.X, pb.Q.X) && Coffre.ComparerConstant(pa.Q.Y, pb.Q.Y);
        }

        /// <summary>Empreinte d'un certificat : SHA-256 de son encodage DER.</summary>
        public static byte[] Empreinte(X509Certificate2 certificat)
        {
            return Reseau.Sha256(certificat.Export(X509ContentType.Cert));
        }

        public static string EmpreinteLisible(byte[] empreinte)
        {
            var sb = new StringBuilder(empreinte.Length * 3);
            for (int i = 0; i < empreinte.Length; i++)
            {
                if (i > 0 && i % 2 == 0) sb.Append(i % 8 == 0 ? " " : ":");
                sb.Append(empreinte[i].ToString("X2"));
            }
            return sb.ToString();
        }
    }

    /// <summary>Trames MSYN1 : longueur (uint32 grand-boutiste) ‖ type (4 ASCII) ‖ charge.</summary>
    static class Trame
    {
        public static void Ecrire(Stream flux, string type, byte[] charge)
        {
            if (type.Length != 4) throw new ArgumentException("type de trame sur 4 caractères");
            if (charge.Length > Reseau.TailleTrameMax) throw new SynchroException("Trame trop longue.");
            var entete = new byte[8];
            EcrireUint32(entete, 0, (uint)(4 + charge.Length));
            Encoding.ASCII.GetBytes(type, 0, 4, entete, 4);
            flux.Write(entete, 0, 8);
            flux.Write(charge, 0, charge.Length);
            flux.Flush();
        }

        /// <summary>Lit une trame ; toute anomalie (taille, type absent, flux coupé) est une exception.</summary>
        public static byte[] Lire(Stream flux, out string type)
        {
            var entete = LireExact(flux, 8);
            uint longueur = LireUint32(entete, 0);
            if (longueur < 4 || longueur > 4 + Reseau.TailleTrameMax) throw new SynchroException("Trame invalide.");
            type = Encoding.ASCII.GetString(entete, 4, 4);
            foreach (char c in type) if (!((c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9'))) throw new SynchroException("Trame invalide.");
            return LireExact(flux, (int)longueur - 4);
        }

        public static byte[] LireExact(Stream flux, int n)
        {
            var t = new byte[n];
            int lu = 0;
            while (lu < n)
            {
                int k = flux.Read(t, lu, n - lu);
                if (k <= 0) throw new SynchroException("Connexion interrompue.");
                lu += k;
            }
            return t;
        }

        public static void EcrireUint32(byte[] t, int i, uint v)
        {
            t[i] = (byte)(v >> 24); t[i + 1] = (byte)(v >> 16); t[i + 2] = (byte)(v >> 8); t[i + 3] = (byte)v;
        }

        public static uint LireUint32(byte[] t, int i)
        {
            return ((uint)t[i] << 24) | ((uint)t[i + 1] << 16) | ((uint)t[i + 2] << 8) | t[i + 3];
        }

        public static byte[] Chaine(string s)
        {
            byte[] utf8 = Encoding.UTF8.GetBytes(s);
            if (utf8.Length > ushort.MaxValue) throw new ArgumentException("chaîne trop longue");
            var r = new byte[2 + utf8.Length];
            r[0] = (byte)(utf8.Length >> 8); r[1] = (byte)utf8.Length;
            Array.Copy(utf8, 0, r, 2, utf8.Length);
            return r;
        }

        public static string LireChaine(byte[] t, ref int i)
        {
            if (i + 2 > t.Length) throw new SynchroException("Trame invalide.");
            int n = (t[i] << 8) | t[i + 1];
            i += 2;
            if (i + n > t.Length) throw new SynchroException("Trame invalide.");
            string s = Encoding.UTF8.GetString(t, i, n);
            i += n;
            return s;
        }

        public static byte[] Tranche(byte[] t, int debut, int n)
        {
            if (debut + n > t.Length) throw new SynchroException("Trame invalide.");
            var r = new byte[n];
            Array.Copy(t, debut, r, 0, n);
            return r;
        }
    }

    /// <summary>
    /// Clé ECDH P-256 éphémère pour l'appairage. Forme de fil : 65 octets 04‖X‖Y ; secret
    /// partagé réduit par SHA-256(Z), ce que fait CNG avec la KDF « Hash » sans préfixe ni suffixe.
    /// </summary>
    sealed class CleEphemere : IDisposable
    {
        readonly ECDiffieHellmanCng ecdh;
        public readonly byte[] Publique; // 65 octets

        public CleEphemere()
        {
            ecdh = new ECDiffieHellmanCng(256);
            ecdh.KeyDerivationFunction = ECDiffieHellmanKeyDerivationFunction.Hash;
            ecdh.HashAlgorithm = CngAlgorithm.Sha256;
            byte[] blob = ecdh.PublicKey.ToByteArray(); // ECCPUBLICBLOB : magie(4) ‖ taille(4) ‖ X ‖ Y
            Publique = new byte[65];
            Publique[0] = 4;
            Array.Copy(blob, 8, Publique, 1, 64);
        }

        /// <summary>SHA-256 du secret ECDH avec la clé publique d'en face (65 octets).</summary>
        public byte[] Secret(byte[] publiqueDistante)
        {
            if (publiqueDistante.Length != 65 || publiqueDistante[0] != 4) throw new SynchroException("Clé éphémère invalide.");
            var blob = new byte[72];
            blob[0] = 0x45; blob[1] = 0x43; blob[2] = 0x4B; blob[3] = 0x31; // "ECK1" : BCRYPT_ECDH_PUBLIC_P256_MAGIC
            blob[4] = 32;
            Array.Copy(publiqueDistante, 1, blob, 8, 64);
            using (var distante = ECDiffieHellmanCngPublicKey.FromByteArray(blob, CngKeyBlobFormat.EccPublicBlob))
                return ecdh.DeriveKeyMaterial(distante);
        }

        public void Dispose() { ecdh.Dispose(); }
    }

    /// <summary>
    /// Appairage MSYN1, côté calcul : les deux rôles, sans réseau, pour être testés en
    /// boucle locale. Le code n'est pas un secret saisi des deux côtés mais une valeur
    /// dérivée de l'échange (engagement + ECDH), affichée par le PC et comparée par le
    /// téléphone : un intrus actif a une chance sur 10⁶, et aucune attaque hors-ligne.
    /// </summary>
    sealed class Appairage : IDisposable
    {
        static readonly byte[] EtiquetteCode = Encoding.ASCII.GetBytes("MSYN1 code");
        static readonly byte[] EtiquetteTel = Encoding.ASCII.GetBytes("MSYN1 tel");
        static readonly byte[] EtiquettePc = Encoding.ASCII.GetBytes("MSYN1 pc");

        readonly CleEphemere mienne = new CleEphemere();
        readonly byte[] monNonce = Reseau.Aleatoire(16);
        readonly byte[] empreintePc, empreinteTel;
        byte[] engagementRecu, publiqueDistante, nonceDistant, k;

        /// <summary>Les empreintes des deux certificats, telles que vues dans la connexion TLS.</summary>
        public Appairage(byte[] empreintePc, byte[] empreinteTel)
        {
            this.empreintePc = empreintePc;
            this.empreinteTel = empreinteTel;
        }

        // --- Téléphone ---

        /// <summary>APP1 : engagement SHA-256(E_t ‖ N_t).</summary>
        public byte[] TelEngagement()
        {
            return Reseau.Sha256(mienne.Publique, monNonce);
        }

        /// <summary>APP3 : E_t ‖ N_t, après réception d'APP2.</summary>
        public byte[] TelReveler(byte[] app2)
        {
            if (app2.Length != 81) throw new SynchroException("Appairage : message APP2 invalide.");
            publiqueDistante = Trame.Tranche(app2, 0, 65);
            nonceDistant = Trame.Tranche(app2, 65, 16);
            k = mienne.Secret(publiqueDistante);
            return Reseau.Concat(mienne.Publique, monNonce);
        }

        /// <summary>Vrai si le code tapé par l'utilisateur est celui calculé ici (temps constant).</summary>
        public bool TelVerifierCode(int codeSaisi)
        {
            byte[] attendu = BitConverter.GetBytes(Code());
            byte[] saisi = BitConverter.GetBytes(codeSaisi);
            return Coffre.ComparerConstant(attendu, saisi);
        }

        /// <summary>APP4 : preuve du téléphone.</summary>
        public byte[] TelPreuve()
        {
            return Reseau.Hmac(k, EtiquetteTel, monNonce, nonceDistant, empreintePc, empreinteTel); // N_t (le mien) ‖ N_p
        }

        /// <summary>Vérifie APP5 (preuve du PC) et en extrait le nom du PC.</summary>
        public string TelVerifierPc(byte[] app5)
        {
            if (app5.Length < 32) throw new SynchroException("Appairage : message APP5 invalide.");
            byte[] attendu = Reseau.Hmac(k, EtiquettePc, monNonce, nonceDistant, empreintePc, empreinteTel);
            if (!Coffre.ComparerConstant(attendu, Trame.Tranche(app5, 0, 32)))
                throw new SynchroException("Appairage : le PC n'a pas prouvé le code.");
            int i = 32;
            return Trame.LireChaine(app5, ref i);
        }

        // --- PC ---

        /// <summary>Reçoit APP1 et produit APP2 : E_p ‖ N_p.</summary>
        public byte[] PcRepondre(byte[] app1)
        {
            if (app1.Length != 32) throw new SynchroException("Appairage : message APP1 invalide.");
            engagementRecu = app1;
            return Reseau.Concat(mienne.Publique, monNonce);
        }

        /// <summary>Reçoit APP3, vérifie l'engagement, calcule K : le code est alors disponible.</summary>
        public void PcRecevoir(byte[] app3)
        {
            if (app3.Length != 81) throw new SynchroException("Appairage : message APP3 invalide.");
            publiqueDistante = Trame.Tranche(app3, 0, 65);
            nonceDistant = Trame.Tranche(app3, 65, 16);
            if (!Coffre.ComparerConstant(engagementRecu, Reseau.Sha256(publiqueDistante, nonceDistant)))
                throw new SynchroException("Appairage : l'engagement du téléphone ne correspond pas.");
            k = mienne.Secret(publiqueDistante);
        }

        /// <summary>Vérifie APP4 (preuve du téléphone) en temps constant.</summary>
        public bool PcVerifierTel(byte[] app4)
        {
            if (app4.Length != 32) return false;
            byte[] attendu = Reseau.Hmac(k, EtiquetteTel, nonceDistant, monNonce, empreintePc, empreinteTel);
            return Coffre.ComparerConstant(attendu, app4);
        }

        /// <summary>APP5 : preuve du PC ‖ nom du PC.</summary>
        public byte[] PcPreuve(string nomPc)
        {
            return Reseau.Concat(Reseau.Hmac(k, EtiquettePc, nonceDistant, monNonce, empreintePc, empreinteTel), Trame.Chaine(nomPc));
        }

        // --- Commun ---

        /// <summary>Le code à 6 chiffres : HMAC(K, "MSYN1 code" ‖ N_t ‖ N_p ‖ F_p ‖ F_t), 4 premiers octets mod 10⁶.</summary>
        public int Code()
        {
            if (k == null) throw new InvalidOperationException("échange incomplet");
            byte[] nt, np;
            Roles(out nt, out np);
            byte[] h = Reseau.Hmac(k, EtiquetteCode, nt, np, empreintePc, empreinteTel);
            return (int)(Trame.LireUint32(h, 0) % 1000000);
        }

        // Le PC appelle PcRepondre, le téléphone TelReveler : on sait donc quel rôle on joue
        // et dans quel ordre ranger N_t et N_p.
        void Roles(out byte[] nt, out byte[] np)
        {
            if (engagementRecu != null) { np = monNonce; nt = nonceDistant; } // je suis le PC
            else { nt = monNonce; np = nonceDistant; }                          // je suis le téléphone
        }

        public void Dispose()
        {
            mienne.Dispose();
            if (k != null) Array.Clear(k, 0, k.Length);
            Array.Clear(monNonce, 0, monNonce.Length);
        }
    }

    /// <summary>Un appareil appairé : nom, empreinte de son certificat, dernières adresses vues.</summary>
    class AppareilAppaire
    {
        public string Nom;
        public byte[] Empreinte;
        public List<string> Adresses = new List<string>();
        public byte[] DernierEchange = new byte[32]; // empreinte du coffre au dernier échange réussi (zéros = jamais)
    }

    /// <summary>
    /// Annuaire des appareils appairés, dans %APPDATA%\Mithril\appareils.mithril sous DPAPI :
    /// rien de secret dedans, mais un intrus qui pourrait y ajouter une empreinte se ferait
    /// passer pour un téléphone, d'où le scellement.
    /// </summary>
    class Annuaire
    {
        static readonly byte[] Entropie = Encoding.ASCII.GetBytes("Mithril.Annuaire.v1");
        readonly string chemin;
        public readonly List<AppareilAppaire> Appareils = new List<AppareilAppaire>();

        public Annuaire(string dossier)
        {
            chemin = Path.Combine(dossier, "appareils.mithril");
            Charger();
        }

        public AppareilAppaire Trouver(byte[] empreinte)
        {
            foreach (var a in Appareils)
                if (Coffre.ComparerConstant(a.Empreinte, empreinte)) return a;
            return null;
        }

        public void Ajouter(AppareilAppaire appareil)
        {
            var existant = Trouver(appareil.Empreinte);
            if (existant != null) Appareils.Remove(existant);
            Appareils.Add(appareil);
            Sauver();
        }

        public void Retirer(byte[] empreinte)
        {
            var existant = Trouver(empreinte);
            if (existant != null) { Appareils.Remove(existant); Sauver(); }
        }

        void Charger()
        {
            if (!File.Exists(chemin)) return;
            byte[] clair;
            try { clair = ProtectedData.Unprotect(File.ReadAllBytes(chemin), Entropie, DataProtectionScope.CurrentUser); }
            catch (CryptographicException) { return; } // fichier d'une autre session : ignoré, on repartira de zéro
            try
            {
                int i = 0;
                int n = (int)Trame.LireUint32(clair, i); i += 4;
                for (int a = 0; a < n; a++)
                {
                    var app = new AppareilAppaire();
                    app.Nom = Trame.LireChaine(clair, ref i);
                    app.Empreinte = Trame.Tranche(clair, i, 32); i += 32;
                    app.DernierEchange = Trame.Tranche(clair, i, 32); i += 32;
                    int na = clair[i++];
                    for (int j = 0; j < na; j++) app.Adresses.Add(Trame.LireChaine(clair, ref i));
                    Appareils.Add(app);
                }
            }
            catch (SynchroException) { Appareils.Clear(); }
            finally { Array.Clear(clair, 0, clair.Length); }
        }

        public void Sauver()
        {
            using (var flux = new MemoryStream())
            {
                var n = new byte[4];
                Trame.EcrireUint32(n, 0, (uint)Appareils.Count);
                flux.Write(n, 0, 4);
                foreach (var app in Appareils)
                {
                    byte[] nom = Trame.Chaine(app.Nom);
                    flux.Write(nom, 0, nom.Length);
                    flux.Write(app.Empreinte, 0, 32);
                    flux.Write(app.DernierEchange, 0, 32);
                    flux.WriteByte((byte)Math.Min(app.Adresses.Count, 255));
                    for (int j = 0; j < Math.Min(app.Adresses.Count, 255); j++)
                    {
                        byte[] adr = Trame.Chaine(app.Adresses[j]);
                        flux.Write(adr, 0, adr.Length);
                    }
                }
                byte[] scelle = ProtectedData.Protect(flux.ToArray(), Entropie, DataProtectionScope.CurrentUser);
                Directory.CreateDirectory(Path.GetDirectoryName(chemin));
                string temporaire = chemin + ".tmp";
                File.WriteAllBytes(temporaire, scelle);
                if (File.Exists(chemin)) File.Replace(temporaire, chemin, null);
                else File.Move(temporaire, chemin);
            }
        }
    }

    /// <summary>État d'un coffre tel qu'échangé dans `ETAT`.</summary>
    struct EtatCoffre
    {
        public byte[] Empreinte;       // zéros = pas de coffre
        public byte[] DernierEchange;  // zéros = jamais échangé avec cet appareil
        public uint Taille;
        public long Mtime;             // ms UTC

        public bool Absent { get { return EstNul(Empreinte); } }
        public bool Modifie { get { return !Absent && !Coffre.ComparerConstant(Empreinte, DernierEchange); } }

        public static bool EstNul(byte[] t)
        {
            foreach (byte b in t) if (b != 0) return false;
            return true;
        }

        public byte[] Encoder()
        {
            var t = new byte[32 + 32 + 4 + 8];
            Array.Copy(Empreinte, 0, t, 0, 32);
            Array.Copy(DernierEchange, 0, t, 32, 32);
            Trame.EcrireUint32(t, 64, Taille);
            for (int i = 0; i < 8; i++) t[68 + i] = (byte)(Mtime >> (56 - 8 * i));
            return t;
        }

        public static EtatCoffre Decoder(byte[] t)
        {
            if (t.Length != 76) throw new SynchroException("Message ETAT invalide (" + t.Length + " octets au lieu de 76).");
            var e = new EtatCoffre();
            e.Empreinte = Trame.Tranche(t, 0, 32);
            e.DernierEchange = Trame.Tranche(t, 32, 32);
            e.Taille = Trame.LireUint32(t, 64);
            long m = 0;
            for (int i = 0; i < 8; i++) m = (m << 8) | t[68 + i];
            e.Mtime = m;
            return e;
        }

        /// <summary>Lit l'état du fichier sur disque (absent → empreinte nulle).</summary>
        public static EtatCoffre Lire(string chemin, byte[] dernierEchange)
        {
            var e = new EtatCoffre { Empreinte = new byte[32], DernierEchange = dernierEchange ?? new byte[32] };
            if (chemin != null && File.Exists(chemin))
            {
                byte[] contenu = File.ReadAllBytes(chemin);
                e.Empreinte = Reseau.Sha256(contenu);
                e.Taille = (uint)contenu.Length;
                e.Mtime = VersMs(File.GetLastWriteTimeUtc(chemin));
            }
            return e;
        }

        static readonly DateTime Epoque = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        public static long VersMs(DateTime utc) { return (long)(utc - Epoque).TotalMilliseconds; }
        public static DateTime DepuisMs(long ms) { return Epoque.AddMilliseconds(ms); }
    }

    /// <summary>Ce que la synchronisation a décidé, identique des deux côtés.</summary>
    enum Decision { Rien, JEnvoie, JeRecois, ConflitJEnvoie, ConflitJeRecois }

    /// <summary>
    /// Moteur de synchronisation du PC : écoute TCP (TLS mutuel), répond à la découverte UDP,
    /// conduit l'appairage et l'échange du coffre. Une connexion = un fil, une session à la
    /// fois par appareil. Tout ce qui est décidé ici l'est par les règles de docs/SYNCHRO.md.
    /// </summary>
    sealed class Synchroniseur : IDisposable
    {
        readonly string dossierMithril;
        readonly X509Certificate2 identite;
        readonly byte[] monEmpreinte;
        readonly Annuaire annuaire;
        readonly Func<string> cheminCoffre; // le coffre synchronisé courant (peut changer)
        readonly string nom;
        readonly int port;
        readonly object verrou = new object();

        TcpListener ecoute;
        UdpClient decouverte;
        volatile bool actif;
        DateTime finAppairage = DateTime.MinValue;
        int echecsAppairage;
        readonly HashSet<string> sessionsEnCours = new HashSet<string>();
        int connexionsActives;
        const int ConnexionsMax = 8;
        bool appairageEnCours;

        /// <summary>Message d'information (faux) ou d'alerte (vrai) pour l'utilisateur, depuis un fil d'arrière-plan.</summary>
        public event Action<string, bool> Journal;
        /// <summary>Code à afficher pendant un appairage, ou -1 quand il n'y a plus rien à afficher.</summary>
        public event Action<int> CodeAppairage;
        /// <summary>Un appareil vient d'être appairé.</summary>
        public event Action<AppareilAppaire> Appaire;
        /// <summary>Le coffre sur disque vient d'être remplacé par la version d'un appareil.</summary>
        public event Action<AppareilAppaire> CoffreRecu;

        public Synchroniseur(string dossierMithril, string nom, Func<string> cheminCoffre)
            : this(dossierMithril, nom, cheminCoffre, Identite.NomCle, Reseau.Port) { }

        /// <summary>Variante pour le banc : nom de clé et port choisis (0 = port libre).</summary>
        public Synchroniseur(string dossierMithril, string nom, Func<string> cheminCoffre, string nomCle, int port)
        {
            this.dossierMithril = dossierMithril;
            this.nom = nom;
            this.cheminCoffre = cheminCoffre;
            this.port = port;
            try { identite = Identite.Charger(dossierMithril, nomCle); }
            catch (CryptographicException ex) { throw new SynchroException("identité impossible à créer (" + ex.Message + ")."); }
            catch (IOException ex) { throw new SynchroException("identité impossible à enregistrer (" + ex.Message + ")."); }
            monEmpreinte = Identite.Empreinte(identite);
            annuaire = new Annuaire(dossierMithril);
        }

        public Annuaire Annuaire { get { return annuaire; } }
        public byte[] Empreinte { get { return monEmpreinte; } }
        public string Nom { get { return nom; } }
        public int PortEcoute { get { return ecoute == null ? port : ((IPEndPoint)ecoute.LocalEndpoint).Port; } }
        public int PortDecouverte { get { return decouverte == null ? -1 : ((IPEndPoint)decouverte.Client.LocalEndPoint).Port; } }
        public bool AppairageOuvert { get { return DateTime.UtcNow < finAppairage; } }

        /// <summary>Ouvre l'écoute TCP et la réponse à la découverte. Le pare-feu Windows demande
        /// l'autorisation ici, la première fois.</summary>
        public void Demarrer(bool boucleLocaleSeulement)
        {
            if (actif) return;
            actif = true;
            IPAddress liaison = boucleLocaleSeulement ? IPAddress.Loopback : IPAddress.Any;
            ecoute = new TcpListener(liaison, port);
            try { ecoute.Start(); }
            catch (SocketException) { actif = false; throw new SynchroException("le port " + port + " est déjà utilisé."); }
            var filEcoute = new Thread(BoucleEcoute);
            filEcoute.IsBackground = true;
            filEcoute.Name = "Mithril.Synchro.Ecoute";
            filEcoute.Start();
            {
                try
                {
                    decouverte = new UdpClient(new IPEndPoint(liaison, port));
                    var filDecouverte = new Thread(BoucleDecouverte);
                    filDecouverte.IsBackground = true;
                    filDecouverte.Name = "Mithril.Synchro.Decouverte";
                    filDecouverte.Start();
                }
                catch (SocketException) { decouverte = null; } // port UDP pris : la découverte manquera, pas la synchro
            }
        }

        public void Arreter()
        {
            actif = false;
            try { if (ecoute != null) ecoute.Stop(); } catch (SocketException) { }
            try { if (decouverte != null) decouverte.Close(); } catch (SocketException) { }
        }

        /// <summary>Accepte les appairages pendant deux minutes (ou jusqu'à trois échecs).</summary>
        public void OuvrirAppairage()
        {
            lock (verrou) { finAppairage = DateTime.UtcNow.AddMinutes(2); echecsAppairage = 0; }
        }

        public void FermerAppairage()
        {
            lock (verrou) { finAppairage = DateTime.MinValue; }
        }

        void Dire(string message, bool alerte)
        {
            var j = Journal;
            if (j != null) j(message, alerte);
        }

        // --- Découverte ---

        void BoucleDecouverte()
        {
            while (actif)
            {
                IPEndPoint de = null;
                byte[] paquet;
                try { paquet = decouverte.Receive(ref de); }
                catch (SocketException) { continue; }
                catch (ObjectDisposedException) { return; }
                if (!Reseau.EstAdressePrivee(de.Address)) continue;
                if ((paquet.Length != 20 && paquet.Length != 52) || paquet[0] != 'D' || paquet[1] != 'E' || paquet[2] != 'C' || paquet[3] != 'O') continue;
                // Hors appairage, on ne répond qu'à qui nous cherche déjà par notre empreinte : un
                // inconnu qui balaie le réseau n'apprend ni le nom du PC ni la présence de Mithril.
                bool cible = paquet.Length == 52 && Coffre.ComparerConstant(Trame.Tranche(paquet, 20, 32), monEmpreinte);
                if (!cible && !AppairageOuvert) continue;
                int p = PortEcoute;
                byte[] reponse = Reseau.Concat(
                    Encoding.ASCII.GetBytes("DECO"), Trame.Tranche(paquet, 4, 16), Trame.Chaine(nom), monEmpreinte,
                    new[] { (byte)(p >> 8), (byte)p });
                try { decouverte.Send(reponse, reponse.Length, de); } catch (SocketException) { }
            }
        }

        // --- Écoute ---

        void BoucleEcoute()
        {
            while (actif)
            {
                TcpClient client;
                try { client = ecoute.AcceptTcpClient(); }
                catch (SocketException) { continue; }
                catch (ObjectDisposedException) { return; }
                catch (InvalidOperationException) { return; }
                if (Interlocked.Increment(ref connexionsActives) > ConnexionsMax)
                {
                    // Plafond : un voisin qui ouvre des connexions en rafale n'épuise ni fils ni mémoire.
                    Interlocked.Decrement(ref connexionsActives);
                    try { client.Close(); } catch (SocketException) { }
                    continue;
                }
                var fil = new Thread(delegate() { try { Servir(client); } finally { Interlocked.Decrement(ref connexionsActives); } });
                fil.IsBackground = true;
                fil.Name = "Mithril.Synchro.Session";
                fil.Start();
            }
        }

        void Servir(TcpClient client)
        {
            string cle = null;
            try
            {
                var distant = (IPEndPoint)client.Client.RemoteEndPoint;
                if (!Reseau.EstAdressePrivee(distant.Address)) return; // fermé sans lire un octet
                Dire("Connexion reçue de " + distant.Address + ", poignée de main TLS…", false);
                client.ReceiveTimeout = Reseau.DelaiPoigneeMs;
                client.SendTimeout = Reseau.DelaiTrameMs;

                X509Certificate2 certificatDistant = null;
                using (var tls = new SslStream(client.GetStream(), false,
                    delegate(object s, X509Certificate c, X509Chain ch, SslPolicyErrors e)
                    {
                        // Validation par empreinte, jamais par le magasin système : on accepte ici
                        // pour décider juste après, d'après l'annuaire.
                        certificatDistant = c == null ? null : new X509Certificate2(c);
                        return c != null;
                    }))
                {
                    tls.AuthenticateAsServer(identite, true, (SslProtocols)3072 /* Tls12 */, false);
                    client.ReceiveTimeout = Reseau.DelaiTrameMs;
                    if (certificatDistant == null || !tls.IsMutuallyAuthenticated)
                    {
                        Dire("Poignée de main TLS sans certificat du téléphone (" + (certificatDistant == null ? "aucun certificat" : "non mutuelle") + ", " + tls.SslProtocol + ", " + tls.CipherAlgorithm + ").", true);
                        return;
                    }
                    byte[] empreinteDistante = Identite.Empreinte(certificatDistant);
                    cle = Convert.ToBase64String(empreinteDistante);

                    lock (verrou)
                    {
                        // Une session à la fois par appareil : la précédente finit de se clore (annuaire
                        // à écrire) pendant que le téléphone se reconnecte déjà ; on patiente un peu.
                        DateTime limite = DateTime.UtcNow.AddMilliseconds(Reseau.DelaiPoigneeMs);
                        while (sessionsEnCours.Contains(cle))
                        {
                            int reste = (int)(limite - DateTime.UtcNow).TotalMilliseconds;
                            if (reste <= 0) return;
                            Monitor.Wait(verrou, reste);
                        }
                        sessionsEnCours.Add(cle);
                    }

                    var appareil = annuaire.Trouver(empreinteDistante);
                    if (appareil != null)
                    {
                        appareil.Adresses.Remove(distant.Address.ToString());
                        appareil.Adresses.Insert(0, distant.Address.ToString());
                        Session(tls, appareil);
                    }
                    else if (AppairageOuvert)
                    {
                        lock (verrou) { if (appairageEnCours) return; appairageEnCours = true; } // un seul code affiché à la fois
                        try { Appairer(tls, empreinteDistante, distant.Address.ToString()); }
                        finally { lock (verrou) appairageEnCours = false; }
                    }
                    else Dire("Un appareil inconnu (" + distant.Address + ") a tenté de se connecter. Pour l'appairer : Portable… → Synchroniser avec un téléphone → Appairer.", true);
                }
            }
            catch (SynchroException ex) { Dire("Synchronisation : " + ex.Message, true); }
            catch (IOException ex) { Dire("Connexion coupée pendant l'échange : " + (ex.InnerException != null ? ex.InnerException.Message : ex.Message), true); }
            catch (AuthenticationException ex) { Dire("Poignée de main TLS refusée : " + (ex.InnerException != null ? ex.InnerException.Message : ex.Message), true); }
            catch (SocketException) { }
            catch (ObjectDisposedException) { }
            finally
            {
                if (cle != null) lock (verrou) { sessionsEnCours.Remove(cle); Monitor.PulseAll(verrou); }
                try { client.Close(); } catch (SocketException) { }
            }
        }

        // --- Appairage (rôle PC) ---

        void Appairer(SslStream flux, byte[] empreinteTel, string adresse)
        {
            using (var app = new Appairage(monEmpreinte, empreinteTel))
            {
                string type;
                byte[] app1 = Trame.Lire(flux, out type);
                if (type != "APP1") throw new SynchroException("appairage : APP1 attendu.");
                Trame.Ecrire(flux, "APP2", app.PcRepondre(app1));
                byte[] app3 = Trame.Lire(flux, out type);
                if (type != "APP3") throw new SynchroException("appairage : APP3 attendu.");
                app.PcRecevoir(app3);

                int code = app.Code();
                var montrer = CodeAppairage;
                if (montrer != null) montrer(code);
                try
                {
                    // L'utilisateur tape le code sur le téléphone : jusqu'à deux minutes.
                    flux.ReadTimeout = 120000;
                    byte[] app4 = Trame.Lire(flux, out type);
                    flux.ReadTimeout = Reseau.DelaiTrameMs;
                    bool ok = type == "APP4" && app.PcVerifierTel(app4);
                    if (!ok)
                    {
                        lock (verrou) { if (++echecsAppairage >= 3) finAppairage = DateTime.MinValue; }
                        Dire("Appairage refusé : le code ne correspond pas.", true);
                        return;
                    }
                    Trame.Ecrire(flux, "APP5", app.PcPreuve(nom));
                    byte[] nomTel = Trame.Lire(flux, out type);
                    if (type != "NOMT") throw new SynchroException("appairage : NOMT attendu.");
                    int i = 0;
                    var appareil = new AppareilAppaire();
                    appareil.Nom = Trame.LireChaine(nomTel, ref i);
                    appareil.Empreinte = empreinteTel;
                    appareil.Adresses.Add(adresse);
                    annuaire.Ajouter(appareil);
                    lock (verrou) finAppairage = DateTime.MinValue;
                    var fait = Appaire;
                    if (fait != null) fait(appareil);
                    Dire("Appareil appairé : " + appareil.Nom + ".", false);
                }
                finally
                {
                    if (montrer != null) montrer(-1);
                }
            }
        }

        // --- Session (rôle PC, le téléphone parle en premier) ---

        void Session(Stream flux, AppareilAppaire appareil)
        {
            string type;
            byte[] chargeEtat = Trame.Lire(flux, out type);
            if (type != "ETAT") throw new SynchroException("session : ETAT attendu, reçu " + type + " (" + chargeEtat.Length + " octets).");
            var etatTel = EtatCoffre.Decoder(chargeEtat);
            string chemin = cheminCoffre();
            var etatPc = EtatCoffre.Lire(chemin, appareil.DernierEchange);
            Trame.Ecrire(flux, "ETAT", etatPc.Encoder());

            Decision decision = Decider(etatPc, etatTel);
            switch (decision)
            {
                case Decision.Rien:
                    if (!etatPc.Absent) MemoriserEchange(appareil, etatPc.Empreinte);
                    break;
                case Decision.JEnvoie:
                case Decision.ConflitJEnvoie:
                    Envoyer(flux, chemin, appareil, etatPc);
                    break;
                case Decision.JeRecois:
                case Decision.ConflitJeRecois:
                    Recevoir(flux, chemin, appareil, decision == Decision.ConflitJeRecois);
                    break;
            }
            Trame.Ecrire(flux, "ADRS", AdressesLocales());
            Trame.Ecrire(flux, "FINI", new byte[0]);
            annuaire.Sauver();
        }

        /// <summary>La règle de docs/SYNCHRO.md, du point de vue de « moi » face à « l'autre ».</summary>
        public static Decision Decider(EtatCoffre moi, EtatCoffre autre)
        {
            if (moi.Absent && autre.Absent) return Decision.Rien;
            if (moi.Absent) return Decision.JeRecois;
            if (autre.Absent) return Decision.JEnvoie;
            if (Coffre.ComparerConstant(moi.Empreinte, autre.Empreinte)) return Decision.Rien;
            bool moiModifie = moi.Modifie, autreModifie = autre.Modifie;
            if (moiModifie && !autreModifie) return Decision.JEnvoie;
            if (!moiModifie && autreModifie) return Decision.JeRecois;
            // Les deux modifiés — ou aucun, ce qui arrive au premier échange (dernier-echange
            // à zéro des deux côtés) ou si les annuaires se sont désaccordés : on tranche
            // comme un conflit, le plus récent gagne et l'autre est conservé. Rien ne se perd.
            return moi.Mtime >= autre.Mtime ? Decision.ConflitJEnvoie : Decision.ConflitJeRecois;
        }

        void Envoyer(Stream flux, string chemin, AppareilAppaire appareil, EtatCoffre etat)
        {
            byte[] contenu = File.ReadAllBytes(chemin);
            var charge = new byte[8 + contenu.Length];
            for (int i = 0; i < 8; i++) charge[i] = (byte)(etat.Mtime >> (56 - 8 * i));
            Array.Copy(contenu, 0, charge, 8, contenu.Length);
            Trame.Ecrire(flux, "FICH", charge);
            string type;
            byte[] accuse = Trame.Lire(flux, out type);
            if (type != "RECU" || accuse.Length != 32 || !Coffre.ComparerConstant(accuse, Reseau.Sha256(contenu)))
                throw new SynchroException("le téléphone n'a pas confirmé la réception.");
            MemoriserEchange(appareil, Reseau.Sha256(contenu));
            Dire("Coffre envoyé à " + appareil.Nom + ".", false);
        }

        void Recevoir(Stream flux, string chemin, AppareilAppaire appareil, bool conflit)
        {
            string type;
            byte[] charge = Trame.Lire(flux, out type);
            if (type != "FICH" || charge.Length < 8 + 77) throw new SynchroException("fichier attendu.");
            long mtime = 0;
            for (int i = 0; i < 8; i++) mtime = (mtime << 8) | charge[i];
            byte[] contenu = Trame.Tranche(charge, 8, charge.Length - 8);
            string magie = Encoding.ASCII.GetString(contenu, 0, 8);
            if ((magie != "MITHRIL3" && magie != "MITHRIL5") || contenu[8] != 1)
                throw new SynchroException("le fichier reçu n'est pas un coffre portable.");
            if (chemin == null) throw new SynchroException("aucun coffre synchronisé configuré sur ce PC.");

            Directory.CreateDirectory(Path.GetDirectoryName(chemin));
            if (conflit && File.Exists(chemin))
            {
                string garde = Path.Combine(Path.GetDirectoryName(chemin),
                    Path.GetFileNameWithoutExtension(chemin) + ".conflit-" + DateTime.Now.ToString("yyyyMMdd-HHmmss") + ".mithril");
                File.Copy(chemin, garde, true);
                PurgerConflits(Path.GetDirectoryName(chemin));
                Dire("Conflit avec " + appareil.Nom + " : ta version est conservée dans " + Path.GetFileName(garde) + ".", true);
            }
            string temporaire = chemin + ".tmp";
            File.WriteAllBytes(temporaire, contenu);
            File.SetLastWriteTimeUtc(temporaire, EtatCoffre.DepuisMs(mtime));
            if (File.Exists(chemin)) File.Replace(temporaire, chemin, chemin + ".bak");
            else File.Move(temporaire, chemin);
            Coffre.PoserReglesSynchro(Path.GetDirectoryName(chemin));

            byte[] empreinte = Reseau.Sha256(contenu);
            Trame.Ecrire(flux, "RECU", empreinte);
            MemoriserEchange(appareil, empreinte);
            var recu = CoffreRecu;
            if (recu != null) recu(appareil);
            Dire("Coffre reçu de " + appareil.Nom + ".", false);
        }

        /// <summary>Les fichiers de conflit sont une sécurité, pas une archive : ceux de plus de 30 jours partent.</summary>
        static void PurgerConflits(string dossier)
        {
            try
            {
                foreach (string f in Directory.GetFiles(dossier, "*.conflit-*.mithril"))
                    if (File.GetLastWriteTimeUtc(f) < DateTime.UtcNow.AddDays(-30)) File.Delete(f);
            }
            catch (IOException) { }
            catch (UnauthorizedAccessException) { }
        }

        static void MemoriserEchange(AppareilAppaire appareil, byte[] empreinte)
        {
            appareil.DernierEchange = (byte[])empreinte.Clone();
        }

        byte[] AdressesLocales()
        {
            var liste = new List<string>();
            try
            {
                foreach (var iface in NetworkInterface.GetAllNetworkInterfaces())
                {
                    if (iface.OperationalStatus != OperationalStatus.Up) continue;
                    foreach (var u in iface.GetIPProperties().UnicastAddresses)
                        if (u.Address.AddressFamily == AddressFamily.InterNetwork && Reseau.EstAdressePrivee(u.Address)
                            && !IPAddress.IsLoopback(u.Address))
                            liste.Add(u.Address.ToString());
                }
            }
            catch (NetworkInformationException) { }
            using (var flux = new MemoryStream())
            {
                flux.WriteByte((byte)Math.Min(liste.Count, 255));
                for (int i = 0; i < Math.Min(liste.Count, 255); i++)
                {
                    byte[] a = Trame.Chaine(liste[i]);
                    flux.Write(a, 0, a.Length);
                }
                return flux.ToArray();
            }
        }

        public void Dispose()
        {
            Arreter();
            identite.Dispose();
        }
    }
}
