using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows.Forms;
using Microsoft.Win32;

namespace Mithril
{
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
        Coffre coffre; // remplacé lors d'une bascule locale <-> portable (voir OuvrirCoffre)
        Synchroniseur synchro; // moteur de synchronisation native (docs/SYNCHRO.md), null tant qu'aucun coffre synchronisé n'est réglé
        string avertissementDemarrage; // à montrer une fois la barre d'état créée
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
            coffre = CoffreInitial();
            coffre.AvertissementSynchro += Notifier;
            Text = "Mithril";
            Icon = Embleme.Icone();
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
            DemarrerSynchro();
            if (avertissementDemarrage != null) Notifier(avertissementDemarrage);
        }

        /// <summary>Coffre portable choisi dans les réglages s'il est joignable, sinon le coffre
        /// local DPAPI — repli signalé, sans toucher au réglage (lecteur non monté, synchro en retard).</summary>
        Coffre CoffreInitial()
        {
            string cheminPortable = Reglages.Actuels.CheminCoffrePortable;
            if (string.IsNullOrEmpty(cheminPortable)) return Coffre.ParDefaut();
            if (File.Exists(cheminPortable)) return Coffre.PortableSur(cheminPortable);
            avertissementDemarrage = "Coffre portable introuvable (" + cheminPortable +
                ") : repli sur le coffre local. Le réglage est conservé.";
            return Coffre.ParDefaut();
        }

        // --- Synchronisation native ---

        /// <summary>
        /// Démarre le moteur dès qu'un coffre synchronisé est réglé (sinon on n'écoute rien :
        /// pas de demande du pare-feu pour quelqu'un qui n'a qu'un PC). Les messages du moteur
        /// arrivent d'un fil d'arrière-plan et sont ramenés sur le fil de l'interface.
        /// </summary>
        void DemarrerSynchro()
        {
            if (synchro != null || string.IsNullOrEmpty(Reglages.Actuels.CheminCoffrePortable)) return;
            try
            {
                string dossier = Reglages.Dossier;
                synchro = new Synchroniseur(dossier, Environment.MachineName,
                    delegate { return string.IsNullOrEmpty(Reglages.Actuels.CheminCoffrePortable) ? null : Reglages.Actuels.CheminCoffrePortable; });
                synchro.Journal += delegate(string message, bool alerte) { BeginInvoke((Action)delegate { Notifier(message); }); };
                synchro.CoffreRecu += delegate(AppareilAppaire appareil) { BeginInvoke((Action)delegate { SurCoffreRecu(appareil); }); };
                synchro.Demarrer(false);
            }
            catch (SynchroException ex)
            {
                Notifier("Synchronisation indisponible : " + ex.Message);
                synchro = null;
            }
        }

        /// <summary>Le fichier du coffre vient d'être remplacé par la version d'un appareil : ce
        /// qui est en mémoire est périmé, on verrouille pour relire à la prochaine ouverture.</summary>
        void SurCoffreRecu(AppareilAppaire appareil)
        {
            if (coffre.Portable && coffre.Deverrouille)
            {
                coffre.Verrouiller();
                Notifier("Coffre mis à jour depuis " + appareil.Nom + " : il sera relu au prochain déverrouillage.");
            }
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
            if (tray != null)
            {
                tray.Visible = false;
                if (tray.Icon != null) tray.Icon.Dispose(); // icône construite pour elle seule
                tray.Dispose();
            }
            if (synchro != null) synchro.Dispose();
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
            if (!ProposerPremierCoffre(parent)) return false;
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

        /// <summary>
        /// Premier usage du coffre, rien n'existe encore (ni coffre local, ni portable réglé) :
        /// propose d'emblée le coffre synchronisé. Renvoie faux si l'utilisateur renonce ;
        /// « Coffre local » laisse simplement le coffre DPAPI se créer comme avant.
        /// </summary>
        bool choixPremierCoffreFait; // « local » choisi : ne pas redemander tant que rien n'est écrit

        bool ProposerPremierCoffre(IWin32Window parent)
        {
            if (choixPremierCoffreFait || coffre.Portable || coffre.Existe) return true;
            if (!string.IsNullOrEmpty(Reglages.Actuels.CheminCoffrePortable)) return true; // repli signalé au démarrage
            using (var choix = new DialogueChoixCoffre())
            {
                if (choix.ShowDialog(parent) != DialogResult.OK) return false;
                if (!choix.Synchronise) { choixPremierCoffreFait = true; return true; }
            }
            Coffre synchronise;
            try { synchronise = DialogueChoixCoffre.CreerOuRejoindre(parent); }
            catch (CoffreException ex)
            {
                MessageBox.Show((Form)parent, ex.Message, "Mithril", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return false;
            }
            if (synchronise == null) return false;
            Reglages.Actuels.CheminCoffrePortable = synchronise.Chemin;
            Reglages.Actuels.Sauver();
            DemarrerSynchro();
            coffre.AvertissementSynchro -= Notifier;
            coffre = synchronise;
            coffre.AvertissementSynchro += Notifier;
            return true;
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
            while (true)
            {
                Coffre remplacant;
                DemarrerSynchro(); // un coffre synchronisé vient peut-être d'être réglé
                using (var fenetre = new FenetreCoffre(coffre, synchro))
                {
                    fenetre.ShowDialog(this);
                    remplacant = fenetre.CoffreRemplacant;
                }
                if (remplacant == null) { DemarrerSynchro(); return; }
                // Bascule locale <-> portable : l'ancien coffre est verrouillé (secrets effacés)
                // et la fenêtre rouvre sur le nouveau, en le déverrouillant si besoin.
                coffre.Verrouiller();
                coffre.AvertissementSynchro -= Notifier;
                coffre = remplacant;
                coffre.AvertissementSynchro += Notifier;
                if (!AssurerCoffrePret(this)) return;
            }
        }

        // --- Barre d'état système + raccourci global + verrouillage auto ---

        void InitialiserSession()
        {
            tray = new NotifyIcon();
            // Taille exacte demandée : la barre d'état choisit mal parmi les vignettes.
            tray.Icon = Embleme.Icone(SystemInformation.SmallIconSize);
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
            AutoType.RamenerAuPremierPlan(Handle); // Activate() seul ne suffit pas depuis l'arrière-plan
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
