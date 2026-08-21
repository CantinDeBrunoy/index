using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace Mithril
{
    /// <summary>Sélecteur segmenté (choix unique) dessiné dans le thème sombre.</summary>
    class Segment : Control
    {
        readonly string[] libelles;
        readonly int[] valeurs;
        int index;
        int survol = -1;

        public Segment(string[] libelles, int[] valeurs, int valeurInitiale)
        {
            this.libelles = libelles;
            this.valeurs = valeurs;
            int i = Array.IndexOf(valeurs, valeurInitiale);
            index = i < 0 ? 0 : i;
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint |
                     ControlStyles.OptimizedDoubleBuffer | ControlStyles.ResizeRedraw |
                     ControlStyles.Selectable, true);
            TabStop = true;
            Cursor = Cursors.Hand;
            Height = 32;
        }

        public int Valeur { get { return valeurs[index]; } }

        int SegmentEn(int x)
        {
            int largeur = Width / libelles.Length;
            return Math.Max(0, Math.Min(libelles.Length - 1, x / largeur));
        }

        protected override void OnMouseDown(MouseEventArgs e) { Focus(); Choisir(SegmentEn(e.X)); base.OnMouseDown(e); }
        protected override void OnMouseMove(MouseEventArgs e)
        {
            int s = SegmentEn(e.X);
            if (s != survol) { survol = s; Invalidate(); }
            base.OnMouseMove(e);
        }
        protected override void OnMouseLeave(EventArgs e) { survol = -1; Invalidate(); base.OnMouseLeave(e); }
        protected override void OnGotFocus(EventArgs e) { Invalidate(); base.OnGotFocus(e); }
        protected override void OnLostFocus(EventArgs e) { Invalidate(); base.OnLostFocus(e); }

        protected override bool IsInputKey(Keys donnee)
        {
            return donnee == Keys.Left || donnee == Keys.Right || base.IsInputKey(donnee);
        }

        protected override void OnKeyDown(KeyEventArgs e)
        {
            if (e.KeyCode == Keys.Left) { Choisir(index - 1); e.Handled = true; }
            else if (e.KeyCode == Keys.Right) { Choisir(index + 1); e.Handled = true; }
            base.OnKeyDown(e);
        }

        void Choisir(int i)
        {
            i = Math.Max(0, Math.Min(libelles.Length - 1, i));
            if (i == index) return;
            index = i;
            Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            var g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            using (var chemin = Dessin.Arrondi(new Rectangle(0, 0, Width - 1, Height - 1), 8))
            {
                using (var p = new SolidBrush(Palette.Creux)) g.FillPath(p, chemin);
                using (var s = new Pen(Palette.Bordure)) g.DrawPath(s, chemin);
            }
            int largeur = Width / libelles.Length;
            for (int i = 0; i < libelles.Length; i++)
            {
                int x = i * largeur;
                int l = (i == libelles.Length - 1) ? Width - x : largeur;
                var r = new Rectangle(x, 0, l, Height);
                if (i == index)
                    using (var chemin = Dessin.Arrondi(new Rectangle(r.X + 2, r.Y + 2, r.Width - 4, r.Height - 4), 6))
                    using (var p = new SolidBrush(Palette.Accent)) g.FillPath(p, chemin);
                Color c = i == index ? Palette.TexteSurAccent
                        : i == survol ? Palette.Texte : Palette.TexteSecondaire;
                TextRenderer.DrawText(g, libelles[i], Font, r, c,
                    TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.SingleLine);
            }
            if (Focused)
                using (var chemin = Dessin.Arrondi(new Rectangle(1, 1, Width - 3, Height - 3), 7))
                using (var s = new Pen(Palette.AccentSurvol)) g.DrawPath(s, chemin);
        }
    }

    /// <summary>Champ de capture d'un raccourci clavier : clic, puis une combinaison.</summary>
    class ChampRaccourci : Control
    {
        uint mods, touche;
        bool capture;

        public ChampRaccourci(uint modsInit, uint toucheInit)
        {
            mods = modsInit; touche = toucheInit;
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint |
                     ControlStyles.OptimizedDoubleBuffer | ControlStyles.ResizeRedraw |
                     ControlStyles.Selectable, true);
            TabStop = true;
            Cursor = Cursors.Hand;
            Height = 32;
        }

        public uint Mods { get { return mods; } }
        public uint Touche { get { return touche; } }

        protected override void OnMouseDown(MouseEventArgs e) { Focus(); capture = true; Invalidate(); base.OnMouseDown(e); }
        protected override void OnLostFocus(EventArgs e) { capture = false; Invalidate(); base.OnLostFocus(e); }
        protected override void OnGotFocus(EventArgs e) { Invalidate(); base.OnGotFocus(e); }

        protected override bool IsInputKey(Keys donnee) { return true; } // on capte tout en mode capture

        protected override void OnKeyDown(KeyEventArgs e)
        {
            if (!capture) return;
            e.Handled = true;
            if (e.KeyCode == Keys.Escape) { capture = false; Invalidate(); return; }
            // Attendre une vraie touche (pas seulement un modificateur).
            if (e.KeyCode == Keys.Menu || e.KeyCode == Keys.ControlKey ||
                e.KeyCode == Keys.ShiftKey || e.KeyCode == Keys.LWin || e.KeyCode == Keys.RWin)
                return;
            uint m = 0;
            if (e.Alt) m |= 0x0001;
            if (e.Control) m |= 0x0002;
            if (e.Shift) m |= 0x0004;
            if (m == 0) return; // exiger au moins un modificateur, sinon on volerait des touches
            mods = m; touche = (uint)e.KeyCode; capture = false; Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            var g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            using (var chemin = Dessin.Arrondi(new Rectangle(0, 0, Width - 1, Height - 1), 8))
            {
                using (var p = new SolidBrush(Palette.Creux)) g.FillPath(p, chemin);
                using (var s = new Pen(capture || Focused ? Palette.AccentSurvol : Palette.Bordure))
                    g.DrawPath(s, chemin);
            }
            string txt = capture ? "Appuyez sur une combinaison…" : Reglages.DecrireRaccourci(mods, touche);
            TextRenderer.DrawText(g, txt, Font, new Rectangle(0, 0, Width, Height),
                capture ? Palette.Accent : Palette.Texte,
                TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.SingleLine);
        }
    }

    /// <summary>Fenêtre de réglages : édite une copie de Reglages.Actuels, enregistre à la validation.</summary>
    class FenetreReglages : FormeSombre
    {
        readonly Reglages travail;

        // Contrôles conservés pour la lecture à l'enregistrement.
        Segment segVerrou, segIterations, segVidage, segVitesse;
        Interrupteur intSession, intReduction, intSeqId, intValider, intIcones, intDemarrer, intFermer;
        ChampRaccourci champRaccourci;

        public FenetreReglages(Reglages actuels)
        {
            travail = actuels.Copie();
            Text = "Mithril — Réglages";
            ClientSize = new Size(620, 640);
            ShowInTaskbar = false;

            var defilement = new Panel();
            defilement.SetBounds(0, 0, 620, 580);
            defilement.AutoScroll = true;
            defilement.BackColor = Palette.Fond;
            Controls.Add(defilement);

            int y = 8;
            Eyebrow(defilement, ref y, "SÉCURITÉ DU COFFRE");
            segVerrou = LigneSegment(defilement, ref y,
                "Verrouillage automatique après inactivité",
                "Reverrouille le coffre après une période sans souris ni clavier.",
                new[] { "Jamais", "1 min", "5 min", "15 min", "30 min" },
                new[] { 0, 1, 5, 15, 30 }, travail.VerrouInactiviteMin);
            intSession = LigneToggle(defilement, ref y,
                "Verrouiller au verrouillage de la session Windows",
                "Dès que tu verrouilles ton PC (Win+L), le coffre se ferme avec.", travail.VerrouSession);
            intReduction = LigneToggle(defilement, ref y,
                "Verrouiller en réduisant dans la barre d'état",
                "Plus strict : le coffre se ferme dès que la fenêtre part dans la zone de notification.", travail.VerrouReduction);
            segIterations = LigneSegment(defilement, ref y,
                "Robustesse du mot de passe maître",
                "Itérations PBKDF2. Plus élevé = plus lent à forcer. Appliqué à la prochaine définition du maître.",
                new[] { "Standard", "Élevé" },
                new[] { 600000, 1200000 }, travail.IterationsMaitre);

            Eyebrow(defilement, ref y, "PRESSE-PAPIERS");
            segVidage = LigneSegment(defilement, ref y,
                "Vider le presse-papiers après copie",
                "Efface le mot de passe copié après ce délai, s'il n'a pas été remplacé entre-temps.",
                new[] { "Jamais", "30 s", "60 s", "2 min" },
                new[] { 0, 30, 60, 120 }, travail.VidagePressePapiersS);

            Eyebrow(defilement, ref y, "FRAPPE AUTOMATIQUE");
            champRaccourci = LigneRaccourci(defilement, ref y,
                "Raccourci global",
                "Remplit la fenêtre active sans ouvrir le coffre.", travail.RaccourciMods, travail.RaccourciTouche);
            intSeqId = LigneToggle(defilement, ref y,
                "Taper « identifiant → Tab → mot de passe »",
                "Remplit les deux champs d'un coup si l'entrée a un identifiant.", travail.SequenceIdentifiant);
            intValider = LigneToggle(defilement, ref y,
                "Valider avec Entrée après la frappe",
                "Soumet le formulaire. À réserver aux cibles sûres.", travail.ValiderEntree);
            segVitesse = LigneSegment(defilement, ref y,
                "Vitesse de frappe",
                "Délai entre caractères. Ralentis si une application perd des caractères.",
                new[] { "Rapide", "Normale", "Lente" },
                new[] { 3, 6, 12 }, travail.VitesseFrappeMs);
            intIcones = LigneToggle(defilement, ref y,
                "Apprendre l'icône des applications",
                "Capture l'icône de l'appli cible au premier auto-type (navigateurs exclus).", travail.ApprendreIcones);

            Eyebrow(defilement, ref y, "APPLICATION");
            intDemarrer = LigneToggle(defilement, ref y,
                "Lancer Mithril au démarrage de Windows",
                "Le coffre reste verrouillé au lancement.", travail.DemarrerAvecWindows);
            intFermer = LigneToggle(defilement, ref y,
                "Fermer réduit dans la barre d'état",
                "La croix range Mithril dans la zone de notification au lieu de quitter.", travail.FermerReduit);

            // Barre de boutons.
            var barre = new Panel();
            barre.SetBounds(0, 580, 620, 60);
            barre.BackColor = Palette.Carte;
            barre.Paint += delegate(object s, PaintEventArgs e)
            {
                using (var stylo = new Pen(Palette.Bordure)) e.Graphics.DrawLine(stylo, 0, 0, 620, 0);
            };
            Controls.Add(barre);

            var btnAnnuler = new Bouton();
            btnAnnuler.SetBounds(360, 12, 118, 36);
            btnAnnuler.Text = "Annuler";
            btnAnnuler.Font = new Font("Segoe UI Semibold", 9.75F);
            btnAnnuler.DialogResult = DialogResult.Cancel;
            barre.Controls.Add(btnAnnuler);

            var btnEnreg = new Bouton();
            btnEnreg.Primaire = true;
            btnEnreg.SetBounds(488, 12, 118, 36);
            btnEnreg.Text = "Enregistrer";
            btnEnreg.Font = new Font("Segoe UI Semibold", 9.75F);
            btnEnreg.Click += delegate { Enregistrer(); };
            barre.Controls.Add(btnEnreg);

            AcceptButton = btnEnreg;
            CancelButton = btnAnnuler;
        }

        void Enregistrer()
        {
            travail.VerrouInactiviteMin = segVerrou.Valeur;
            travail.VerrouSession = intSession.Coche;
            travail.VerrouReduction = intReduction.Coche;
            travail.IterationsMaitre = segIterations.Valeur;
            travail.VidagePressePapiersS = segVidage.Valeur;
            travail.RaccourciMods = champRaccourci.Mods;
            travail.RaccourciTouche = champRaccourci.Touche;
            travail.SequenceIdentifiant = intSeqId.Coche;
            travail.ValiderEntree = intValider.Coche;
            travail.VitesseFrappeMs = segVitesse.Valeur;
            travail.ApprendreIcones = intIcones.Coche;
            travail.DemarrerAvecWindows = intDemarrer.Coche;
            travail.FermerReduit = intFermer.Coche;

            Reglages.Actuels = travail;
            travail.Sauver();
            DialogResult = DialogResult.OK;
        }

        // --- Constructeurs de lignes ---

        const int MargeG = 24, LargeurTexte = 320, XControle = 360, LargeurControle = 236;

        void Eyebrow(Control parent, ref int y, string texte)
        {
            var lbl = new Label();
            lbl.SetBounds(MargeG, y + 10, 400, 16);
            lbl.Text = texte;
            lbl.Font = new Font("Segoe UI", 8F, FontStyle.Bold);
            lbl.ForeColor = Palette.TexteSecondaire;
            parent.Controls.Add(lbl);
            y += 34;
        }

        void TitreEtAide(Control parent, int y, string titre, string aide)
        {
            var t = new Label();
            t.SetBounds(MargeG, y, LargeurTexte, 20);
            t.Text = titre;
            t.Font = new Font("Segoe UI Semibold", 9.75F);
            t.ForeColor = Palette.Texte;
            parent.Controls.Add(t);

            var a = new Label();
            a.SetBounds(MargeG, y + 20, LargeurTexte, 34);
            a.Text = aide;
            a.Font = new Font("Segoe UI", 8.25F);
            a.ForeColor = Palette.TexteSecondaire;
            parent.Controls.Add(a);
        }

        Interrupteur LigneToggle(Control parent, ref int y, string titre, string aide, bool valeur)
        {
            TitreEtAide(parent, y, titre, aide);
            var inter = new Interrupteur();
            inter.SetBounds(XControle + LargeurControle - 44, y + 6, 44, 26);
            inter.Coche = valeur;
            parent.Controls.Add(inter);
            y += 62;
            return inter;
        }

        Segment LigneSegment(Control parent, ref int y, string titre, string aide, string[] libelles, int[] valeurs, int valeur)
        {
            TitreEtAide(parent, y, titre, aide);
            var seg = new Segment(libelles, valeurs, valeur);
            seg.SetBounds(XControle, y + 8, LargeurControle, 32);
            seg.Font = new Font("Segoe UI", 8.5F);
            parent.Controls.Add(seg);
            y += 62;
            return seg;
        }

        ChampRaccourci LigneRaccourci(Control parent, ref int y, string titre, string aide, uint mods, uint touche)
        {
            TitreEtAide(parent, y, titre, aide);
            var champ = new ChampRaccourci(mods, touche);
            champ.SetBounds(XControle, y + 8, LargeurControle, 32);
            champ.Font = new Font("Segoe UI Semibold", 9.75F);
            parent.Controls.Add(champ);
            y += 62;
            return champ;
        }
    }
}
