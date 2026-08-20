using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Windows.Forms;
using Microsoft.Win32;

namespace MdpGen
{
    /// <summary>Tirage aléatoire cryptographique, sans biais de modulo.</summary>
    static class Alea
    {
        static readonly RNGCryptoServiceProvider Rng = new RNGCryptoServiceProvider();
        static readonly byte[] Tampon = new byte[4];

        /// <summary>Entier uniforme dans [0, borne) par rejet des valeurs biaisées.</summary>
        public static int Suivant(int borne)
        {
            if (borne <= 0) throw new ArgumentOutOfRangeException("borne");
            uint limite = uint.MaxValue - (uint.MaxValue % (uint)borne);
            uint tirage;
            do
            {
                Rng.GetBytes(Tampon);
                tirage = BitConverter.ToUInt32(Tampon, 0);
            } while (tirage >= limite);
            return (int)(tirage % (uint)borne);
        }

        /// <summary>Mélange de Fisher-Yates.</summary>
        public static void Melanger(char[] tableau)
        {
            for (int i = tableau.Length - 1; i > 0; i--)
            {
                int j = Suivant(i + 1);
                char tmp = tableau[i]; tableau[i] = tableau[j]; tableau[j] = tmp;
            }
        }
    }

    static class Generateur
    {
        public const string Minuscules = "abcdefghijklmnopqrstuvwxyz";
        public const string Majuscules = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        public const string Chiffres = "0123456789";
        public const string Symboles = "!#$%&()*+,-./:;<=>?@[]^_{|}~";

        // Symboles atteignables en une seule bascule de clavier sur mobile : presents a la
        // fois sur la page "123" d'iOS et sur la premiere page de symboles de Gboard. Les
        // autres (# % * + < > [ ] ^ _ { | } ~) exigent une seconde bascule sur au moins
        // l'une des deux plateformes.
        public const string SymbolesMobiles = "!$&(),-./:;?@";

        const string Ambigus = "Il1|O0oB8S5Z2";

        /// <summary>Jeu de symboles retenu selon la contrainte de saisie au clavier mobile.</summary>
        public static string JeuSymboles(bool mobileSeulement)
        {
            return mobileSeulement ? SymbolesMobiles : Symboles;
        }

        public static string Filtrer(string jeu, bool sansAmbigus)
        {
            if (!sansAmbigus) return jeu;
            var sb = new StringBuilder();
            foreach (char c in jeu) if (Ambigus.IndexOf(c) < 0) sb.Append(c);
            return sb.ToString();
        }

        /// <summary>Un mot de passe contenant au moins un caractère de chaque jeu fourni.</summary>
        public static string Generer(string[] jeux, int longueur)
        {
            string total = string.Concat(jeux);
            var resultat = new char[longueur];
            int i = 0;
            // Un représentant obligatoire par classe cochée.
            foreach (string jeu in jeux)
            {
                if (i >= longueur) break;
                resultat[i++] = jeu[Alea.Suivant(jeu.Length)];
            }
            for (; i < longueur; i++) resultat[i] = total[Alea.Suivant(total.Length)];
            Alea.Melanger(resultat);
            return new string(resultat);
        }

        /// <summary>Entropie en bits : longueur x log2(taille du jeu).</summary>
        public static double Entropie(int taillePool, int longueur)
        {
            if (taillePool <= 1) return 0;
            return longueur * Math.Log(taillePool, 2);
        }
    }

    /// <summary>Palette « mithril » : encre froide, argent, bleu glacier.</summary>
    static class Palette
    {
        public static readonly Color Fond = Color.FromArgb(23, 26, 32);
        public static readonly Color Carte = Color.FromArgb(31, 36, 44);
        public static readonly Color Creux = Color.FromArgb(38, 44, 54);
        public static readonly Color CreuxSurvol = Color.FromArgb(47, 54, 66);
        public static readonly Color Bordure = Color.FromArgb(53, 61, 74);
        public static readonly Color Texte = Color.FromArgb(228, 233, 240);
        public static readonly Color TexteSecondaire = Color.FromArgb(139, 148, 163);
        public static readonly Color TexteEteint = Color.FromArgb(88, 96, 109);
        public static readonly Color Accent = Color.FromArgb(143, 198, 222);
        public static readonly Color AccentSurvol = Color.FromArgb(168, 212, 232);
        public static readonly Color AccentPresse = Color.FromArgb(122, 176, 200);
        public static readonly Color TexteSurAccent = Color.FromArgb(14, 30, 39);
        public static readonly Color Chiffre = Color.FromArgb(134, 199, 242);
        public static readonly Color Symbole = Color.FromArgb(242, 178, 121);
        public static readonly Color Faible = Color.FromArgb(224, 108, 95);
        public static readonly Color Correct = Color.FromArgb(224, 169, 95);
        public static readonly Color Fort = Color.FromArgb(127, 191, 142);
    }

    static class Dessin
    {
        /// <summary>Rectangle à coins arrondis, à libérer par l'appelant.</summary>
        public static GraphicsPath Arrondi(Rectangle r, int rayon)
        {
            int d = rayon * 2;
            var chemin = new GraphicsPath();
            chemin.AddArc(r.X, r.Y, d, d, 180, 90);
            chemin.AddArc(r.Right - d, r.Y, d, d, 270, 90);
            chemin.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
            chemin.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
            chemin.CloseFigure();
            return chemin;
        }
    }

    /// <summary>Socle des contrôles dessinés à la main : double tampon, survol, appui, focus clavier.</summary>
    abstract class ControleDoux : Control
    {
        protected bool Survol, Appui;

        protected ControleDoux()
        {
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint |
                     ControlStyles.OptimizedDoubleBuffer | ControlStyles.ResizeRedraw |
                     ControlStyles.Selectable | ControlStyles.SupportsTransparentBackColor, true);
            BackColor = Color.Transparent;
            TabStop = true;
            Cursor = Cursors.Hand;
        }

        protected override void OnMouseEnter(EventArgs e) { Survol = true; Invalidate(); base.OnMouseEnter(e); }
        protected override void OnMouseLeave(EventArgs e) { Survol = false; Appui = false; Invalidate(); base.OnMouseLeave(e); }
        protected override void OnMouseDown(MouseEventArgs e) { Appui = true; Focus(); Invalidate(); base.OnMouseDown(e); }
        protected override void OnMouseUp(MouseEventArgs e) { Appui = false; Invalidate(); base.OnMouseUp(e); }
        protected override void OnGotFocus(EventArgs e) { Invalidate(); base.OnGotFocus(e); }
        protected override void OnLostFocus(EventArgs e) { Invalidate(); base.OnLostFocus(e); }
        protected override void OnEnabledChanged(EventArgs e) { Invalidate(); base.OnEnabledChanged(e); }
        protected override void OnTextChanged(EventArgs e) { Invalidate(); base.OnTextChanged(e); }

        protected override void OnKeyDown(KeyEventArgs e)
        {
            if (e.KeyCode == Keys.Space || e.KeyCode == Keys.Enter)
            {
                OnClick(EventArgs.Empty);
                e.Handled = true;
            }
            base.OnKeyDown(e);
        }

        protected void AnneauFocus(Graphics g, Rectangle r, int rayon)
        {
            if (!Focused) return;
            using (var chemin = Dessin.Arrondi(r, rayon))
            using (var stylo = new Pen(Palette.AccentSurvol))
                g.DrawPath(stylo, chemin);
        }
    }

    /// <summary>Bouton pilule ; utilisable comme bouton par défaut de la fenêtre.</summary>
    class Bouton : ControleDoux, IButtonControl
    {
        public bool Primaire;
        DialogResult resultat = DialogResult.None;

        public DialogResult DialogResult { get { return resultat; } set { resultat = value; } }
        public void NotifyDefault(bool valeur) { }
        public void PerformClick() { OnClick(EventArgs.Empty); }

        // Comme un vrai Button : cliquer pose le DialogResult sur la fenêtre hôte.
        protected override void OnClick(EventArgs e)
        {
            var forme = FindForm();
            if (forme != null && resultat != DialogResult.None) forme.DialogResult = resultat;
            base.OnClick(e);
        }

        // Entrée doit activer CE bouton quand il a le focus, pas le bouton par défaut.
        protected override bool IsInputKey(Keys donnee)
        {
            if (donnee == Keys.Enter) return true;
            return base.IsInputKey(donnee);
        }

        protected override bool ProcessMnemonic(char c)
        {
            if (IsMnemonic(c, Text)) { PerformClick(); return true; }
            return base.ProcessMnemonic(c);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            var g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            var r = new Rectangle(0, 0, Width - 1, Height - 1);

            Color fond, texte;
            if (Primaire)
            {
                fond = Appui ? Palette.AccentPresse : Survol ? Palette.AccentSurvol : Palette.Accent;
                texte = Palette.TexteSurAccent;
            }
            else
            {
                fond = Appui ? Palette.Bordure : Survol ? Palette.CreuxSurvol : Palette.Creux;
                texte = Palette.Texte;
            }

            using (var chemin = Dessin.Arrondi(r, 12))
            {
                using (var pinceau = new SolidBrush(fond)) g.FillPath(pinceau, chemin);
                if (!Primaire)
                    using (var stylo = new Pen(Palette.Bordure)) g.DrawPath(stylo, chemin);
            }
            AnneauFocus(g, new Rectangle(2, 2, Width - 5, Height - 5), 10);

            TextRenderer.DrawText(g, Text, Font, r, texte,
                TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.SingleLine);
        }
    }

    /// <summary>Petit bouton icône (glyphe Segoe MDL2 Assets) posé dans la carte du mot de passe.</summary>
    class BoutonIcone : ControleDoux
    {
        string glyphe;
        public Color? Teinte; // couleur imposée (ex. rouge pour confirmer une suppression)
        static readonly Font PoliceIcone = new Font("Segoe MDL2 Assets", 12F);

        public BoutonIcone(string glypheMdl2, string astuce, ToolTip infobulle)
        {
            glyphe = glypheMdl2;
            infobulle.SetToolTip(this, astuce);
        }

        public string Glyphe { get { return glyphe; } set { glyphe = value; Invalidate(); } }

        protected override void OnPaint(PaintEventArgs e)
        {
            var g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            if (Survol || Appui || Focused)
                using (var chemin = Dessin.Arrondi(new Rectangle(0, 0, Width - 1, Height - 1), 8))
                using (var pinceau = new SolidBrush(Appui ? Palette.Bordure : Palette.CreuxSurvol))
                    g.FillPath(pinceau, chemin);
            Color teinte = Teinte.HasValue ? Teinte.Value
                : Survol || Focused ? Palette.Texte : Palette.TexteSecondaire;
            TextRenderer.DrawText(g, glyphe, PoliceIcone, new Rectangle(0, 0, Width, Height),
                teinte, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
        }
    }

    /// <summary>Pastille à bascule pour les familles de caractères.</summary>
    class Puce : ControleDoux
    {
        bool coche;
        public event EventHandler CocheChangee;

        public bool Coche
        {
            get { return coche; }
            set
            {
                if (coche == value) return;
                coche = value;
                Invalidate();
                if (CocheChangee != null) CocheChangee(this, EventArgs.Empty);
            }
        }

        protected override void OnClick(EventArgs e)
        {
            Coche = !coche;
            base.OnClick(e);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            var g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            var r = new Rectangle(0, 0, Width - 1, Height - 1);
            int rayon = Height / 2 - 1;

            using (var chemin = Dessin.Arrondi(r, rayon))
            {
                if (coche)
                {
                    using (var pinceau = new SolidBrush(Survol ? Palette.AccentSurvol : Palette.Accent))
                        g.FillPath(pinceau, chemin);
                }
                else
                {
                    using (var pinceau = new SolidBrush(Survol ? Palette.CreuxSurvol : Palette.Creux))
                        g.FillPath(pinceau, chemin);
                    using (var stylo = new Pen(Palette.Bordure)) g.DrawPath(stylo, chemin);
                }
            }
            AnneauFocus(g, new Rectangle(2, 2, Width - 5, Height - 5), rayon - 2);

            TextRenderer.DrawText(g, Text, Font, r,
                coche ? Palette.TexteSurAccent : Palette.TexteSecondaire,
                TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.SingleLine);
        }
    }

    /// <summary>Ligne « interrupteur + libellé » : toute la ligne est cliquable.</summary>
    class Interrupteur : ControleDoux
    {
        bool coche;
        public event EventHandler CocheChangee;

        public bool Coche
        {
            get { return coche; }
            set
            {
                if (coche == value) return;
                coche = value;
                Invalidate();
                if (CocheChangee != null) CocheChangee(this, EventArgs.Empty);
            }
        }

        protected override void OnClick(EventArgs e)
        {
            Coche = !coche;
            base.OnClick(e);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            var g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            var pilule = new Rectangle(0, (Height - 22) / 2, 42, 22);

            using (var chemin = Dessin.Arrondi(pilule, 11))
            {
                Color fond = !Enabled ? Palette.Creux
                    : coche ? (Survol ? Palette.AccentSurvol : Palette.Accent)
                    : (Survol ? Palette.CreuxSurvol : Palette.Creux);
                using (var pinceau = new SolidBrush(fond)) g.FillPath(pinceau, chemin);
                if (!coche || !Enabled)
                    using (var stylo = new Pen(Palette.Bordure)) g.DrawPath(stylo, chemin);
            }

            int xBille = coche ? pilule.Right - 19 : pilule.X + 3;
            Color teinteBille = !Enabled ? Palette.TexteEteint
                : coche ? Palette.TexteSurAccent : Palette.TexteSecondaire;
            using (var pinceau = new SolidBrush(teinteBille))
                g.FillEllipse(pinceau, xBille, pilule.Y + 3, 16, 16);

            AnneauFocus(g, new Rectangle(pilule.X + 1, pilule.Y + 1, pilule.Width - 2, pilule.Height - 2), 10);

            TextRenderer.DrawText(g, Text, Font,
                new Rectangle(56, 0, Width - 56, Height),
                Enabled ? Palette.Texte : Palette.TexteEteint,
                TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.SingleLine);
        }
    }

    /// <summary>Curseur horizontal façon Windows 11 : piste fine, pouce en anneau accentué.</summary>
    class Curseur : ControleDoux
    {
        public int Minimum = 8;
        public int Maximum = 128;
        int valeur = 32;
        public event EventHandler ValeurChangee;

        const int Marge = 10; // demi-pouce : la course s'arrête avant les bords

        public int Valeur
        {
            get { return valeur; }
            set
            {
                int borne = Math.Max(Minimum, Math.Min(Maximum, value));
                if (borne == valeur) return;
                valeur = borne;
                Invalidate();
                if (ValeurChangee != null) ValeurChangee(this, EventArgs.Empty);
            }
        }

        void DepuisSouris(int x)
        {
            double frac = (x - Marge) / (double)(Width - 2 * Marge);
            if (frac < 0) frac = 0;
            if (frac > 1) frac = 1;
            Valeur = Minimum + (int)Math.Round(frac * (Maximum - Minimum));
        }

        protected override void OnMouseDown(MouseEventArgs e) { base.OnMouseDown(e); DepuisSouris(e.X); }
        protected override void OnMouseMove(MouseEventArgs e) { if (e.Button == MouseButtons.Left) DepuisSouris(e.X); base.OnMouseMove(e); }

        protected override bool IsInputKey(Keys donnee)
        {
            switch (donnee)
            {
                case Keys.Left: case Keys.Right: case Keys.Up: case Keys.Down: return true;
            }
            return base.IsInputKey(donnee);
        }

        protected override void OnKeyDown(KeyEventArgs e)
        {
            switch (e.KeyCode)
            {
                case Keys.Left: case Keys.Down: Valeur = valeur - 1; e.Handled = true; return;
                case Keys.Right: case Keys.Up: Valeur = valeur + 1; e.Handled = true; return;
                case Keys.PageDown: Valeur = valeur - 8; e.Handled = true; return;
                case Keys.PageUp: Valeur = valeur + 8; e.Handled = true; return;
                case Keys.Home: Valeur = Minimum; e.Handled = true; return;
                case Keys.End: Valeur = Maximum; e.Handled = true; return;
            }
            // Espace/Entrée du socle sans objet ici : ne pas remonter à ControleDoux.
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            var g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            int milieu = Height / 2;
            double frac = (valeur - Minimum) / (double)(Maximum - Minimum);
            int xPouce = Marge + (int)Math.Round(frac * (Width - 2 * Marge));

            using (var chemin = Dessin.Arrondi(new Rectangle(Marge, milieu - 2, Width - 2 * Marge, 4), 2))
            using (var pinceau = new SolidBrush(Palette.Creux))
                g.FillPath(pinceau, chemin);
            if (xPouce - Marge > 4)
                using (var chemin = Dessin.Arrondi(new Rectangle(Marge, milieu - 2, xPouce - Marge, 4), 2))
                using (var pinceau = new SolidBrush(Palette.Accent))
                    g.FillPath(pinceau, chemin);

            // Pouce : disque accent, cœur sombre ; halo au survol ou au focus.
            if (Survol || Focused)
                using (var pinceau = new SolidBrush(Color.FromArgb(50, Palette.Accent)))
                    g.FillEllipse(pinceau, xPouce - 13, milieu - 13, 26, 26);
            using (var pinceau = new SolidBrush(Survol || Focused ? Palette.AccentSurvol : Palette.Accent))
                g.FillEllipse(pinceau, xPouce - 9, milieu - 9, 18, 18);
            using (var pinceau = new SolidBrush(Palette.Fond))
                g.FillEllipse(pinceau, xPouce - 4, milieu - 4, 8, 8);
        }
    }

    /// <summary>Jauge de force à bouts ronds : se remplit vers le bleu mithril.</summary>
    class Jauge : Control
    {
        double fraction;
        Color couleur = Palette.Accent;

        public Jauge()
        {
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint |
                     ControlStyles.OptimizedDoubleBuffer | ControlStyles.ResizeRedraw |
                     ControlStyles.SupportsTransparentBackColor, true);
            BackColor = Color.Transparent;
            TabStop = false;
        }

        public void Regler(double frac, Color c)
        {
            fraction = frac < 0 ? 0 : frac > 1 ? 1 : frac;
            couleur = c;
            Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            var g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            int rayon = Height / 2 - 1;
            using (var chemin = Dessin.Arrondi(new Rectangle(0, 0, Width - 1, Height - 1), rayon))
            using (var pinceau = new SolidBrush(Palette.Creux))
                g.FillPath(pinceau, chemin);
            int largeur = (int)(Width * fraction);
            if (largeur > Height)
                using (var chemin = Dessin.Arrondi(new Rectangle(0, 0, largeur - 1, Height - 1), rayon))
                using (var pinceau = new SolidBrush(couleur))
                    g.FillPath(pinceau, chemin);
        }
    }

    public class Fenetre : Form
    {
        readonly Curseur curseur = new Curseur();
        readonly TextBox txtLongueur = new TextBox();
        readonly Puce pcMin = new Puce();
        readonly Puce pcMaj = new Puce();
        readonly Puce pcNum = new Puce();
        readonly Puce pcSym = new Puce();
        readonly Interrupteur intMobiles = new Interrupteur();
        readonly Interrupteur intAmbigus = new Interrupteur();
        readonly Interrupteur intEffacer = new Interrupteur();
        readonly RichTextBox txtMdp = new RichTextBox();
        readonly Panel pnlMdp = new Panel();
        readonly Jauge jauge = new Jauge();
        readonly Label lblEntropie = new Label();
        readonly Label lblEtat = new Label();
        readonly Timer minuteur = new Timer();
        readonly ToolTip infobulle = new ToolTip();
        string dernierCopie = "";
        int secondesRestantes;
        bool pret;

        // --- Session : coffre partagé, barre d'état, raccourci global, verrouillage auto ---
        readonly Coffre coffre = Coffre.ParDefaut();
        NotifyIcon tray;
        readonly Timer verrouAuto = new Timer();
        bool vraimentQuitter;
        bool astuceTrayMontree;
        bool frappeEnCours;
        const int IdRaccourci = 0xB12;      // identifiant arbitraire du hotkey

        [DllImport("dwmapi.dll")]
        static extern int DwmSetWindowAttribute(IntPtr fenetre, int attribut, ref int valeur, int taille);

        [DllImport("user32.dll")] static extern bool RegisterHotKey(IntPtr fenetre, int id, uint modificateurs, uint touche);
        [DllImport("user32.dll")] static extern bool UnregisterHotKey(IntPtr fenetre, int id);

        [StructLayout(LayoutKind.Sequential)]
        struct DERNIERE_ENTREE { public uint cbSize; public uint dwTime; }
        [DllImport("user32.dll")] static extern bool GetLastInputInfo(ref DERNIERE_ENTREE info);
        [DllImport("kernel32.dll")] static extern uint GetTickCount();

        public Fenetre()
        {
            Text = "Mithril";
            ClientSize = new Size(640, 548);
            FormBorderStyle = FormBorderStyle.FixedSingle;
            MaximizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = Palette.Fond;
            ForeColor = Palette.Texte;
            Font = new Font("Segoe UI", 9.75F);

            // --- Carte du mot de passe ---
            pnlMdp.SetBounds(28, 28, 584, 84);
            pnlMdp.BackColor = Palette.Fond;
            pnlMdp.Paint += delegate(object s, PaintEventArgs e)
            {
                e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
                using (var chemin = Dessin.Arrondi(new Rectangle(0, 0, pnlMdp.Width - 1, pnlMdp.Height - 1), 12))
                {
                    using (var pinceau = new SolidBrush(Palette.Carte)) e.Graphics.FillPath(pinceau, chemin);
                    using (var stylo = new Pen(Palette.Bordure)) e.Graphics.DrawPath(stylo, chemin);
                }
            };
            Controls.Add(pnlMdp);

            txtMdp.SetBounds(24, 16, 366, 52);
            txtMdp.Font = new Font("Consolas", 15F);
            txtMdp.ReadOnly = true;
            txtMdp.Multiline = true;
            txtMdp.WordWrap = true;
            txtMdp.ScrollBars = RichTextBoxScrollBars.None;
            txtMdp.BackColor = Palette.Carte;
            txtMdp.ForeColor = Palette.Texte;
            txtMdp.BorderStyle = BorderStyle.None;
            txtMdp.TabStop = false;
            pnlMdp.Controls.Add(txtMdp);

            var icoRegen = new BoutonIcone("", "Régénérer (Entrée)", infobulle);
            icoRegen.SetBounds(398, 24, 36, 36);
            icoRegen.Click += delegate { Generer(); };
            pnlMdp.Controls.Add(icoRegen);

            var icoCopie = new BoutonIcone("", "Copier (Ctrl+C)", infobulle);
            icoCopie.SetBounds(440, 24, 36, 36);
            icoCopie.Click += delegate { Copier(); };
            pnlMdp.Controls.Add(icoCopie);

            var icoCoffre = new BoutonIcone("", "Enregistrer dans le coffre", infobulle);
            icoCoffre.SetBounds(482, 24, 36, 36);
            icoCoffre.Click += delegate { EnregistrerAuCoffre(); };
            pnlMdp.Controls.Add(icoCoffre);

            var icoReglages = new BoutonIcone("", "Réglages", infobulle);
            icoReglages.SetBounds(524, 24, 36, 36);
            icoReglages.Click += delegate { OuvrirReglages(); };
            pnlMdp.Controls.Add(icoReglages);

            jauge.SetBounds(28, 124, 584, 6);
            Controls.Add(jauge);

            lblEntropie.SetBounds(28, 140, 584, 18);
            lblEntropie.TextAlign = ContentAlignment.MiddleCenter;
            lblEntropie.ForeColor = Palette.TexteSecondaire;
            Controls.Add(lblEntropie);

            // --- Longueur ---
            Eyebrow(28, 174, "LONGUEUR");

            curseur.SetBounds(28, 198, 496, 28);
            curseur.ValeurChangee += SurLongueurCurseur;
            Controls.Add(curseur);

            var pnlLongueur = new Panel();
            pnlLongueur.SetBounds(540, 196, 72, 30);
            pnlLongueur.BackColor = Palette.Fond;
            pnlLongueur.Paint += delegate(object s, PaintEventArgs e)
            {
                e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
                using (var chemin = Dessin.Arrondi(new Rectangle(0, 0, 71, 29), 8))
                {
                    using (var pinceau = new SolidBrush(Palette.Creux)) e.Graphics.FillPath(pinceau, chemin);
                    using (var stylo = new Pen(Palette.Bordure)) e.Graphics.DrawPath(stylo, chemin);
                }
            };
            Controls.Add(pnlLongueur);

            txtLongueur.SetBounds(8, 5, 56, 20);
            txtLongueur.Text = "32";
            txtLongueur.Font = new Font("Segoe UI Semibold", 10.5F);
            txtLongueur.BackColor = Palette.Creux;
            txtLongueur.ForeColor = Palette.Texte;
            txtLongueur.BorderStyle = BorderStyle.None;
            txtLongueur.TextAlign = HorizontalAlignment.Center;
            txtLongueur.MaxLength = 3;
            txtLongueur.KeyPress += SurSaisieLongueur;
            txtLongueur.KeyDown += SurToucheLongueur;
            txtLongueur.Leave += delegate { ValiderLongueur(false); };
            pnlLongueur.Controls.Add(txtLongueur);
            infobulle.SetToolTip(txtLongueur, "8 à 128 caractères — flèches haut/bas pour ajuster");

            // --- Familles de caractères ---
            Eyebrow(28, 240, "CARACTÈRES");
            PlacerPuce(pcMin, 28, "Minuscules");
            PlacerPuce(pcMaj, 177, "Majuscules");
            PlacerPuce(pcNum, 326, "Chiffres");
            PlacerPuce(pcSym, 475, "Symboles");

            PlacerInterrupteur(intMobiles, 316, "Symboles faciles à taper au téléphone", false,
                "Restreint aux symboles en une seule bascule de clavier : ! $ & ( ) , - . / : ; ? @");
            PlacerInterrupteur(intAmbigus, 350, "Exclure les caractères ambigus", false,
                "Retire I l 1 O 0 B 8 S 5 Z 2 — utile si le mot de passe doit être relu ou retapé à la main");

            // La restriction mobile n'a de sens que si les symboles sont actifs.
            // (PlacerPuce a déjà branché la régénération.)
            pcSym.CocheChangee += delegate { intMobiles.Enabled = pcSym.Coche; };
            intMobiles.Enabled = pcSym.Coche;

            Eyebrow(28, 394, "PRESSE-PAPIERS");
            PlacerInterrupteur(intEffacer, 416, "Vider le presse-papiers 60 s après la copie", true, null);

            // --- Boutons ---
            var btnGen = new Bouton();
            btnGen.Primaire = true;
            btnGen.SetBounds(28, 458, 272, 50);
            btnGen.Text = "&Générer";
            btnGen.Font = new Font("Segoe UI Semibold", 10.5F);
            btnGen.Click += delegate { Generer(); };
            Controls.Add(btnGen);

            var btnCopie = new Bouton();
            btnCopie.SetBounds(312, 458, 140, 50);
            btnCopie.Text = "&Copier";
            btnCopie.Font = new Font("Segoe UI Semibold", 10.5F);
            btnCopie.Click += delegate { Copier(); };
            Controls.Add(btnCopie);
            infobulle.SetToolTip(btnCopie, "Ctrl+C copie aussi le mot de passe entier");

            var btnCoffre = new Bouton();
            btnCoffre.SetBounds(464, 458, 148, 50);
            btnCoffre.Text = "C&offre";
            btnCoffre.Font = new Font("Segoe UI Semibold", 10.5F);
            btnCoffre.Click += delegate { OuvrirCoffre(); };
            Controls.Add(btnCoffre);
            infobulle.SetToolTip(btnCoffre, "Mots de passe enregistrés sur cette machine (chiffrés)");

            lblEtat.SetBounds(28, 518, 584, 18);
            lblEtat.TextAlign = ContentAlignment.MiddleCenter;
            lblEtat.ForeColor = Palette.Accent;
            Controls.Add(lblEtat);

            AcceptButton = btnGen;
            minuteur.Interval = 1000;
            minuteur.Tick += SurTic;

            pret = true;
            Generer();
            InitialiserSession(); // barre d'état, raccourci global, verrouillage auto
        }

        /// <summary>Barre de titre sombre (Windows 10 1809+) ; sans effet ailleurs.</summary>
        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            try
            {
                int sombre = 1;
                if (DwmSetWindowAttribute(Handle, 20, ref sombre, 4) != 0)
                    DwmSetWindowAttribute(Handle, 19, ref sombre, 4);
            }
            catch { }
        }

        protected override void WndProc(ref Message m)
        {
            // WM_HOTKEY = 0x0312 : le raccourci global Ctrl+Alt+M a été pressé.
            if (m.Msg == 0x0312 && m.WParam.ToInt32() == IdRaccourci)
            {
                RemplirFenetreActive();
                return;
            }
            base.WndProc(ref m);
        }

        /// <summary>Fermer réduit dans la barre d'état ; « Quitter » ferme réellement.</summary>
        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (!vraimentQuitter && e.CloseReason == CloseReason.UserClosing && Reglages.Actuels.FermerReduit)
            {
                e.Cancel = true;
                Hide();
                if (Reglages.Actuels.VerrouReduction && coffre.Deverrouille) VerrouillerCoffre(null);
                if (!astuceTrayMontree)
                {
                    astuceTrayMontree = true;
                    Notifier("Mithril reste actif ici. " +
                        Reglages.DecrireRaccourci(Reglages.Actuels.RaccourciMods, Reglages.Actuels.RaccourciTouche) +
                        " remplit la fenêtre active.");
                }
                return;
            }
            UnregisterHotKey(Handle, IdRaccourci);
            verrouAuto.Stop();
            SystemEvents.SessionSwitch -= SurSessionWindows;
            if (tray != null) { tray.Visible = false; tray.Dispose(); }
            coffre.Verrouiller();
            base.OnFormClosing(e);
        }

        /// <summary>Ctrl+C copie le mot de passe entier, sauf sélection manuelle en cours.</summary>
        protected override bool ProcessCmdKey(ref Message msg, Keys donnee)
        {
            if (donnee == (Keys.Control | Keys.C) && txtMdp.SelectionLength == 0)
            {
                Copier();
                return true;
            }
            return base.ProcessCmdKey(ref msg, donnee);
        }

        void Eyebrow(int x, int y, string texte)
        {
            var lbl = new Label();
            lbl.SetBounds(x, y, 300, 16);
            lbl.Text = texte;
            lbl.Font = new Font("Segoe UI", 8F, FontStyle.Bold);
            lbl.ForeColor = Palette.TexteSecondaire;
            Controls.Add(lbl);
        }

        void PlacerPuce(Puce puce, int x, string texte)
        {
            puce.SetBounds(x, 262, 137, 38);
            puce.Text = texte;
            puce.Font = new Font("Segoe UI Semibold", 9.75F);
            puce.Coche = true;
            puce.CocheChangee += delegate { Generer(); };
            Controls.Add(puce);
        }

        void PlacerInterrupteur(Interrupteur inter, int y, string texte, bool relance, string astuce)
        {
            inter.SetBounds(28, y, 584, 26);
            inter.Text = texte;
            if (!relance) inter.CocheChangee += delegate { Generer(); };
            if (astuce != null) infobulle.SetToolTip(inter, astuce);
            Controls.Add(inter);
        }

        // --- Longueur : champ texte et curseur synchronisés ---

        void SurSaisieLongueur(object s, KeyPressEventArgs e)
        {
            if (!char.IsControl(e.KeyChar) && !char.IsDigit(e.KeyChar)) e.Handled = true;
        }

        void SurToucheLongueur(object s, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.Enter) { ValiderLongueur(true); e.SuppressKeyPress = true; }
            else if (e.KeyCode == Keys.Up) { curseur.Valeur = curseur.Valeur + 1; e.Handled = true; }
            else if (e.KeyCode == Keys.Down) { curseur.Valeur = curseur.Valeur - 1; e.Handled = true; }
        }

        void ValiderLongueur(bool forcer)
        {
            int demande;
            if (!int.TryParse(txtLongueur.Text, out demande)) demande = curseur.Valeur;
            demande = Math.Max(curseur.Minimum, Math.Min(curseur.Maximum, demande));
            txtLongueur.Text = demande.ToString();
            if (demande != curseur.Valeur) curseur.Valeur = demande; // génère via l'événement
            else if (forcer) Generer();
        }

        void SurLongueurCurseur(object s, EventArgs e)
        {
            txtLongueur.Text = curseur.Valeur.ToString();
            Generer();
        }

        // --- Génération et affichage ---

        void Generer()
        {
            if (!pret) return;

            var jeux = new System.Collections.Generic.List<string>();
            bool sansAmbigus = intAmbigus.Coche;
            if (pcMin.Coche) jeux.Add(Generateur.Filtrer(Generateur.Minuscules, sansAmbigus));
            if (pcMaj.Coche) jeux.Add(Generateur.Filtrer(Generateur.Majuscules, sansAmbigus));
            if (pcNum.Coche) jeux.Add(Generateur.Filtrer(Generateur.Chiffres, sansAmbigus));
            if (pcSym.Coche)
                jeux.Add(Generateur.Filtrer(Generateur.JeuSymboles(intMobiles.Coche), sansAmbigus));

            if (jeux.Count == 0)
            {
                txtMdp.Text = "";
                jauge.Regler(0, Palette.Faible);
                lblEntropie.Text = "Choisis au moins une famille de caractères.";
                lblEntropie.ForeColor = Palette.Faible;
                return;
            }

            int longueur = curseur.Valeur;
            AfficherMdp(Generateur.Generer(jeux.ToArray(), longueur), longueur);

            int pool = string.Concat(jeux).Length;
            double bits = Generateur.Entropie(pool, longueur);
            string verdict;
            Color couleur;
            if (bits < 60) { verdict = "faible"; couleur = Palette.Faible; }
            else if (bits < 90) { verdict = "correct"; couleur = Palette.Correct; }
            else if (bits < 128) { verdict = "fort"; couleur = Palette.Fort; }
            else { verdict = "très fort"; couleur = Palette.Accent; }

            jauge.Regler(bits / 160.0, couleur);
            lblEntropie.Text = string.Format(
                "{0:0} bits d'entropie - {1}   ({2} caractères, alphabet de {3})",
                bits, verdict, longueur, pool);
            lblEntropie.ForeColor = couleur;
            lblEtat.Text = "";
        }

        /// <summary>Affiche le mot de passe coloré par famille : lettres argent, chiffres bleus, symboles ambre.</summary>
        void AfficherMdp(string mdp, int longueur)
        {
            float taille = longueur <= 32 ? 15F : longueur <= 64 ? 12F : 10F;
            if (Math.Abs(txtMdp.Font.Size - taille) > 0.1F)
                txtMdp.Font = new Font("Consolas", taille);

            txtMdp.Text = mdp;
            txtMdp.SelectAll();
            txtMdp.SelectionAlignment = HorizontalAlignment.Center;
            for (int i = 0; i < mdp.Length; i++)
            {
                txtMdp.Select(i, 1);
                char c = mdp[i];
                txtMdp.SelectionColor = char.IsDigit(c) ? Palette.Chiffre
                    : char.IsLetter(c) ? Palette.Texte
                    : Palette.Symbole;
            }
            txtMdp.Select(mdp.Length, 0);
        }

        // --- Coffre (session) ---

        /// <summary>
        /// Garantit un coffre prêt à l'emploi : ouvert, et déverrouillé une seule fois si un
        /// maître est actif. Reste déverrouillé en mémoire pour toute la session (jusqu'au
        /// verrouillage auto, au verrouillage de session Windows, ou à « Verrouiller »).
        /// </summary>
        bool AssurerCoffrePret(IWin32Window parent)
        {
            if (coffre.Deverrouille) return true;
            try { coffre.Ouvrir(); }
            catch (CoffreException ex)
            {
                MessageBox.Show((Form)parent, ex.Message, "Mithril", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return false;
            }
            if (coffre.MaitreActif && !coffre.Deverrouille)
                using (var verrou = new DialogueDeverrouiller(coffre))
                    if (verrou.ShowDialog(parent) != DialogResult.OK) return false;
            return coffre.Deverrouille;
        }

        void EnregistrerAuCoffre()
        {
            if (txtMdp.Text.Length == 0) return;
            if (!AssurerCoffrePret(this)) return;
            try
            {
                using (var dialogue = new DialogueAjout())
                {
                    if (dialogue.ShowDialog(this) == DialogResult.OK)
                    {
                        coffre.Ajouter(dialogue.Libelle, dialogue.Identifiant, txtMdp.Text);
                        lblEtat.ForeColor = Palette.Accent;
                        lblEtat.Text = "Enregistré dans le coffre.";
                    }
                }
            }
            catch (CoffreException ex)
            {
                lblEtat.ForeColor = Palette.Faible;
                lblEtat.Text = ex.Message;
            }
        }

        void OuvrirCoffre()
        {
            if (!AssurerCoffrePret(this)) return;
            using (var fenetre = new FenetreCoffre(coffre))
                fenetre.ShowDialog(this);
        }

        // --- Barre d'état système + raccourci global + verrouillage auto ---

        void InitialiserSession()
        {
            tray = new NotifyIcon();
            tray.Icon = Icon ?? SystemIcons.Application;
            tray.Text = "Mithril — générateur et coffre";
            tray.Visible = true;
            tray.DoubleClick += delegate { AfficherFenetre(); };

            var menu = new ContextMenuStrip();
            menu.Items.Add("Générateur", null, delegate { AfficherFenetre(); });
            menu.Items.Add("Coffre", null, delegate { AfficherFenetre(); OuvrirCoffre(); });
            menu.Items.Add("Remplir la fenêtre active", null, delegate { RemplirFenetreActive(); });
            menu.Items.Add("Réglages…", null, delegate { AfficherFenetre(); OuvrirReglages(); });
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Verrouiller le coffre", null, delegate { VerrouillerCoffre("Coffre verrouillé."); });
            menu.Items.Add("Quitter", null, delegate { QuitterReellement(); });
            tray.ContextMenuStrip = menu;

            verrouAuto.Interval = 15000;
            verrouAuto.Tick += delegate { VerifierVerrouillageAuto(); };
            verrouAuto.Start();
            SystemEvents.SessionSwitch += SurSessionWindows;

            AppliquerReglages(); // enregistre le raccourci, la vitesse de frappe, le démarrage
        }

        /// <summary>(Ré)applique les réglages qui ne sont pas lus à l'usage : raccourci global,
        /// vitesse de frappe, démarrage avec Windows.</summary>
        void AppliquerReglages()
        {
            var r = Reglages.Actuels;
            AutoType.DelaiCarMs = r.VitesseFrappeMs;
            UnregisterHotKey(Handle, IdRaccourci);
            if (!RegisterHotKey(Handle, IdRaccourci, r.RaccourciMods, r.RaccourciTouche))
                Notifier("Raccourci « " + Reglages.DecrireRaccourci(r.RaccourciMods, r.RaccourciTouche) +
                         " » indisponible (déjà utilisé). Choisis-en un autre dans les réglages.");
            r.AppliquerDemarrage();
        }

        void OuvrirReglages()
        {
            using (var fenetre = new FenetreReglages(Reglages.Actuels))
                if (fenetre.ShowDialog(this) == DialogResult.OK)
                    AppliquerReglages();
        }

        void SurSessionWindows(object s, SessionSwitchEventArgs e)
        {
            if (e.Reason == SessionSwitchReason.SessionLock && coffre.Deverrouille
                && Reglages.Actuels.VerrouSession)
                VerrouillerCoffre(null);
        }

        /// <summary>Inactivité utilisateur globale (souris/clavier) via GetLastInputInfo.</summary>
        void VerifierVerrouillageAuto()
        {
            int minutes = Reglages.Actuels.VerrouInactiviteMin;
            if (minutes <= 0 || !coffre.Deverrouille || !coffre.MaitreActif) return;
            var info = new DERNIERE_ENTREE();
            info.cbSize = (uint)Marshal.SizeOf(info);
            if (!GetLastInputInfo(ref info)) return;
            uint inactifMs = GetTickCount() - info.dwTime;
            if (inactifMs >= (uint)minutes * 60u * 1000u)
                VerrouillerCoffre("Coffre verrouillé après " + minutes + " min d'inactivité.");
        }

        void VerrouillerCoffre(string message)
        {
            coffre.Verrouiller();
            if (tray != null && message != null)
                tray.ShowBalloonTip(2000, "Mithril", message, ToolTipIcon.None);
        }

        void AfficherFenetre()
        {
            Show();
            WindowState = FormWindowState.Normal;
            Activate();
        }

        void QuitterReellement()
        {
            vraimentQuitter = true;
            Close();
        }

        /// <summary>
        /// Raccourci global / menu : remplit la fenêtre actuellement au premier plan sans
        /// ouvrir le coffre. Trouve l'entrée d'après le titre de la fenêtre ; propose un choix
        /// s'il y en a plusieurs. Déverrouille une fois si nécessaire.
        /// </summary>
        void RemplirFenetreActive()
        {
            if (frappeEnCours) return; // anti-réentrance (rafales de raccourci)
            IntPtr cible = AutoType.FenetreActive();
            string titre = AutoType.TitreFenetreActive();
            if (cible == IntPtr.Zero || cible == Handle)
            {
                Notifier("Aucune fenêtre cible active.");
                return;
            }
            if (AutoType.CibleProbablementElevee(cible))
            {
                Notifier("Fenêtre en mode administrateur : Windows y bloque la frappe. Utilise la copie.");
                return;
            }
            if (!coffre.Deverrouille)
            {
                AfficherFenetre();
                if (!AssurerCoffrePret(this)) return;
            }

            var candidats = coffre.Correspondances(titre);
            EntreeCoffre choisie;
            if (candidats.Count == 1)
            {
                choisie = candidats[0];
            }
            else if (candidats.Count > 1)
            {
                using (var s = new DialogueChoixEntree(candidats, titre))
                {
                    if (s.ShowDialog(this) != DialogResult.OK) return;
                    choisie = s.Choisie;
                }
            }
            else
            {
                using (var s = new DialogueChoixEntree(new System.Collections.Generic.List<EntreeCoffre>(coffre.Entrees), titre))
                {
                    if (s.ShowDialog(this) != DialogResult.OK) return;
                    choisie = s.Choisie;
                }
            }
            if (choisie == null) return;

            AutoType.RamenerAuPremierPlan(cible);
            var cible2 = choisie;
            frappeEnCours = true;
            AutoTypeCoffre.Frapper(cible, choisie, Reglages.Actuels.ValiderEntree, this, delegate(uint envoyes, byte[] png)
            {
                frappeEnCours = false;
                if (envoyes == 0) { Notifier("Rien n'a été tapé (fenêtre cible perdue)."); return; }
                if (png != null && cible2.Icone == null && coffre.Deverrouille)
                    try { coffre.DefinirIcone(cible2, png); } catch (CoffreException) { }
            });
        }

        void Notifier(string message)
        {
            if (tray != null) tray.ShowBalloonTip(2000, "Mithril", message, ToolTipIcon.None);
        }

        // --- Presse-papiers ---

        void Copier()
        {
            if (txtMdp.Text.Length == 0) return;
            PressePapiers.Copier(txtMdp.Text); // hors historique Win+V et presse-papiers cloud
            dernierCopie = txtMdp.Text;
            lblEtat.ForeColor = Palette.Accent;
            minuteur.Stop();
            int delai = Reglages.Actuels.VidagePressePapiersS;
            if (intEffacer.Coche && delai > 0)
            {
                secondesRestantes = delai;
                lblEtat.Text = "Copié — le presse-papiers sera vidé dans " + delai + " s.";
                minuteur.Start();
            }
            else
            {
                lblEtat.Text = "Copié dans le presse-papiers.";
            }
        }

        void SurTic(object s, EventArgs e)
        {
            secondesRestantes--;
            if (secondesRestantes <= 0)
                ViderPressePapiers();
            else
                lblEtat.Text = string.Format("Copié — le presse-papiers sera vidé dans {0} s.", secondesRestantes);
        }

        /// <summary>Ne vide que si le presse-papiers contient toujours notre mot de passe.</summary>
        void ViderPressePapiers()
        {
            minuteur.Stop();
            try
            {
                if (Clipboard.ContainsText() && Clipboard.GetText() == dernierCopie)
                {
                    Clipboard.Clear();
                    lblEtat.Text = "Presse-papiers vidé.";
                }
                else
                {
                    lblEtat.Text = "";
                }
            }
            catch
            {
                // Presse-papiers verrouillé par une autre appli : on laisse tomber.
            }
        }

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new Fenetre());
        }
    }
}
