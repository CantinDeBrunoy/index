using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;

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
            foreach (char c in type) if (c < 'A' || c > 'Z') throw new SynchroException("Trame invalide.");
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
}
