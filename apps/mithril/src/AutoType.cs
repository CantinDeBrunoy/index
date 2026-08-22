using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

namespace Mithril
{
    /// <summary>
    /// Frappe un texte dans la fenêtre au premier plan via SendInput, en Unicode
    /// (indépendant de la disposition clavier). N'envoie jamais Entrée : rien n'est validé
    /// sans l'utilisateur. Ne passe jamais par le presse-papiers.
    /// </summary>
    static class AutoType
    {
        // --- SendInput ---
        const uint INPUT_KEYBOARD = 1;
        const uint KEYEVENTF_KEYUP = 0x0002;
        const uint KEYEVENTF_UNICODE = 0x0004;
        const ushort VK_TAB = 0x09;
        const ushort VK_RETURN = 0x0D;

        /// <summary>Délai entre caractères (ms), réglable ; voir « Vitesse de frappe ».</summary>
        public static int DelaiCarMs = 6;

        [StructLayout(LayoutKind.Sequential)]
        struct INPUT
        {
            public uint type;
            public KEYBDINPUT ki;
            // Union COMBASE : le clavier est la plus petite variante ; on réserve la taille
            // de la plus grande (MOUSEINPUT = 5 entiers de 32 bits + 2 pointeurs).
            public int reserve1;
            public int reserve2;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct KEYBDINPUT
        {
            public ushort wVk;
            public ushort wScan;
            public uint dwFlags;
            public uint time;
            public IntPtr dwExtraInfo;
        }

        [DllImport("user32.dll", SetLastError = true)]
        static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

        [DllImport("user32.dll")]
        static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        static extern bool SetForegroundWindow(IntPtr fenetre);

        /// <summary>Redonne le premier plan à la cible juste avant la frappe (robustesse).</summary>
        public static void RamenerAuPremierPlan(IntPtr fenetre)
        {
            if (fenetre != IntPtr.Zero) SetForegroundWindow(fenetre);
        }

        [DllImport("user32.dll")]
        static extern int GetWindowText(IntPtr fenetre, StringBuilder texte, int max);

        [DllImport("user32.dll")]
        static extern uint GetWindowThreadProcessId(IntPtr fenetre, out uint idProcessus);

        /// <summary>Titre de la fenêtre actuellement au premier plan (pour affichage avant frappe).</summary>
        public static string TitreFenetreActive()
        {
            IntPtr fenetre = GetForegroundWindow();
            if (fenetre == IntPtr.Zero) return "";
            var tampon = new StringBuilder(512);
            GetWindowText(fenetre, tampon, tampon.Capacity);
            return tampon.ToString();
        }

        public static IntPtr FenetreActive() { return GetForegroundWindow(); }

        /// <summary>
        /// Une fenêtre appartenant à un processus élevé (admin) refuse l'injection de frappes
        /// depuis notre processus non élevé (UIPI). On le détecte pour prévenir au lieu
        /// d'échouer en silence : GetWindowThreadProcessId réussit mais l'ouverture du
        /// processus échoue avec ACCESS_DENIED.
        /// </summary>
        public static bool CibleProbablementElevee(IntPtr fenetre)
        {
            if (fenetre == IntPtr.Zero) return false;
            uint idProcessus;
            GetWindowThreadProcessId(fenetre, out idProcessus);
            if (idProcessus == 0) return false;
            const uint QUERY_LIMITED_INFORMATION = 0x1000;
            IntPtr h = OpenProcess(QUERY_LIMITED_INFORMATION, false, idProcessus);
            if (h != IntPtr.Zero) { CloseHandle(h); return false; }
            return Marshal.GetLastWin32Error() == 5; // ERROR_ACCESS_DENIED
        }

        [DllImport("kernel32.dll", SetLastError = true)]
        static extern IntPtr OpenProcess(uint acces, bool heriter, uint idProcessus);
        [DllImport("kernel32.dll")]
        static extern bool CloseHandle(IntPtr h);
        [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        static extern bool QueryFullProcessImageName(IntPtr processus, uint drapeaux, StringBuilder tampon, ref uint taille);

        static readonly string[] Navigateurs =
        {
            "chrome", "msedge", "firefox", "opera", "brave", "vivaldi", "iexplore", "arc", "librewolf"
        };

        /// <summary>Chemin de l'exécutable derrière une fenêtre, ou null si inaccessible.</summary>
        public static string CheminExecutable(IntPtr fenetre)
        {
            if (fenetre == IntPtr.Zero) return null;
            uint idProcessus;
            GetWindowThreadProcessId(fenetre, out idProcessus);
            if (idProcessus == 0) return null;
            const uint QUERY_LIMITED_INFORMATION = 0x1000;
            IntPtr h = OpenProcess(QUERY_LIMITED_INFORMATION, false, idProcessus);
            if (h == IntPtr.Zero) return null;
            try
            {
                var tampon = new StringBuilder(1024);
                uint taille = (uint)tampon.Capacity;
                return QueryFullProcessImageName(h, 0, tampon, ref taille) ? tampon.ToString() : null;
            }
            finally { CloseHandle(h); }
        }

        /// <summary>Vrai si l'exe est un navigateur connu (son icône ne dit rien du site visité).</summary>
        public static bool EstNavigateur(string cheminExe)
        {
            if (string.IsNullOrEmpty(cheminExe)) return false;
            string nom = Path.GetFileNameWithoutExtension(cheminExe).ToLowerInvariant();
            foreach (string b in Navigateurs) if (nom == b) return true;
            return false;
        }

        /// <summary>Icône de l'exe en PNG 32×32, ou null (échec, ou navigateur : peu utile).</summary>
        public static byte[] IconePng(string cheminExe)
        {
            if (string.IsNullOrEmpty(cheminExe) || EstNavigateur(cheminExe)) return null;
            try
            {
                using (Icon icone = Icon.ExtractAssociatedIcon(cheminExe))
                {
                    if (icone == null) return null;
                    using (var bitmap = new Bitmap(32, 32))
                    {
                        using (var g = Graphics.FromImage(bitmap))
                        {
                            g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                            g.DrawIcon(icone, new Rectangle(0, 0, 32, 32));
                        }
                        using (var flux = new MemoryStream())
                        {
                            bitmap.Save(flux, ImageFormat.Png);
                            return flux.ToArray();
                        }
                    }
                }
            }
            catch { return null; }
        }

        [DllImport("user32.dll")]
        static extern short GetAsyncKeyState(int touche);

        /// <summary>Échap enfoncée maintenant (sondage, sans avoir le focus clavier).</summary>
        public static bool EchapPresse()
        {
            return (GetAsyncKeyState(0x1B) & 0x8000) != 0; // VK_ESCAPE
        }

        /// <summary>
        /// Tape le texte caractère par caractère dans la fenêtre au premier plan.
        /// Retourne le nombre d'évènements clavier acceptés par Windows (0 = rien n'est passé).
        /// </summary>
        public static uint Taper(string texte)
        {
            return TaperSequence(null, texte, false);
        }

        /// <summary>
        /// Tape « identifiant &lt;Tab&gt; mot de passe » (identifiant ignoré si vide/nul), sans
        /// touche Entrée. La tabulation est une vraie touche VK_TAB (le caractère Unicode
        /// U+0009 ne déplace pas le focus dans la plupart des applications).
        ///
        /// Chaque caractère est envoyé séparément avec un court délai : un lot unique trop
        /// rapide sature certaines applications (navigateurs) qui en perdent une partie.
        /// À APPELER SUR UN THREAD D'ARRIÈRE-PLAN — les Sleep bloquent le thread appelant, et
        /// il ne faut pas reprendre le focus à la cible avant la fin de la frappe.
        /// </summary>
        public static uint TaperSequence(string identifiant, string motDePasse, bool validerEntree)
        {
            return TaperSequence(IntPtr.Zero, identifiant, motDePasse, validerEntree);
        }

        /// <summary>
        /// Même chose en s'assurant d'abord que <paramref name="cible"/> est bien au premier plan :
        /// après un dialogue de Mithril (phrase de passe, choix de l'entrée), le navigateur met
        /// quelques centaines de millisecondes à reprendre le focus et à remettre le curseur dans
        /// le champ ; taper avant, c'est perdre le début du texte.
        /// </summary>
        public static uint TaperSequence(IntPtr cible, string identifiant, string motDePasse, bool validerEntree)
        {
            if (cible != IntPtr.Zero)
            {
                var limite = DateTime.UtcNow.AddMilliseconds(1500);
                while (GetForegroundWindow() != cible && DateTime.UtcNow < limite)
                {
                    SetForegroundWindow(cible);
                    Thread.Sleep(50);
                }
                Thread.Sleep(150); // le temps que la cible replace son curseur
            }
            Thread.Sleep(60); // laisser le focus de la cible se stabiliser
            uint total = 0;
            if (!string.IsNullOrEmpty(identifiant))
            {
                total += TaperTexte(identifiant);
                total += EnvoyerDeux(EvenementTouche(VK_TAB, false), EvenementTouche(VK_TAB, true));
                Thread.Sleep(30);
            }
            if (!string.IsNullOrEmpty(motDePasse))
                total += TaperTexte(motDePasse);
            if (validerEntree && total > 0)
            {
                Thread.Sleep(30);
                total += EnvoyerDeux(EvenementTouche(VK_RETURN, false), EvenementTouche(VK_RETURN, true));
            }
            return total;
        }

        /// <summary>
        /// Deux stratégies, parce qu'aucune ne convient à toutes les pages. Espacée (délai > 0) :
        /// un caractère à la fois, ce qui laisse à la cible le temps de traiter chaque frappe.
        /// En un lot (délai 0) : tout le texte dans un seul SendInput, en quelques millisecondes —
        /// indispensable sur les formulaires web qui réimposent la valeur du champ à retardement
        /// (validation « debounce ») et écrasent ce qui a été tapé entre-temps ; vérifié dans Chrome.
        /// </summary>
        static uint TaperTexte(string texte)
        {
            if (DelaiCarMs <= 0)
            {
                var lot = new INPUT[texte.Length * 2];
                for (int i = 0; i < texte.Length; i++)
                {
                    lot[2 * i] = EvenementUnicode(texte[i], false);
                    lot[2 * i + 1] = EvenementUnicode(texte[i], true);
                }
                return lot.Length == 0 ? 0 : SendInput((uint)lot.Length, lot, Marshal.SizeOf(typeof(INPUT)));
            }
            uint envoyes = 0;
            foreach (char c in texte)
            {
                envoyes += EnvoyerDeux(EvenementUnicode(c, false), EvenementUnicode(c, true));
                Thread.Sleep(DelaiCarMs);
            }
            return envoyes;
        }

        static uint EnvoyerDeux(INPUT appui, INPUT relache)
        {
            var deux = new[] { appui, relache };
            return SendInput(2, deux, Marshal.SizeOf(typeof(INPUT)));
        }

        static INPUT EvenementTouche(ushort vk, bool relache)
        {
            return new INPUT
            {
                type = INPUT_KEYBOARD,
                ki = new KEYBDINPUT
                {
                    wVk = vk,
                    wScan = 0,
                    dwFlags = relache ? KEYEVENTF_KEYUP : 0,
                    time = 0,
                    dwExtraInfo = IntPtr.Zero
                }
            };
        }

        static INPUT EvenementUnicode(char c, bool relache)
        {
            return new INPUT
            {
                type = INPUT_KEYBOARD,
                ki = new KEYBDINPUT
                {
                    wVk = 0,
                    wScan = c,
                    dwFlags = KEYEVENTF_UNICODE | (relache ? KEYEVENTF_KEYUP : 0),
                    time = 0,
                    dwExtraInfo = IntPtr.Zero
                }
            };
        }
    }
}
