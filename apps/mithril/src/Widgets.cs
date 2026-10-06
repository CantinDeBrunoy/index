using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace Mithril
{
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
}
