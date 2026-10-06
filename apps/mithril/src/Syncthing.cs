using System;
using System.IO;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;

namespace Mithril
{
    /// <summary>
    /// Lecture, sans aucun réseau, de ce que Syncthing a laissé sur ce PC : son certificat
    /// (d'où l'on dérive l'identifiant d'appareil, exactement comme Syncthing le fait) et
    /// son nom local. Mithril n'appelle jamais Syncthing : il lit deux fichiers, c'est tout.
    /// </summary>
    static class Syncthing
    {
        /// <summary>Dossier de configuration de Syncthing sous Windows, ou null s'il n'existe pas.</summary>
        public static string DossierConfiguration()
        {
            string[] candidats = {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Syncthing"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Syncthing"),
            };
            foreach (string d in candidats)
                if (File.Exists(Path.Combine(d, "cert.pem"))) return d;
            return null;
        }

        /// <summary>Identifiant d'appareil du Syncthing local (« XXXXXXX-XXXXXXX-… », 63 caractères),
        /// ou null si Syncthing n'est pas installé pour cet utilisateur.</summary>
        public static string IdentifiantLocal()
        {
            string dossier = DossierConfiguration();
            if (dossier == null) return null;
            try
            {
                byte[] der = LireCertificatDer(File.ReadAllText(Path.Combine(dossier, "cert.pem")));
                return IdentifiantDepuisCertificat(der);
            }
            catch (IOException) { return null; }
            catch (FormatException) { return null; }
            catch (CryptographicException) { return null; }
        }

        /// <summary>Nom que Syncthing donne à ce PC dans config.xml, ou le nom de la machine.</summary>
        public static string NomLocal(string identifiant)
        {
            string dossier = DossierConfiguration();
            if (dossier != null && identifiant != null)
            {
                try
                {
                    string xml = File.ReadAllText(Path.Combine(dossier, "config.xml"));
                    int i = xml.IndexOf("id=\"" + identifiant + "\"", StringComparison.Ordinal);
                    if (i >= 0)
                    {
                        int n = xml.IndexOf("name=\"", i, StringComparison.Ordinal);
                        int fin = n >= 0 ? xml.IndexOf('"', n + 6) : -1;
                        if (n >= 0 && fin > n && n - i < 200) return xml.Substring(n + 6, fin - n - 6);
                    }
                }
                catch (IOException) { }
            }
            return Environment.MachineName;
        }

        /// <summary>Adresse de l'interface web de Syncthing (config.xml, « gui/address »), par défaut 127.0.0.1:8384.</summary>
        public static string AdresseInterface()
        {
            string dossier = DossierConfiguration();
            if (dossier != null)
            {
                try
                {
                    string xml = File.ReadAllText(Path.Combine(dossier, "config.xml"));
                    int g = xml.IndexOf("<gui", StringComparison.Ordinal);
                    int a = g >= 0 ? xml.IndexOf("<address>", g, StringComparison.Ordinal) : -1;
                    int fin = a >= 0 ? xml.IndexOf("</address>", a, StringComparison.Ordinal) : -1;
                    if (a >= 0 && fin > a) return xml.Substring(a + 9, fin - a - 9);
                }
                catch (IOException) { }
            }
            return "127.0.0.1:8384";
        }

        // --- Dérivation de l'identifiant (protocole Syncthing) ---
        // SHA-256 du certificat DER → base32 sans bourrage (52 caractères) → 4 groupes de 13,
        // chacun suivi d'un caractère de contrôle Luhn mod 32 → 56 caractères, affichés par
        // 8 blocs de 7 séparés par des tirets.

        const string AlphabetBase32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

        public static byte[] LireCertificatDer(string pem)
        {
            const string debut = "-----BEGIN CERTIFICATE-----";
            const string fin = "-----END CERTIFICATE-----";
            int i = pem.IndexOf(debut, StringComparison.Ordinal);
            int j = pem.IndexOf(fin, StringComparison.Ordinal);
            if (i < 0 || j < 0) throw new FormatException("cert.pem : certificat introuvable.");
            string b64 = pem.Substring(i + debut.Length, j - i - debut.Length);
            return Convert.FromBase64String(b64.Replace("\r", "").Replace("\n", ""));
        }

        public static string IdentifiantDepuisCertificat(byte[] der)
        {
            byte[] empreinte;
            using (var sha = new SHA256Managed()) empreinte = sha.ComputeHash(der);
            string b32 = Base32(empreinte).Substring(0, 52);
            var sb = new StringBuilder(63);
            for (int g = 0; g < 4; g++)
            {
                string groupe = b32.Substring(g * 13, 13);
                sb.Append(groupe).Append(Luhn32(groupe));
            }
            string plat = sb.ToString(); // 56 caractères
            var sortie = new StringBuilder(63);
            for (int b = 0; b < 8; b++)
            {
                if (b > 0) sortie.Append('-');
                sortie.Append(plat, b * 7, 7);
            }
            return sortie.ToString();
        }

        static string Base32(byte[] donnees)
        {
            var sb = new StringBuilder((donnees.Length * 8 + 4) / 5);
            int tampon = 0, bits = 0;
            foreach (byte octet in donnees)
            {
                tampon = (tampon << 8) | octet;
                bits += 8;
                while (bits >= 5)
                {
                    sb.Append(AlphabetBase32[(tampon >> (bits - 5)) & 31]);
                    bits -= 5;
                }
            }
            if (bits > 0) sb.Append(AlphabetBase32[(tampon << (5 - bits)) & 31]);
            return sb.ToString();
        }

        /// <summary>Caractère de contrôle Luhn mod 32, tel que le calcule Syncthing (lib/protocol/luhn).</summary>
        public static char Luhn32(string groupe)
        {
            int facteur = 1, somme = 0, n = 32;
            foreach (char c in groupe)
            {
                int valeur = AlphabetBase32.IndexOf(c);
                if (valeur < 0) throw new FormatException("caractère hors base32 : " + c);
                int ajout = facteur * valeur;
                facteur = facteur == 2 ? 1 : 2;
                ajout = ajout / n + ajout % n;
                somme += ajout;
            }
            int reste = somme % n;
            return AlphabetBase32[(n - reste) % n];
        }
    }
}
