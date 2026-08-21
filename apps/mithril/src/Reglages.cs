using System;
using System.IO;
using System.Text;
using System.Windows.Forms;
using Microsoft.Win32;

namespace Mithril
{
    /// <summary>
    /// Réglages de l'application, dans %APPDATA%\Mithril\reglages.mithril (texte clé=valeur,
    /// NON chiffré : ne contient aucun secret). Chargés une fois au démarrage ; les lectures
    /// se font sur Reglages.Actuels au moment de l'usage, donc la plupart prennent effet
    /// immédiatement après Sauver().
    /// </summary>
    class Reglages
    {
        // Sécurité du coffre
        public int VerrouInactiviteMin = 5;    // 0 = jamais
        public bool VerrouSession = true;
        public bool VerrouReduction = false;
        public int IterationsMaitre = 600000;  // appliqué à la prochaine définition du maître

        // Presse-papiers
        public int VidagePressePapiersS = 60;  // 0 = jamais

        // Frappe automatique
        public uint RaccourciMods = 0x0002 | 0x0001; // MOD_CONTROL | MOD_ALT
        public uint RaccourciTouche = 0x4D;           // 'M'
        public bool SequenceIdentifiant = true;
        public bool ValiderEntree = false;
        public int VitesseFrappeMs = 6;               // délai entre caractères
        public bool ApprendreIcones = true;

        // Application
        public bool DemarrerAvecWindows = false;
        public bool FermerReduit = true;

        public static Reglages Actuels = Charger();

        static string Chemin
        {
            get
            {
                return Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                    "Mithril", "reglages.mithril");
            }
        }

        public static Reglages Charger()
        {
            var r = new Reglages();
            try
            {
                if (!File.Exists(Chemin)) return r;
                foreach (string ligne in File.ReadAllLines(Chemin, Encoding.UTF8))
                {
                    string l = ligne.Trim();
                    if (l.Length == 0 || l[0] == '#') continue;
                    int i = l.IndexOf('=');
                    if (i <= 0) continue;
                    r.Appliquer(l.Substring(0, i).Trim(), l.Substring(i + 1).Trim());
                }
            }
            catch { /* fichier illisible : on garde les défauts */ }
            return r;
        }

        void Appliquer(string cle, string val)
        {
            switch (cle)
            {
                case "verrou_inactivite_min": VerrouInactiviteMin = EntierOu(val, VerrouInactiviteMin); break;
                case "verrou_session": VerrouSession = BoolOu(val, VerrouSession); break;
                case "verrou_reduction": VerrouReduction = BoolOu(val, VerrouReduction); break;
                case "iterations_maitre": IterationsMaitre = EntierOu(val, IterationsMaitre); break;
                case "vidage_presse_papiers_s": VidagePressePapiersS = EntierOu(val, VidagePressePapiersS); break;
                case "raccourci_mods": RaccourciMods = UintOu(val, RaccourciMods); break;
                case "raccourci_touche": RaccourciTouche = UintOu(val, RaccourciTouche); break;
                case "sequence_identifiant": SequenceIdentifiant = BoolOu(val, SequenceIdentifiant); break;
                case "valider_entree": ValiderEntree = BoolOu(val, ValiderEntree); break;
                case "vitesse_frappe_ms": VitesseFrappeMs = EntierOu(val, VitesseFrappeMs); break;
                case "apprendre_icones": ApprendreIcones = BoolOu(val, ApprendreIcones); break;
                case "demarrer_avec_windows": DemarrerAvecWindows = BoolOu(val, DemarrerAvecWindows); break;
                case "fermer_reduit": FermerReduit = BoolOu(val, FermerReduit); break;
            }
        }

        public void Sauver()
        {
            try
            {
                Directory.CreateDirectory(Path.GetDirectoryName(Chemin));
                var sb = new StringBuilder();
                sb.AppendLine("# Réglages Mithril — texte clair, aucun secret ici.");
                sb.AppendLine("verrou_inactivite_min=" + VerrouInactiviteMin);
                sb.AppendLine("verrou_session=" + (VerrouSession ? "1" : "0"));
                sb.AppendLine("verrou_reduction=" + (VerrouReduction ? "1" : "0"));
                sb.AppendLine("iterations_maitre=" + IterationsMaitre);
                sb.AppendLine("vidage_presse_papiers_s=" + VidagePressePapiersS);
                sb.AppendLine("raccourci_mods=" + RaccourciMods);
                sb.AppendLine("raccourci_touche=" + RaccourciTouche);
                sb.AppendLine("sequence_identifiant=" + (SequenceIdentifiant ? "1" : "0"));
                sb.AppendLine("valider_entree=" + (ValiderEntree ? "1" : "0"));
                sb.AppendLine("vitesse_frappe_ms=" + VitesseFrappeMs);
                sb.AppendLine("apprendre_icones=" + (ApprendreIcones ? "1" : "0"));
                sb.AppendLine("demarrer_avec_windows=" + (DemarrerAvecWindows ? "1" : "0"));
                sb.AppendLine("fermer_reduit=" + (FermerReduit ? "1" : "0"));
                File.WriteAllText(Chemin, sb.ToString(), Encoding.UTF8);
            }
            catch { /* disque non inscriptible : réglages non persistés, sans planter */ }
        }

        /// <summary>Copie de travail pour la fenêtre de réglages (annulable).</summary>
        public Reglages Copie()
        {
            return (Reglages)MemberwiseClone();
        }

        /// <summary>Inscrit ou retire Mithril du démarrage de Windows (HKCU\...\Run).</summary>
        public void AppliquerDemarrage()
        {
            try
            {
                using (var cle = Registry.CurrentUser.OpenSubKey(
                    @"Software\Microsoft\Windows\CurrentVersion\Run", true))
                {
                    if (cle == null) return;
                    if (DemarrerAvecWindows)
                        cle.SetValue("Mithril", "\"" + Application.ExecutablePath + "\"");
                    else
                        cle.DeleteValue("Mithril", false);
                }
            }
            catch { }
        }

        /// <summary>« Ctrl+Alt+M » à partir des modificateurs Win32 et du code de touche virtuel.</summary>
        public static string DecrireRaccourci(uint mods, uint touche)
        {
            var sb = new StringBuilder();
            if ((mods & 0x0002) != 0) sb.Append("Ctrl+");
            if ((mods & 0x0001) != 0) sb.Append("Alt+");
            if ((mods & 0x0004) != 0) sb.Append("Maj+");
            if ((mods & 0x0008) != 0) sb.Append("Win+");
            sb.Append(((Keys)touche).ToString());
            return sb.ToString();
        }

        static int EntierOu(string s, int d) { int v; return int.TryParse(s, out v) ? v : d; }
        static uint UintOu(string s, uint d) { uint v; return uint.TryParse(s, out v) ? v : d; }
        static bool BoolOu(string s, bool d)
        {
            if (s == "1" || s.Equals("true", StringComparison.OrdinalIgnoreCase)) return true;
            if (s == "0" || s.Equals("false", StringComparison.OrdinalIgnoreCase)) return false;
            return d;
        }
    }
}
