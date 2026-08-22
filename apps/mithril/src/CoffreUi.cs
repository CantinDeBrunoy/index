using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Thread = System.Threading.Thread;

namespace Mithril
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
            Icon = Embleme.Icone();
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

        public DialogueMaitre(bool premier) : this(premier,
            "Il chiffre le coffre par-dessus ta session Windows. Il n'existe aucun moyen " +
            "de le récupérer : oublié = coffre perdu. Vise 12 caractères ou plus.") { }

        public DialogueMaitre(bool premier, string description)
        {
            Text = premier ? "Définir le mot de passe maître" : "Changer le mot de passe maître";
            ClientSize = new Size(440, 320);

            var titre = Ui.Etiquette(this, 24, 20, 392, Text, false);
            titre.Font = new Font("Segoe UI Semibold", 11F);
            titre.Height = 24;

            Ui.Etiquette(this, 24, 52, 392, description, true);

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

    /// <summary>
    /// Premier lancement, aucun coffre nulle part : on choisit d'emblée entre un coffre
    /// synchronisé (un dossier que Syncthing fait voyager, lisible sur le téléphone) et un
    /// coffre local lié à ce PC. Évite le détour « coffre local, puis Portable, puis copie ».
    /// </summary>
    class DialogueChoixCoffre : FormeSombre
    {
        /// <summary>Vrai si l'utilisateur veut un coffre synchronisé.</summary>
        public bool Synchronise;

        public DialogueChoixCoffre()
        {
            Text = "Bienvenue dans Mithril";
            ClientSize = new Size(480, 380);

            var titre = Ui.Etiquette(this, 24, 20, 432, "Où garder tes mots de passe ?", false);
            titre.Font = new Font("Segoe UI Semibold", 11F);
            titre.Height = 24;

            Ui.Etiquette(this, 24, 52, 432,
                "Ce choix n'est pas définitif : le menu « Portable… » du coffre permet de basculer plus tard.",
                true).Height = 40;

            var btnSync = Ui.Fabriquer(this, 24, 104, 432, 44, "Coffre synchronisé — PC + téléphone", true);
            Ui.Etiquette(this, 24, 152, 432,
                "Un fichier chiffré par ta phrase de passe seule, posé dans un dossier que Syncthing " +
                "recopie sur tes autres appareils. Mithril Android l'ouvre tel quel. Protection : " +
                "uniquement la phrase de passe — choisis-la longue.", true).Height = 72;

            var btnLocal = Ui.Fabriquer(this, 24, 232, 432, 44, "Coffre local à ce PC", false);
            Ui.Etiquette(this, 24, 280, 432,
                "Chiffré en plus par ta session Windows : illisible ailleurs, donc impossible à " +
                "synchroniser. Le plus sûr si tu n'as qu'un PC.", true).Height = 46;

            var btnAnnuler = Ui.Fabriquer(this, 362, 330, 94, 36, "Plus tard", false);
            btnAnnuler.DialogResult = DialogResult.Cancel;

            btnSync.Click += delegate { Synchronise = true; DialogResult = DialogResult.OK; };
            btnLocal.Click += delegate { Synchronise = false; DialogResult = DialogResult.OK; };
            CancelButton = btnAnnuler;
        }

        /// <summary>Nom du fichier de coffre créé dans le dossier synchronisé — le même que celui
        /// que cherche Mithril Android en premier.</summary>
        public const string NomFichierSynchronise = "coffre-portable.mithril";

        /// <summary>Dossier proposé par défaut : un sous-dossier du profil, facile à désigner
        /// dans Syncthing.</summary>
        public static string DossierParDefaut()
        {
            return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "MithrilSync");
        }

        /// <summary>
        /// Déroule le choix « synchronisé » : dossier, puis ouverture du coffre qui s'y trouve
        /// déjà (nouveau PC qui rejoint une synchro existante) ou création avec une phrase de
        /// passe. Renvoie le coffre prêt (déverrouillé), ou null si l'utilisateur renonce.
        /// </summary>
        public static Coffre CreerOuRejoindre(IWin32Window parent)
        {
            string dossier;
            using (var choix = new FolderBrowserDialog())
            {
                choix.Description = "Dossier du coffre synchronisé — celui que Syncthing partagera avec tes autres appareils.";
                choix.SelectedPath = DossierParDefaut();
                choix.ShowNewFolderButton = true;
                if (choix.ShowDialog(parent) != DialogResult.OK) return null;
                dossier = choix.SelectedPath;
            }
            string fichier = Path.Combine(dossier, NomFichierSynchronise);

            if (File.Exists(fichier))
            {
                // Le coffre existe déjà (synchro arrivée d'un autre appareil) : on le rejoint.
                var existant = Coffre.PortableSur(fichier);
                existant.Ouvrir();
                if (!existant.Portable)
                    throw new CoffreException("Ce fichier est un coffre local lié à une session Windows, pas un coffre synchronisé.");
                using (var verrou = new DialogueDeverrouiller(existant))
                    if (verrou.ShowDialog(parent) != DialogResult.OK) return null;
                return existant;
            }

            using (var dialogue = new DialogueMaitre(true,
                "Elle est la SEULE protection du coffre synchronisé, sur tous tes appareils. " +
                "Il n'existe aucun moyen de la récupérer : oubliée = coffre perdu. " +
                "Vise une phrase de passe (12 caractères ou plus)."))
            {
                if (dialogue.ShowDialog(parent) != DialogResult.OK) return null;
                Directory.CreateDirectory(dossier);
                var nouveau = Coffre.PortableSur(fichier);
                nouveau.Ouvrir();                       // inexistant : vide, déverrouillé
                nouveau.DefinirMaitre(dialogue.Maitre); // écrit le fichier MITHRIL3
                return nouveau;
            }
        }
    }

    /// <summary>
    /// Appairage d'un téléphone : affiche en QR l'identifiant Syncthing de ce PC (dérivé du
    /// certificat local, sans aucun appel à Syncthing) pour que Syncthing-Fork le scanne,
    /// et les trois étapes qui restent. Mithril ne peut pas accepter le téléphone à la
    /// place de Syncthing : il n'a pas le réseau, même vers localhost, et c'est voulu.
    /// </summary>
    class DialogueAppairage : FormeSombre
    {
        public DialogueAppairage(string dossierCoffre)
        {
            Text = "Appairer un téléphone";
            ClientSize = new Size(680, 420);

            string identifiant = Syncthing.IdentifiantLocal();
            var titre = Ui.Etiquette(this, 24, 20, 632, "Appairer un téléphone", false);
            titre.Font = new Font("Segoe UI Semibold", 11F);
            titre.Height = 24;

            if (identifiant == null)
            {
                Ui.Etiquette(this, 24, 56, 592,
                    "Syncthing n'est pas installé pour cet utilisateur (aucun cert.pem dans %LOCALAPPDATA%\\Syncthing). " +
                    "Installe Syncthing depuis syncthing.net, lance-le une fois, puis reviens ici.", true).Height = 80;
                var btnFermerSeul = Ui.Fabriquer(this, 562, 364, 94, 42, "Fermer", true);
                btnFermerSeul.DialogResult = DialogResult.Cancel;
                CancelButton = btnFermerSeul;
                return;
            }

            // QR à gauche : 8 px par module, zone de silence de 4 modules.
            bool[,] qr = Qr.Encoder(identifiant);
            int n = qr.GetLength(0), module = 240 / (n + 8);
            int cote = module * (n + 8);
            var image = new Bitmap(cote, cote);
            using (var g = Graphics.FromImage(image))
            {
                g.Clear(Color.White);
                using (var noir = new SolidBrush(Color.Black))
                    for (int l = 0; l < n; l++)
                        for (int c = 0; c < n; c++)
                            if (qr[l, c]) g.FillRectangle(noir, (c + 4) * module, (l + 4) * module, module, module);
            }
            var vue = new PictureBox();
            vue.Image = image;
            vue.SetBounds(24, 56, cote, cote);
            vue.SizeMode = PictureBoxSizeMode.AutoSize;
            Controls.Add(vue);

            Ui.Etiquette(this, 24, 56 + cote + 8, cote, Syncthing.NomLocal(identifiant) + " — " + identifiant, true).Height = 52;

            int x = 24 + cote + 24, largeur = 656 - x;
            string adresse = "http://" + Syncthing.AdresseInterface();
            Ui.Etiquette(this, x, 56, largeur,
                "1. Sur ce PC, dans l'interface Syncthing (" + adresse + "), si le dossier du coffre n'y est pas " +
                "encore : Ajouter un dossier → chemin ci-dessous.", true).Height = 56;
            Ui.Etiquette(this, x, 116, largeur,
                "2. Sur le téléphone, dans Syncthing-Fork : Appareils → + → scanner ce code → Enregistrer.", true).Height = 40;
            Ui.Etiquette(this, x, 160, largeur,
                "3. Sur ce PC, dans Syncthing : la bannière « Nouvel appareil » apparaît dans la minute → " +
                "Ajouter l'appareil, et coche le dossier du coffre dans l'onglet Partage.", true).Height = 72;
            Ui.Etiquette(this, x, 236, largeur,
                "4. Sur le téléphone, accepte le dossier proposé, puis dans Mithril Android choisis ce dossier.", true).Height = 56;
            Ui.Etiquette(this, x, 296, largeur,
                "Dossier du coffre sur ce PC : " + dossierCoffre, true).Height = 56;

            var btnCopier = Ui.Fabriquer(this, x, 364, 150, 42, "Copier l'identifiant", false);
            btnCopier.Click += delegate { PressePapiers.Copier(identifiant); btnCopier.Text = "Copié"; };
            var btnCopierDossier = Ui.Fabriquer(this, x + 160, 364, 140, 42, "Copier le chemin", false);
            btnCopierDossier.Click += delegate { PressePapiers.Copier(dossierCoffre); btnCopierDossier.Text = "Copié"; };
            var btnFermer = Ui.Fabriquer(this, 562, 364, 94, 42, "Fermer", true);
            btnFermer.DialogResult = DialogResult.Cancel;
            CancelButton = btnFermer;
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

    /// <summary>
    /// Libellé + identifiant pour enregistrer un mot de passe. Avec <c>avecMdp</c>, ajoute
    /// un champ pour saisir un mot de passe qui n'a pas été généré par l'appli.
    /// </summary>
    class DialogueAjout : FormeSombre
    {
        public string Libelle;
        public string Identifiant;
        public string Mdp; // renseigné seulement en mode saisie manuelle
        readonly ToolTip infobulle = new ToolTip();

        public DialogueAjout() : this(false) { }

        public DialogueAjout(bool avecMdp)
        {
            Text = avecMdp ? "Ajouter au coffre" : "Enregistrer dans le coffre";
            ClientSize = new Size(440, avecMdp ? 330 : 262);

            var titre = Ui.Etiquette(this, 24, 20, 392, Text, false);
            titre.Font = new Font("Segoe UI Semibold", 11F);
            titre.Height = 24;

            Ui.Etiquette(this, 24, 56, 392, "Libellé (site, service...)", false);
            var champLibelle = Ui.Champ(this, 24, 76, 392, false);
            Ui.Etiquette(this, 24, 122, 392, "Identifiant (optionnel)", false);
            var champId = Ui.Champ(this, 24, 142, 392, false);

            TextBox champMdp = null;
            int yBoutons = 198;
            if (avecMdp)
            {
                Ui.Etiquette(this, 24, 188, 392, "Mot de passe", false);
                champMdp = Ui.Champ(this, 24, 208, 392, true);
                champMdp.Width -= 40; // place pour l'œil
                var oeil = new BoutonIcone("", "Afficher / masquer", infobulle);
                oeil.SetBounds(378, 213, 28, 24);
                oeil.Click += delegate
                {
                    champMdp.UseSystemPasswordChar = !champMdp.UseSystemPasswordChar;
                    champMdp.Focus();
                };
                Controls.Add(oeil);
                oeil.BringToFront();
                yBoutons = 266;
            }

            var lblErreur = Ui.Etiquette(this, 24, yBoutons - 14, 392, "", false);
            lblErreur.ForeColor = Palette.Faible;

            var btnAnnuler = Ui.Fabriquer(this, 200, yBoutons, 94, 42, "Annuler", false);
            btnAnnuler.DialogResult = DialogResult.Cancel;
            var btnOk = Ui.Fabriquer(this, 306, yBoutons, 110, 42, "Enregistrer", true);
            btnOk.Click += delegate
            {
                if (champLibelle.Text.Trim().Length == 0)
                {
                    lblErreur.Text = "Donne un libellé pour retrouver l'entrée.";
                    return;
                }
                if (avecMdp && champMdp.Text.Length == 0)
                {
                    lblErreur.Text = "Saisis le mot de passe à enregistrer.";
                    return;
                }
                Libelle = champLibelle.Text.Trim();
                Identifiant = champId.Text.Trim();
                if (avecMdp) Mdp = champMdp.Text;
                DialogResult = DialogResult.OK;
            };
            AcceptButton = btnOk;
            CancelButton = btnAnnuler;
        }
    }

    /// <summary>
    /// Petite fenêtre de compte à rebours avant la frappe. Topmost mais ne prend jamais le
    /// focus (WS_EX_NOACTIVATE) : ainsi la fenêtre au premier plan reste la cible visée par
    /// l'utilisateur. Affiche en direct le titre de cette cible et s'annule par Échap.
    /// </summary>
    class CompteRebours : Form
    {
        public event Action<IntPtr> Termine; // handle de la cible, ou IntPtr.Zero si annulé
        public string TitreCible = "";
        public string Consigne = "Clique dans le champ cible"; // à régler avant Demarrer()

        readonly Timer tic = new Timer();
        readonly Label lblNombre = new Label();
        readonly Label lblCible = new Label();
        readonly Label lblConsigne = new Label();
        readonly IntPtr proprePoignee;
        int ticks;
        bool fini;

        protected override bool ShowWithoutActivation { get { return true; } }

        protected override CreateParams CreateParams
        {
            get
            {
                var cp = base.CreateParams;
                cp.ExStyle |= 0x08000000 | 0x00000080; // WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW
                return cp;
            }
        }

        public CompteRebours(IntPtr poigneeAExclure)
        {
            proprePoignee = poigneeAExclure;
            FormBorderStyle = FormBorderStyle.None;
            StartPosition = FormStartPosition.Manual;
            Size = new Size(360, 116);
            var zone = Screen.PrimaryScreen.WorkingArea;
            Location = new Point(zone.Right - Width - 24, zone.Bottom - Height - 24);
            TopMost = true;
            ShowInTaskbar = false;
            BackColor = Palette.Carte;

            lblConsigne.SetBounds(20, 14, 320, 18);
            lblConsigne.ForeColor = Palette.TexteSecondaire;
            lblConsigne.Font = new Font("Segoe UI", 8.5F, FontStyle.Bold);
            Controls.Add(lblConsigne);

            lblNombre.SetBounds(20, 30, 60, 56);
            lblNombre.Text = "3";
            lblNombre.ForeColor = Palette.Accent;
            lblNombre.Font = new Font("Segoe UI", 34F, FontStyle.Bold);
            Controls.Add(lblNombre);

            lblCible.SetBounds(88, 36, 252, 44);
            lblCible.ForeColor = Palette.Texte;
            lblCible.Font = new Font("Segoe UI", 9.75F);
            Controls.Add(lblCible);

            var aide = new Label();
            aide.SetBounds(88, 82, 252, 16);
            aide.Text = "Échap pour annuler";
            aide.ForeColor = Palette.TexteSecondaire;
            aide.Font = new Font("Segoe UI", 8F);
            Controls.Add(aide);

            tic.Interval = 100;
            tic.Tick += Tic;
        }

        public void Demarrer()
        {
            lblConsigne.Text = Consigne;
            Show();
            RafraichirCible();
            tic.Start();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            using (var stylo = new Pen(Palette.Accent, 2))
                e.Graphics.DrawRectangle(stylo, 1, 1, Width - 2, Height - 2);
        }

        void RafraichirCible()
        {
            IntPtr avant = AutoType.FenetreActive();
            if (avant == proprePoignee || avant == Handle) return; // ne jamais se cibler soi-même
            string titre = AutoType.TitreFenetreActive();
            TitreCible = titre;
            lblCible.Text = string.IsNullOrEmpty(titre) ? "(fenêtre sans titre)" : titre;
        }

        void Tic(object s, EventArgs e)
        {
            if (fini) return;

            if (AutoType.EchapPresse())
            {
                Terminer(IntPtr.Zero);
                return;
            }
            RafraichirCible();

            ticks++;
            int reste = 3 - ticks / 10;
            lblNombre.Text = reste > 0 ? reste.ToString() : "0";
            if (ticks >= 30)
            {
                IntPtr cible = AutoType.FenetreActive();
                Terminer(cible == Handle ? IntPtr.Zero : cible);
            }
        }

        void Terminer(IntPtr cible)
        {
            if (fini) return;
            fini = true;
            tic.Stop();
            Hide();
            var gestionnaire = Termine;
            if (gestionnaire != null) gestionnaire(cible);
            Close();
        }

        protected override void Dispose(bool liberation)
        {
            if (liberation) tic.Dispose();
            base.Dispose(liberation);
        }
    }

    /// <summary>
    /// Vignette d'une entrée : l'icône de l'appli si on l'a capturée, sinon un monogramme
    /// (initiale sur pastille colorée) — le repli propre quand aucun logo n'est disponible,
    /// notamment pour les sites web (dont on ne peut pas connaître le favicon sans réseau).
    /// </summary>
    static class Avatar
    {
        static readonly Color[] Teintes =
        {
            Color.FromArgb(93, 135, 255), Color.FromArgb(226, 124, 95),
            Color.FromArgb(127, 191, 142), Color.FromArgb(197, 124, 214),
            Color.FromArgb(224, 169, 95), Color.FromArgb(94, 197, 204),
            Color.FromArgb(214, 110, 150), Color.FromArgb(120, 148, 180)
        };

        static Color Teinte(string s)
        {
            int h = 0;
            if (s != null) foreach (char c in s) h = h * 31 + c;
            return Teintes[((h % Teintes.Length) + Teintes.Length) % Teintes.Length];
        }

        public static void Dessiner(Graphics g, Rectangle r, EntreeCoffre entree, Image icone)
        {
            if (icone != null)
            {
                var etat = g.Save();
                using (var clip = Dessin.Arrondi(r, 8)) g.SetClip(clip);
                g.DrawImage(icone, r);
                g.Restore(etat);
                return;
            }
            using (var chemin = Dessin.Arrondi(r, 8))
            using (var pinceau = new SolidBrush(Teinte(entree.Libelle)))
                g.FillPath(pinceau, chemin);
            string lettre = string.IsNullOrEmpty(entree.Libelle)
                ? "?" : entree.Libelle.Substring(0, 1).ToUpperInvariant();
            using (var police = new Font("Segoe UI Semibold", r.Height * 0.42F, GraphicsUnit.Pixel))
                TextRenderer.DrawText(g, lettre, police, r, Color.White,
                    TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
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
        readonly Image imgIcone; // icône décodée une fois, ou null (monogramme)
        string mdpVisible; // non null = révélé
        bool confirmeSuppr;

        public LigneEntree(FenetreCoffre parent, Coffre coffre, EntreeCoffre entree, ToolTip infobulle)
        {
            this.parent = parent;
            this.coffre = coffre;
            this.entree = entree;
            if (entree.Icone != null)
                try { imgIcone = Image.FromStream(new System.IO.MemoryStream(entree.Icone)); }
                catch { imgIcone = null; }
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint |
                     ControlStyles.OptimizedDoubleBuffer | ControlStyles.ResizeRedraw, true);
            Height = 52;
            TabStop = false;

            icoOeil = new BoutonIcone("", "Afficher 8 secondes", infobulle);
            icoOeil.Click += delegate { BasculerRevelation(); };
            Controls.Add(icoOeil);

            var icoTaper = new BoutonIcone("", "Taper dans une autre fenêtre", infobulle);
            icoTaper.Click += delegate { parent.LancerAutoType(entree); };
            Controls.Add(icoTaper);

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
                icoOeil.SetBounds(Width - 140, 12, 28, 28);
                icoTaper.SetBounds(Width - 106, 12, 28, 28);
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

            Avatar.Dessiner(g, new Rectangle(12, 10, 32, 32), entree, imgIcone);

            TextRenderer.DrawText(g, entree.Libelle, parent.PoliceLibelle,
                new Rectangle(54, 7, 176, 20), Palette.Texte,
                TextFormatFlags.Left | TextFormatFlags.EndEllipsis | TextFormatFlags.SingleLine);

            string sousTexte = string.IsNullOrEmpty(entree.Identifiant)
                ? entree.Creation.ToString("dd/MM/yyyy")
                : entree.Identifiant + "  ·  " + entree.Creation.ToString("dd/MM/yyyy");
            TextRenderer.DrawText(g, sousTexte, parent.PoliceSous,
                new Rectangle(54, 28, 176, 18), Palette.TexteSecondaire,
                TextFormatFlags.Left | TextFormatFlags.EndEllipsis | TextFormatFlags.SingleLine);

            string affiche = mdpVisible != null ? mdpVisible : "●●●●●●●●";
            TextRenderer.DrawText(g, affiche, parent.PoliceMdp,
                new Rectangle(230, 0, Width - 230 - 148, Height),
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
                if (imgIcone != null) imgIcone.Dispose();
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
    class FenetreCoffre : FormeSombre
    {
        readonly Coffre coffre;

        /// <summary>Renseigné quand l'utilisateur bascule de coffre (portable ou retour au
        /// local) : la fenêtre principale adopte ce coffre après la fermeture.</summary>
        public Coffre CoffreRemplacant;

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
        readonly Interrupteur intEntree = new Interrupteur();
        readonly Timer surveillance = new Timer();
        readonly ToolTip infobulle = new ToolTip();
        readonly Label lblEyebrow = new Label();
        readonly ContextMenuStrip menuPortable = new ContextMenuStrip();
        readonly ToolStripMenuItem itemRevenir;

        public readonly Font PoliceLibelle = new Font("Segoe UI Semibold", 9.75F);
        public readonly Font PoliceSous = new Font("Segoe UI", 8.5F);
        public readonly Font PoliceMdp = new Font("Consolas", 9.75F);

        public FenetreCoffre(Coffre coffre)
        {
            this.coffre = coffre;
            Text = "Mithril — Coffre";
            ClientSize = new Size(600, 540);

            // --- Vue liste ---
            lblEyebrow.SetBounds(28, 20, 170, 16);
            lblEyebrow.Text = "COFFRE";
            lblEyebrow.Font = new Font("Segoe UI", 8F, FontStyle.Bold);
            lblEyebrow.ForeColor = Palette.TexteSecondaire;
            Controls.Add(lblEyebrow);

            lblCompte.SetBounds(200, 20, 144, 18);
            lblCompte.TextAlign = ContentAlignment.MiddleRight;
            lblCompte.ForeColor = Palette.TexteSecondaire;
            Controls.Add(lblCompte);

            var btnPortable = Ui.Fabriquer(this, 352, 14, 110, 30, "Portable…", false);
            infobulle.SetToolTip(btnPortable,
                "Coffre portable : un fichier chiffré par le maître seul, synchronisable entre PC");
            var itemCreer = new ToolStripMenuItem("Créer un coffre portable (copie)…");
            itemCreer.Click += delegate { CreerPortable(); };
            var itemOuvrir = new ToolStripMenuItem("Ouvrir un coffre portable…");
            itemOuvrir.Click += delegate { OuvrirPortable(); };
            itemRevenir = new ToolStripMenuItem("Revenir au coffre local");
            itemRevenir.Click += delegate { RevenirAuCoffreLocal(); };
            var itemAppairer = new ToolStripMenuItem("Appairer un téléphone (QR)…");
            itemAppairer.Click += delegate
            {
                string dossier = coffre.Portable ? Path.GetDirectoryName(coffre.Chemin) : "(aucun coffre synchronisé pour l'instant)";
                using (var dialogue = new DialogueAppairage(dossier)) dialogue.ShowDialog(this);
            };
            menuPortable.Items.Add(itemCreer);
            menuPortable.Items.Add(itemOuvrir);
            menuPortable.Items.Add(itemAppairer);
            menuPortable.Items.Add(new ToolStripSeparator());
            menuPortable.Items.Add(itemRevenir);
            btnPortable.Click += delegate { menuPortable.Show(btnPortable, new Point(0, btnPortable.Height)); };

            var btnAjouter = Ui.Fabriquer(this, 470, 14, 102, 30, "＋ Ajouter", true);
            btnAjouter.Click += delegate { AjouterManuel(); };
            infobulle.SetToolTip(btnAjouter, "Enregistrer un mot de passe qui n'a pas été généré ici");

            pnlListe.SetBounds(28, 48, 544, 368);
            pnlListe.AutoScroll = true;
            pnlListe.BackColor = Palette.Fond;
            Controls.Add(pnlListe);

            intEntree.SetBounds(28, 424, 544, 24);
            intEntree.Text = "Valider : appuyer sur Entrée après la frappe";
            intEntree.Coche = Reglages.Actuels.ValiderEntree; // défaut réglable
            Controls.Add(intEntree);
            infobulle.SetToolTip(intEntree,
                "Envoie Entrée à la fin de l'auto-type pour soumettre le formulaire. " +
                "Désactivé par défaut : Entrée valide, donc à n'utiliser que si tu es sûr de la cible.");

            lblVide.SetBounds(28, 200, 544, 60);
            lblVide.Text = "Aucun mot de passe enregistré.\r\n" +
                "Utilise « ＋ Ajouter » pour saisir un mot de passe existant, ou « Enregistrer » " +
                "dans la fenêtre principale pour un mot de passe généré.";
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

            surveillance.Interval = 1000;
            surveillance.Tick += delegate { VeillerVerrou(); };
        }

        protected override void OnLoad(EventArgs e)
        {
            base.OnLoad(e);
            // La session a normalement déjà déverrouillé ; sinon on ouvre pour atteindre le seuil.
            if (!coffre.Deverrouille)
            {
                try { coffre.Ouvrir(); }
                catch (CoffreException ex)
                {
                    MessageBox.Show(this, ex.Message, "Mithril", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    Close();
                    return;
                }
            }
            surveillance.Start();
            AfficherVue();
        }

        protected override void OnFormClosed(FormClosedEventArgs e)
        {
            // Ne PAS verrouiller ici : la session garde le coffre ouvert (barre d'état,
            // raccourci global). Le verrouillage est géré par la fenêtre principale.
            surveillance.Stop();
            base.OnFormClosed(e);
        }

        // Conservé pour les appelants ; l'inactivité est désormais suivie au niveau session.
        public void SignalerActivite() { }

        /// <summary>Si la session a verrouillé le coffre pendant qu'il était affiché, repasser
        /// en vue verrouillée.</summary>
        void VeillerVerrou()
        {
            if (!coffre.Deverrouille && !pnlVerrou.Visible)
                RetournerAuSeuil();
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

            bool estPortable = coffre.Portable;
            Text = estPortable
                ? "Mithril — Coffre portable (" + Path.GetFileName(coffre.Chemin) + ")"
                : "Mithril — Coffre";
            lblEyebrow.Text = estPortable ? "COFFRE PORTABLE" : "COFFRE";
            itemRevenir.Enabled = estPortable;

            bool maitre = coffre.MaitreActif;
            btnVerrou.Visible = maitre;
            btnRetirer.Visible = maitre && !estPortable; // en portable, le maître est irrévocable
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

        /// <summary>Saisir et enregistrer un mot de passe qui n'a pas été généré par l'appli.</summary>
        void AjouterManuel()
        {
            if (!coffre.Deverrouille) return;
            using (var dialogue = new DialogueAjout(true))
            {
                if (dialogue.ShowDialog(this) != DialogResult.OK) return;
                try
                {
                    coffre.Ajouter(dialogue.Libelle, dialogue.Identifiant, dialogue.Mdp);
                    MontrerStatut("Mot de passe ajouté au coffre.", false);
                }
                catch (CoffreException ex) { MontrerStatut(ex.Message, true); }
            }
            Rafraichir();
        }

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

        /// <summary>Copie le coffre courant vers un fichier portable, qui devient le coffre
        /// actif. Le coffre local n'est ni modifié ni supprimé : la bascule est réversible.</summary>
        void CreerPortable()
        {
            if (!coffre.Deverrouille) return;
            var reponse = MessageBox.Show(this,
                "Un coffre portable est un fichier qui voyage entre machines (partage privé, synchronisation).\n\n" +
                "Il n'est protégé QUE par son mot de passe maître : quiconque obtient le fichier peut essayer " +
                "des mots de passe sans limite, hors ligne. Choisis une phrase de passe longue.\n\n" +
                "Le coffre local actuel reste intact sur cette machine. Continuer ?",
                "Créer un coffre portable", MessageBoxButtons.YesNo, MessageBoxIcon.Warning);
            if (reponse != DialogResult.Yes) return;
            using (var fichier = new SaveFileDialog())
            {
                fichier.Title = "Créer le coffre portable";
                fichier.Filter = "Coffre Mithril|*.mithril";
                fichier.FileName = "coffre-portable.mithril";
                if (fichier.ShowDialog(this) != DialogResult.OK) return;
                using (var dialogue = new DialogueMaitre(true,
                    "Il est la SEULE protection du fichier portable, sur toutes les machines. " +
                    "Il n'existe aucun moyen de le récupérer : oublié = coffre perdu. " +
                    "Vise une phrase de passe (12 caractères ou plus)."))
                {
                    if (dialogue.ShowDialog(this) != DialogResult.OK) return;
                    try
                    {
                        var nouveau = coffre.CopierVersPortable(fichier.FileName, dialogue.Maitre);
                        Reglages.Actuels.CheminCoffrePortable = fichier.FileName;
                        Reglages.Actuels.Sauver();
                        CoffreRemplacant = nouveau;
                        Close();
                    }
                    catch (CoffreException ex) { MontrerStatut(ex.Message, true); }
                }
            }
        }

        void OuvrirPortable()
        {
            using (var fichier = new OpenFileDialog())
            {
                fichier.Title = "Ouvrir un coffre portable";
                fichier.Filter = "Coffre Mithril|*.mithril|Tous les fichiers|*.*";
                if (fichier.ShowDialog(this) != DialogResult.OK) return;
                var nouveau = Coffre.PortableSur(fichier.FileName);
                try { nouveau.Ouvrir(); }
                catch (CoffreException ex) { MontrerStatut(ex.Message, true); return; }
                if (!nouveau.Portable)
                {
                    // Fichier DPAPI : lisible ici, mais pas un coffre qui voyage — on refuse la
                    // bascule plutôt que de laisser croire qu'il se synchronisera.
                    nouveau.Verrouiller();
                    MontrerStatut("Ce fichier est un coffre local lié à une session Windows, pas un coffre portable.", true);
                    return;
                }
                Reglages.Actuels.CheminCoffrePortable = fichier.FileName;
                Reglages.Actuels.Sauver();
                CoffreRemplacant = nouveau;
                Close();
            }
        }

        void RevenirAuCoffreLocal()
        {
            if (!coffre.Portable) return;
            Reglages.Actuels.CheminCoffrePortable = "";
            Reglages.Actuels.Sauver();
            CoffreRemplacant = Coffre.ParDefaut();
            Close();
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

        /// <summary>
        /// Masque le coffre, laisse 3 s pour cliquer dans le champ cible, puis y tape le mot
        /// de passe. Rien ne passe par le presse-papiers ; aucune touche Entrée n'est envoyée.
        /// </summary>
        public void LancerAutoType(EntreeCoffre entree)
        {
            if (!coffre.Deverrouille) return;
            SignalerActivite();

            bool avecIdentifiant = !string.IsNullOrEmpty(entree.Identifiant) && Reglages.Actuels.SequenceIdentifiant;
            var rebours = new CompteRebours(Handle);
            rebours.Consigne = avecIdentifiant
                ? "Clique dans le champ identifiant"
                : "Clique dans le champ mot de passe";
            rebours.Termine += delegate(IntPtr cible)
            {
                if (IsDisposed) return;
                if (cible == IntPtr.Zero)
                {
                    Restaurer();
                    MontrerStatut("Frappe annulée.", false);
                    return;
                }
                if (AutoType.CibleProbablementElevee(cible))
                {
                    Restaurer();
                    MontrerStatut("Fenêtre en mode administrateur : Windows y bloque la frappe. Utilise la copie.", true);
                    return;
                }
                // Taper AVANT de restaurer le coffre : sinon c'est le coffre qui a le focus.
                AutoType.RamenerAuPremierPlan(cible);
                string mdp = entree.RevelerMdp();
                string id = avecIdentifiant ? entree.Identifiant : null;
                string titreCible = rebours.TitreCible;
                bool valider = intEntree.Coche;

                // La frappe (avec ses délais) tourne à part : ne pas geler l'UI et surtout ne
                // pas reprendre le focus à la cible avant qu'elle ait tout reçu.
                var frappeur = new System.Threading.Thread(delegate()
                {
                    uint envoyes = AutoType.TaperSequence(id, mdp, valider);
                    try
                    {
                        if (IsDisposed) return;
                        BeginInvoke((MethodInvoker)delegate
                        {
                            Restaurer();
                            if (envoyes == 0)
                            {
                                MontrerStatut("Rien n'a été tapé (fenêtre cible perdue).", true);
                                return;
                            }
                            MontrerStatut((avecIdentifiant ? "Identifiant + mot de passe tapés dans : "
                                                           : "Mot de passe tapé dans : ") + titreCible, false);
                            // Apprendre l'icône de l'appli cible (hors navigateur) la 1re fois.
                            if (entree.Icone == null && coffre.Deverrouille && Reglages.Actuels.ApprendreIcones)
                            {
                                byte[] png = AutoType.IconePng(AutoType.CheminExecutable(cible));
                                if (png != null)
                                {
                                    try { coffre.DefinirIcone(entree, png); Rafraichir(); }
                                    catch (CoffreException) { }
                                }
                            }
                        });
                    }
                    catch (InvalidOperationException) { } // fenêtre fermée entre-temps
                });
                frappeur.IsBackground = true;
                frappeur.Start();
            };

            // Réduire (et non masquer) : masquer une fenêtre modale la ferme et la détruit.
            WindowState = FormWindowState.Minimized;
            rebours.Demarrer();
        }

        void Restaurer()
        {
            if (IsDisposed) return;
            WindowState = FormWindowState.Normal;
            Activate();
        }

        public void MontrerStatut(string texte, bool erreur)
        {
            lblStatut.Text = texte;
            lblStatut.ForeColor = erreur ? Palette.Faible : Palette.Accent;
        }
    }

    /// <summary>
    /// Frappe partagée (barre d'état / raccourci global) : tape l'entrée dans une fenêtre
    /// cible déjà au premier plan, sur un thread d'arrière-plan, puis rappelle sur le thread
    /// UI de <paramref name="invoke"/>. Sert aussi à apprendre l'icône de l'appli.
    /// </summary>
    static class AutoTypeCoffre
    {
        public static void Frapper(IntPtr cible, EntreeCoffre entree, bool validerEntree,
                                   Control invoke, Action<uint, byte[]> apres)
        {
            string mdp = entree.RevelerMdp();
            string id = (Reglages.Actuels.SequenceIdentifiant && !string.IsNullOrEmpty(entree.Identifiant))
                ? entree.Identifiant : null;
            bool capterIcone = entree.Icone == null && Reglages.Actuels.ApprendreIcones;
            var fil = new Thread(delegate()
            {
                uint envoyes = AutoType.TaperSequence(id, mdp, validerEntree);
                byte[] png = null;
                if (capterIcone && envoyes > 0)
                    png = AutoType.IconePng(AutoType.CheminExecutable(cible));
                if (invoke == null || invoke.IsDisposed) return;
                try { invoke.BeginInvoke((MethodInvoker)delegate { apres(envoyes, png); }); }
                catch (InvalidOperationException) { }
            });
            fil.IsBackground = true;
            fil.Start();
        }
    }

    /// <summary>Choix d'une entrée quand plusieurs (ou aucune) correspondent à la fenêtre.</summary>
    class DialogueChoixEntree : FormeSombre
    {
        public EntreeCoffre Choisie;

        public DialogueChoixEntree(List<EntreeCoffre> entrees, string titreFenetre)
        {
            Text = "Quel mot de passe ?";
            StartPosition = FormStartPosition.CenterScreen;
            TopMost = true; // invoqué par le raccourci global : doit passer devant la fenêtre cible
            int hauteurListe = Math.Min(entrees.Count, 7) * 44 + 8;
            ClientSize = new Size(420, 84 + hauteurListe);

            var titre = Ui.Etiquette(this, 20, 16, 380, "Remplir « " + Raccourcir(titreFenetre, 40) + " »", false);
            titre.Font = new Font("Segoe UI Semibold", 10.5F);
            titre.Height = 22;
            Ui.Etiquette(this, 20, 40, 380,
                entrees.Count == 0 ? "Aucune entrée ne correspond — choisis-en une :"
                                   : "Plusieurs entrées correspondent :", true).Height = 20;

            var liste = new Panel();
            liste.SetBounds(20, 68, 380, hauteurListe);
            liste.AutoScroll = true;
            liste.BackColor = Palette.Fond;
            Controls.Add(liste);

            int y = 0;
            foreach (var e in entrees)
            {
                var entree = e;
                var b = new Bouton();
                b.SetBounds(0, y, 360, 38);
                b.Text = string.IsNullOrEmpty(entree.Identifiant)
                    ? entree.Libelle : entree.Libelle + "   ·   " + entree.Identifiant;
                b.Font = new Font("Segoe UI", 9.75F);
                b.Click += delegate { Choisie = entree; DialogResult = DialogResult.OK; };
                liste.Controls.Add(b);
                y += 44;
            }
        }

        /// <summary>Windows refuse le focus à une appli en arrière-plan : on le prend de force,
        /// ce que le processus qui a reçu le raccourci global est autorisé à faire.</summary>
        protected override void OnShown(EventArgs e)
        {
            base.OnShown(e);
            Activate();
            AutoType.RamenerAuPremierPlan(Handle);
        }

        protected override bool ProcessCmdKey(ref Message msg, Keys donnee)
        {
            if (donnee == Keys.Escape) { DialogResult = DialogResult.Cancel; return true; }
            return base.ProcessCmdKey(ref msg, donnee);
        }

        static string Raccourcir(string s, int max)
        {
            if (string.IsNullOrEmpty(s)) return "";
            return s.Length <= max ? s : s.Substring(0, max - 1) + "…";
        }
    }
}
