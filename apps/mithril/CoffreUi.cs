using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Microsoft.Win32;

namespace MdpGen
{
    /// <summary>Copie durcie : demande à Windows d'exclure le texte de l'historique
    /// du presse-papiers (Win+V) et de la synchronisation cloud.</summary>
    static class PressePapiers
    {
        public static void Copier(string texte)
        {
            var objet = new DataObject();
            objet.SetData(DataFormats.UnicodeText, texte);
            // Ces formats portent un DWORD lu par Windows : 0 = ne pas retenir.
            objet.SetData("CanIncludeInClipboardHistory", new MemoryStream(BitConverter.GetBytes(0)));
            objet.SetData("CanUploadToCloudClipboard", new MemoryStream(BitConverter.GetBytes(0)));
            objet.SetData("ExcludeClipboardContentFromMonitorProcessing", new MemoryStream(BitConverter.GetBytes(0)));
            Clipboard.SetDataObject(objet, true);
        }
    }

    /// <summary>Socle des fenêtres secondaires : thème sombre + barre de titre sombre.</summary>
    class FormeSombre : Form
    {
        [DllImport("dwmapi.dll")]
        static extern int DwmSetWindowAttribute(IntPtr fenetre, int attribut, ref int valeur, int taille);

        public FormeSombre()
        {
            FormBorderStyle = FormBorderStyle.FixedSingle;
            MaximizeBox = false;
            MinimizeBox = false;
            ShowInTaskbar = false;
            StartPosition = FormStartPosition.CenterParent;
            BackColor = Palette.Fond;
            ForeColor = Palette.Texte;
            Font = new Font("Segoe UI", 9.75F);
        }

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
    }

    /// <summary>Petites briques d'interface partagées par les fenêtres du coffre.</summary>
    static class Ui
    {
        /// <summary>Champ de saisie dans un cadre arrondi, assorti au thème.</summary>
        public static TextBox Champ(Control parent, int x, int y, int largeur, bool masque)
        {
            var panneau = new Panel();
            panneau.SetBounds(x, y, largeur, 34);
            panneau.BackColor = Palette.Fond;
            panneau.Paint += delegate(object s, PaintEventArgs e)
            {
                e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
                using (var chemin = Dessin.Arrondi(new Rectangle(0, 0, panneau.Width - 1, panneau.Height - 1), 8))
                {
                    using (var pinceau = new SolidBrush(Palette.Creux)) e.Graphics.FillPath(pinceau, chemin);
                    using (var stylo = new Pen(Palette.Bordure)) e.Graphics.DrawPath(stylo, chemin);
                }
            };
            var txt = new TextBox();
            txt.SetBounds(10, 7, largeur - 20, 20);
            txt.BorderStyle = BorderStyle.None;
            txt.BackColor = Palette.Creux;
            txt.ForeColor = Palette.Texte;
            txt.Font = new Font("Segoe UI", 10.5F);
            if (masque) txt.UseSystemPasswordChar = true;
            panneau.Controls.Add(txt);
            parent.Controls.Add(panneau);
            return txt;
        }

        public static Label Etiquette(Control parent, int x, int y, int largeur, string texte, bool secondaire)
        {
            var lbl = new Label();
            lbl.SetBounds(x, y, largeur, secondaire ? 60 : 18);
            lbl.Text = texte;
            lbl.ForeColor = secondaire ? Palette.TexteSecondaire : Palette.Texte;
            parent.Controls.Add(lbl);
            return lbl;
        }

        public static Bouton Fabriquer(Control parent, int x, int y, int l, int h, string texte, bool primaire)
        {
            var btn = new Bouton();
            btn.Primaire = primaire;
            btn.SetBounds(x, y, l, h);
            btn.Text = texte;
            btn.Font = new Font("Segoe UI Semibold", 9.75F);
            parent.Controls.Add(btn);
            return btn;
        }
    }

    /// <summary>Saisie du mot de passe maître (création ou remplacement).</summary>
    class DialogueMaitre : FormeSombre
    {
        public string Maitre;

        public DialogueMaitre(bool premier)
        {
            Text = premier ? "Définir le mot de passe maître" : "Changer le mot de passe maître";
            ClientSize = new Size(440, 320);

            var titre = Ui.Etiquette(this, 24, 20, 392, Text, false);
            titre.Font = new Font("Segoe UI Semibold", 11F);
            titre.Height = 24;

            Ui.Etiquette(this, 24, 52, 392,
                "Il chiffre le coffre par-dessus ta session Windows. Il n'existe aucun moyen " +
                "de le récupérer : oublié = coffre perdu. Vise 12 caractères ou plus.", true);

            Ui.Etiquette(this, 24, 120, 392, "Nouveau mot de passe maître", false);
            var champ1 = Ui.Champ(this, 24, 140, 392, true);
            Ui.Etiquette(this, 24, 186, 392, "Confirme-le", false);
            var champ2 = Ui.Champ(this, 24, 206, 392, true);

            var lblErreur = Ui.Etiquette(this, 24, 248, 392, "", false);
            lblErreur.ForeColor = Palette.Faible;

            var btnAnnuler = Ui.Fabriquer(this, 216, 264, 94, 42, "Annuler", false);
            btnAnnuler.DialogResult = DialogResult.Cancel;
            var btnValider = Ui.Fabriquer(this, 322, 264, 94, 42, "Valider", true);
            btnValider.Click += delegate
            {
                if (champ1.Text.Length < 8)
                    lblErreur.Text = "8 caractères minimum (12 ou plus recommandés).";
                else if (champ1.Text != champ2.Text)
                    lblErreur.Text = "Les deux saisies ne correspondent pas.";
                else
                {
                    Maitre = champ1.Text;
                    DialogResult = DialogResult.OK;
                }
            };
            AcceptButton = btnValider;
            CancelButton = btnAnnuler;
        }
    }

    /// <summary>Saisie du maître pour ouvrir un coffre verrouillé ; valide sur place.</summary>
    class DialogueDeverrouiller : FormeSombre
    {
        public DialogueDeverrouiller(Coffre coffre)
        {
            Text = "Coffre verrouillé";
            ClientSize = new Size(440, 216);

            var titre = Ui.Etiquette(this, 24, 20, 392, "Coffre verrouillé", false);
            titre.Font = new Font("Segoe UI Semibold", 11F);
            titre.Height = 24;
            Ui.Etiquette(this, 24, 48, 392, "Saisis le mot de passe maître pour continuer.", true).Height = 20;

            var champ = Ui.Champ(this, 24, 78, 392, true);
            var lblErreur = Ui.Etiquette(this, 24, 120, 392, "", false);
            lblErreur.ForeColor = Palette.Faible;

            var btnAnnuler = Ui.Fabriquer(this, 190, 152, 94, 42, "Annuler", false);
            btnAnnuler.DialogResult = DialogResult.Cancel;
            var btnOuvrir = Ui.Fabriquer(this, 296, 152, 120, 42, "Déverrouiller", true);
            btnOuvrir.Click += delegate
            {
                try
                {
                    coffre.Deverrouiller(champ.Text);
                    DialogResult = DialogResult.OK;
                }
                catch (CoffreException ex)
                {
                    lblErreur.Text = ex.Message;
                    champ.SelectAll();
                    champ.Focus();
                }
            };
            AcceptButton = btnOuvrir;
            CancelButton = btnAnnuler;
        }
    }

    /// <summary>Libellé + identifiant pour enregistrer le mot de passe affiché.</summary>
    class DialogueAjout : FormeSombre
    {
        public string Libelle;
        public string Identifiant;

        public DialogueAjout()
        {
            Text = "Enregistrer dans le coffre";
            ClientSize = new Size(440, 262);

            var titre = Ui.Etiquette(this, 24, 20, 392, "Enregistrer dans le coffre", false);
            titre.Font = new Font("Segoe UI Semibold", 11F);
            titre.Height = 24;

            Ui.Etiquette(this, 24, 56, 392, "Libellé (site, service...)", false);
            var champLibelle = Ui.Champ(this, 24, 76, 392, false);
            Ui.Etiquette(this, 24, 122, 392, "Identifiant (optionnel)", false);
            var champId = Ui.Champ(this, 24, 142, 392, false);

            var lblErreur = Ui.Etiquette(this, 24, 184, 392, "", false);
            lblErreur.ForeColor = Palette.Faible;

            var btnAnnuler = Ui.Fabriquer(this, 200, 198, 94, 42, "Annuler", false);
            btnAnnuler.DialogResult = DialogResult.Cancel;
            var btnOk = Ui.Fabriquer(this, 306, 198, 110, 42, "Enregistrer", true);
            btnOk.Click += delegate
            {
                if (champLibelle.Text.Trim().Length == 0)
                {
                    lblErreur.Text = "Donne un libellé pour retrouver l'entrée.";
                    return;
                }
                Libelle = champLibelle.Text.Trim();
                Identifiant = champId.Text.Trim();
                DialogResult = DialogResult.OK;
            };
            AcceptButton = btnOk;
            CancelButton = btnAnnuler;
        }
    }

    /// <summary>Une ligne du coffre : libellé, identifiant, mot de passe masqué, actions.</summary>
    class LigneEntree : Control
    {
        readonly FenetreCoffre parent;
        readonly Coffre coffre;
        readonly EntreeCoffre entree;
        readonly BoutonIcone icoOeil;
        readonly BoutonIcone icoSuppr;
        readonly Timer remasque = new Timer();
        readonly Timer confirmation = new Timer();
        string mdpVisible; // non null = révélé
        bool confirmeSuppr;

        public LigneEntree(FenetreCoffre parent, Coffre coffre, EntreeCoffre entree, ToolTip infobulle)
        {
            this.parent = parent;
            this.coffre = coffre;
            this.entree = entree;
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint |
                     ControlStyles.OptimizedDoubleBuffer | ControlStyles.ResizeRedraw, true);
            Height = 52;
            TabStop = false;

            icoOeil = new BoutonIcone("", "Afficher 8 secondes", infobulle);
            icoOeil.Click += delegate { BasculerRevelation(); };
            Controls.Add(icoOeil);

            var icoCopie = new BoutonIcone("", "Copier", infobulle);
            icoCopie.Click += delegate
            {
                PressePapiers.Copier(entree.RevelerMdp());
                parent.MontrerStatut("Copié — presse-papiers hors historique Windows, vidé par la fenêtre principale.", false);
            };
            Controls.Add(icoCopie);

            icoSuppr = new BoutonIcone("", "Supprimer (deux clics)", infobulle);
            icoSuppr.Click += delegate { Supprimer(); };
            Controls.Add(icoSuppr);

            remasque.Interval = 8000;
            remasque.Tick += delegate { Masquer(); };
            confirmation.Interval = 3000;
            confirmation.Tick += delegate { AnnulerConfirmation(); };

            Resize += delegate
            {
                icoOeil.SetBounds(Width - 106, 12, 28, 28);
                icoCopie.SetBounds(Width - 72, 12, 28, 28);
                icoSuppr.SetBounds(Width - 38, 12, 28, 28);
            };
        }

        void BasculerRevelation()
        {
            if (mdpVisible != null) { Masquer(); return; }
            mdpVisible = entree.RevelerMdp();
            remasque.Start();
            parent.SignalerActivite();
            Invalidate();
        }

        void Masquer()
        {
            remasque.Stop();
            mdpVisible = null;
            Invalidate();
        }

        void Supprimer()
        {
            if (!confirmeSuppr)
            {
                confirmeSuppr = true;
                icoSuppr.Teinte = Palette.Faible;
                parent.MontrerStatut("Clique à nouveau sur la corbeille pour supprimer « " + entree.Libelle + " ».", false);
                confirmation.Start();
                return;
            }
            confirmation.Stop();
            coffre.Supprimer(entree);
            parent.MontrerStatut("Entrée supprimée.", false);
            parent.Rafraichir();
        }

        void AnnulerConfirmation()
        {
            confirmation.Stop();
            confirmeSuppr = false;
            icoSuppr.Teinte = null;
            Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            var g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            using (var chemin = Dessin.Arrondi(new Rectangle(0, 0, Width - 1, Height - 1), 10))
            {
                using (var pinceau = new SolidBrush(Palette.Carte)) g.FillPath(pinceau, chemin);
                using (var stylo = new Pen(Palette.Bordure)) g.DrawPath(stylo, chemin);
            }

            TextRenderer.DrawText(g, entree.Libelle, parent.PoliceLibelle,
                new Rectangle(14, 7, 210, 20), Palette.Texte,
                TextFormatFlags.Left | TextFormatFlags.EndEllipsis | TextFormatFlags.SingleLine);

            string sousTexte = string.IsNullOrEmpty(entree.Identifiant)
                ? entree.Creation.ToString("dd/MM/yyyy")
                : entree.Identifiant + "  ·  " + entree.Creation.ToString("dd/MM/yyyy");
            TextRenderer.DrawText(g, sousTexte, parent.PoliceSous,
                new Rectangle(14, 28, 210, 18), Palette.TexteSecondaire,
                TextFormatFlags.Left | TextFormatFlags.EndEllipsis | TextFormatFlags.SingleLine);

            string affiche = mdpVisible != null ? mdpVisible : "●●●●●●●●";
            TextRenderer.DrawText(g, affiche, parent.PoliceMdp,
                new Rectangle(230, 0, Width - 230 - 112, Height),
                mdpVisible != null ? Palette.Texte : Palette.TexteSecondaire,
                TextFormatFlags.Right | TextFormatFlags.VerticalCenter |
                TextFormatFlags.EndEllipsis | TextFormatFlags.SingleLine);
        }

        protected override void Dispose(bool liberation)
        {
            if (liberation)
            {
                remasque.Dispose();
                confirmation.Dispose();
                mdpVisible = null;
            }
            base.Dispose(liberation);
        }
    }

    /// <summary>
    /// Fenêtre du coffre. Verrouillages automatiques : inactivité (5 min), verrouillage de
    /// la session Windows, fermeture de la fenêtre — dans tous les cas les secrets sont
    /// effacés de la mémoire.
    /// </summary>
    class FenetreCoffre : FormeSombre, IMessageFilter
    {
        readonly Coffre coffre;
        readonly Panel pnlListe = new Panel();
        readonly Panel pnlVerrou = new Panel();
        readonly Label lblCompte = new Label();
        readonly Label lblStatut = new Label();
        readonly Label lblVide = new Label();
        readonly TextBox champMaitre;
        readonly Label lblErreurVerrou;
        readonly Bouton btnVerrou;
        readonly Bouton btnExport;
        readonly Bouton btnMaitre;
        readonly Bouton btnRetirer;
        readonly Timer surveillance = new Timer();
        readonly ToolTip infobulle = new ToolTip();
        DateTime derniereActivite = DateTime.Now;

        public readonly Font PoliceLibelle = new Font("Segoe UI Semibold", 9.75F);
        public readonly Font PoliceSous = new Font("Segoe UI", 8.5F);
        public readonly Font PoliceMdp = new Font("Consolas", 9.75F);

        public FenetreCoffre(Coffre coffre)
        {
            this.coffre = coffre;
            Text = "Mithril — Coffre";
            ClientSize = new Size(600, 540);

            // --- Vue liste ---
            var eyebrow = new Label();
            eyebrow.SetBounds(28, 20, 200, 16);
            eyebrow.Text = "COFFRE";
            eyebrow.Font = new Font("Segoe UI", 8F, FontStyle.Bold);
            eyebrow.ForeColor = Palette.TexteSecondaire;
            Controls.Add(eyebrow);

            lblCompte.SetBounds(300, 18, 272, 18);
            lblCompte.TextAlign = ContentAlignment.MiddleRight;
            lblCompte.ForeColor = Palette.TexteSecondaire;
            Controls.Add(lblCompte);

            pnlListe.SetBounds(28, 48, 544, 396);
            pnlListe.AutoScroll = true;
            pnlListe.BackColor = Palette.Fond;
            Controls.Add(pnlListe);

            lblVide.SetBounds(28, 200, 544, 60);
            lblVide.Text = "Aucun mot de passe enregistré.\r\n" +
                "Génère un mot de passe puis utilise le bouton « Enregistrer » de la fenêtre principale.";
            lblVide.TextAlign = ContentAlignment.MiddleCenter;
            lblVide.ForeColor = Palette.TexteSecondaire;
            Controls.Add(lblVide);

            btnVerrou = Ui.Fabriquer(this, 28, 456, 120, 40, "Verrouiller", false);
            btnVerrou.Click += delegate { RetournerAuSeuil(); };
            btnExport = Ui.Fabriquer(this, 156, 456, 110, 40, "Exporter", false);
            btnExport.Click += delegate { Exporter(); };
            btnMaitre = Ui.Fabriquer(this, 274, 456, 158, 40, "Définir un maître", false);
            btnMaitre.Click += delegate { DefinirOuChangerMaitre(); };
            btnRetirer = Ui.Fabriquer(this, 440, 456, 132, 40, "Retirer le maître", false);
            btnRetirer.Click += delegate { RetirerMaitre(); };

            lblStatut.SetBounds(28, 506, 544, 20);
            lblStatut.TextAlign = ContentAlignment.MiddleCenter;
            lblStatut.ForeColor = Palette.Accent;
            Controls.Add(lblStatut);

            // --- Vue verrouillée ---
            pnlVerrou.SetBounds(0, 0, 600, 540);
            pnlVerrou.BackColor = Palette.Fond;

            var cadenas = new Label();
            cadenas.SetBounds(0, 120, 600, 60);
            cadenas.Text = "";
            cadenas.Font = new Font("Segoe MDL2 Assets", 32F);
            cadenas.ForeColor = Palette.TexteSecondaire;
            cadenas.TextAlign = ContentAlignment.MiddleCenter;
            pnlVerrou.Controls.Add(cadenas);

            var message = new Label();
            message.SetBounds(100, 196, 400, 40);
            message.Text = "Ce coffre est protégé par un mot de passe maître.";
            message.TextAlign = ContentAlignment.MiddleCenter;
            message.ForeColor = Palette.Texte;
            pnlVerrou.Controls.Add(message);

            champMaitre = Ui.Champ(pnlVerrou, 170, 244, 260, true);
            lblErreurVerrou = Ui.Etiquette(pnlVerrou, 100, 290, 400, "", false);
            lblErreurVerrou.ForeColor = Palette.Faible;
            lblErreurVerrou.TextAlign = ContentAlignment.MiddleCenter;

            var btnOuvrir = Ui.Fabriquer(pnlVerrou, 200, 326, 200, 44, "Déverrouiller", true);
            btnOuvrir.Click += delegate { Deverrouiller(); };
            Controls.Add(pnlVerrou);
            AcceptButton = btnOuvrir; // Entrée déverrouille depuis le champ du maître

            surveillance.Interval = 10000;
            surveillance.Tick += delegate { VerifierInactivite(); };
        }

        protected override void OnLoad(EventArgs e)
        {
            base.OnLoad(e);
            try
            {
                coffre.Ouvrir();
            }
            catch (CoffreException ex)
            {
                MessageBox.Show(this, ex.Message, "Mithril", MessageBoxButtons.OK, MessageBoxIcon.Error);
                Close();
                return;
            }
            Application.AddMessageFilter(this);
            SystemEvents.SessionSwitch += SurSession;
            surveillance.Start();
            AfficherVue();
        }

        protected override void OnFormClosed(FormClosedEventArgs e)
        {
            surveillance.Stop();
            Application.RemoveMessageFilter(this);
            SystemEvents.SessionSwitch -= SurSession;
            coffre.Verrouiller(); // fermer = effacer les secrets de la mémoire
            base.OnFormClosed(e);
        }

        // --- Verrouillages automatiques ---

        public bool PreFilterMessage(ref Message m)
        {
            // 0x100 = WM_KEYDOWN, 0x200 = WM_MOUSEMOVE, 0x201 = WM_LBUTTONDOWN
            if (m.Msg == 0x100 || m.Msg == 0x200 || m.Msg == 0x201) derniereActivite = DateTime.Now;
            return false;
        }

        public void SignalerActivite() { derniereActivite = DateTime.Now; }

        void VerifierInactivite()
        {
            if (coffre.Deverrouille && coffre.MaitreActif &&
                (DateTime.Now - derniereActivite).TotalMinutes >= 5)
            {
                RetournerAuSeuil();
                MontrerStatut("Coffre verrouillé après 5 minutes d'inactivité.", false);
            }
        }

        void SurSession(object s, SessionSwitchEventArgs e)
        {
            if (e.Reason == SessionSwitchReason.SessionLock)
            {
                coffre.Verrouiller();
                Close(); // session Windows verrouillée : le coffre se ferme avec
            }
        }

        // --- Vues ---

        void RetournerAuSeuil()
        {
            try
            {
                coffre.Verrouiller();
                coffre.Ouvrir(); // recharge et s'arrête au seuil si un maître existe
            }
            catch (CoffreException ex)
            {
                MontrerStatut(ex.Message, true);
                return;
            }
            AfficherVue();
        }

        void Deverrouiller()
        {
            if (coffre.Deverrouille) return; // Entrée pressée alors que la liste est déjà ouverte
            try
            {
                coffre.Deverrouiller(champMaitre.Text);
                champMaitre.Text = "";
                SignalerActivite();
                AfficherVue();
            }
            catch (CoffreException ex)
            {
                lblErreurVerrou.Text = ex.Message;
                champMaitre.SelectAll();
                champMaitre.Focus();
            }
        }

        void AfficherVue()
        {
            bool verrouille = !coffre.Deverrouille;
            pnlVerrou.Visible = verrouille;
            if (verrouille)
            {
                pnlVerrou.BringToFront();
                lblErreurVerrou.Text = "";
                champMaitre.Focus();
                return;
            }
            Rafraichir();
        }

        /// <summary>Reconstruit la liste et adapte les boutons du bas.</summary>
        public void Rafraichir()
        {
            foreach (Control ancien in new System.Collections.ArrayList(pnlListe.Controls))
                ancien.Dispose();
            pnlListe.Controls.Clear();

            int y = 0;
            foreach (var entree in coffre.Entrees)
            {
                var ligne = new LigneEntree(this, coffre, entree, infobulle);
                ligne.SetBounds(0, y, 522, 52);
                pnlListe.Controls.Add(ligne);
                y += 60;
            }

            int nombre = coffre.Entrees.Count;
            lblVide.Visible = nombre == 0;
            lblCompte.Text = nombre == 0 ? "" : nombre == 1 ? "1 mot de passe" : nombre + " mots de passe";

            bool maitre = coffre.MaitreActif;
            btnVerrou.Visible = maitre;
            btnRetirer.Visible = maitre;
            btnMaitre.Text = maitre ? "Changer le maître" : "Définir un mot de passe maître";
            if (maitre)
            {
                btnExport.SetBounds(156, 456, 110, 40);
                btnMaitre.SetBounds(274, 456, 158, 40);
            }
            else
            {
                btnExport.SetBounds(28, 456, 110, 40);
                btnMaitre.SetBounds(146, 456, 240, 40);
            }
        }

        // --- Actions ---

        void DefinirOuChangerMaitre()
        {
            using (var dialogue = new DialogueMaitre(!coffre.MaitreActif))
            {
                if (dialogue.ShowDialog(this) != DialogResult.OK) return;
                try
                {
                    coffre.DefinirMaitre(dialogue.Maitre);
                    MontrerStatut("Mot de passe maître en place. Ne l'oublie pas : il est irrécupérable.", false);
                }
                catch (CoffreException ex) { MontrerStatut(ex.Message, true); }
            }
            Rafraichir();
        }

        void RetirerMaitre()
        {
            var reponse = MessageBox.Show(this,
                "Le coffre ne sera plus protégé que par ta session Windows.\nContinuer ?",
                "Retirer le mot de passe maître", MessageBoxButtons.YesNo, MessageBoxIcon.Warning);
            if (reponse != DialogResult.Yes) return;
            try
            {
                coffre.RetirerMaitre();
                MontrerStatut("Mot de passe maître retiré.", false);
            }
            catch (CoffreException ex) { MontrerStatut(ex.Message, true); }
            Rafraichir();
        }

        void Exporter()
        {
            using (var dialogue = new SaveFileDialog())
            {
                dialogue.Title = "Exporter le coffre (EN CLAIR)";
                dialogue.Filter = "Fichier texte|*.txt";
                dialogue.FileName = "mithril-export.txt";
                if (dialogue.ShowDialog(this) != DialogResult.OK) return;
                try
                {
                    coffre.Exporter(dialogue.FileName);
                    MontrerStatut("Exporté EN CLAIR — range ce fichier en lieu sûr, puis détruis-le.", false);
                }
                catch (CoffreException ex) { MontrerStatut(ex.Message, true); }
            }
        }

        public void MontrerStatut(string texte, bool erreur)
        {
            lblStatut.Text = texte;
            lblStatut.ForeColor = erreur ? Palette.Faible : Palette.Accent;
        }
    }
}
