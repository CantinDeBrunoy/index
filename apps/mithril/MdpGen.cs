using System;
using System.Drawing;
using System.Security.Cryptography;
using System.Text;
using System.Windows.Forms;

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

    public class Fenetre : Form
    {
        readonly NumericUpDown numLongueur = new NumericUpDown();
        readonly TrackBar barre = new TrackBar();
        readonly CheckBox cbMin = new CheckBox();
        readonly CheckBox cbMaj = new CheckBox();
        readonly CheckBox cbNum = new CheckBox();
        readonly CheckBox cbSym = new CheckBox();
        readonly CheckBox cbSymMobiles = new CheckBox();
        readonly CheckBox cbAmbigus = new CheckBox();
        readonly CheckBox cbEffacer = new CheckBox();
        readonly TextBox txtMdp = new TextBox();
        readonly Label lblEntropie = new Label();
        readonly Label lblEtat = new Label();
        readonly Timer minuteur = new Timer();
        string dernierCopie = "";
        bool pret;

        public Fenetre()
        {
            Text = "Générateur de mots de passe";
            ClientSize = new Size(600, 368);
            FormBorderStyle = FormBorderStyle.FixedSingle;
            MaximizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = Color.FromArgb(250, 250, 252);
            Font = new Font("Segoe UI", 9F);

            // --- Zone du mot de passe ---
            txtMdp.SetBounds(20, 20, 560, 46);
            txtMdp.Font = new Font("Consolas", 14F);
            txtMdp.ReadOnly = true;
            txtMdp.TextAlign = HorizontalAlignment.Center;
            txtMdp.BackColor = Color.White;
            txtMdp.BorderStyle = BorderStyle.FixedSingle;
            Controls.Add(txtMdp);

            lblEntropie.SetBounds(20, 74, 560, 20);
            lblEntropie.TextAlign = ContentAlignment.MiddleCenter;
            lblEntropie.ForeColor = Color.DimGray;
            Controls.Add(lblEntropie);

            // --- Longueur ---
            var lbl = new Label();
            lbl.SetBounds(20, 112, 70, 22);
            lbl.Text = "Longueur";
            Controls.Add(lbl);

            numLongueur.SetBounds(92, 109, 60, 24);
            numLongueur.Minimum = 8;
            numLongueur.Maximum = 128;
            numLongueur.Value = 32;
            numLongueur.ValueChanged += SurLongueurNum;
            Controls.Add(numLongueur);

            barre.SetBounds(162, 106, 418, 30);
            barre.Minimum = 8;
            barre.Maximum = 128;
            barre.Value = 32;
            barre.TickFrequency = 8;
            barre.ValueChanged += SurLongueurBarre;
            Controls.Add(barre);

            // --- Classes de caractères ---
            PlacerCase(cbMin, 20, 150, 135, "Minuscules (a-z)", true);
            PlacerCase(cbMaj, 160, 150, 135, "Majuscules (A-Z)", true);
            PlacerCase(cbNum, 300, 150, 120, "Chiffres (0-9)", true);
            PlacerCase(cbSym, 425, 150, 155, "Symboles (!#$...)", true);
            PlacerCase(cbSymMobiles, 20, 178, 560,
                "Symboles faciles à taper au téléphone uniquement (! $ & ( ) , - . / : ; ? @)", false);
            PlacerCase(cbAmbigus, 20, 206, 560, "Exclure les caractères ambigus (I l 1 O 0 B 8 S 5 Z 2)", false);
            PlacerCase(cbEffacer, 20, 234, 560, "Vider le presse-papiers 60 s après la copie", false);

            // La restriction mobile n'a de sens que si les symboles sont actifs.
            cbSym.CheckedChanged += SurSymboles;
            cbSymMobiles.Enabled = cbSym.Checked;

            // --- Boutons ---
            var btnGen = new Button();
            btnGen.SetBounds(20, 271, 275, 44);
            btnGen.Text = "Générer";
            btnGen.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            btnGen.Click += delegate { Generer(); };
            Controls.Add(btnGen);

            var btnCopie = new Button();
            btnCopie.SetBounds(305, 271, 275, 44);
            btnCopie.Text = "Copier";
            btnCopie.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            btnCopie.Click += delegate { Copier(); };
            Controls.Add(btnCopie);

            lblEtat.SetBounds(20, 325, 560, 20);
            lblEtat.TextAlign = ContentAlignment.MiddleCenter;
            lblEtat.ForeColor = Color.SeaGreen;
            Controls.Add(lblEtat);

            AcceptButton = btnGen;
            minuteur.Interval = 60000;
            minuteur.Tick += delegate { ViderPressePapiers(); };

            pret = true;
            Generer();
        }

        void SurLongueurNum(object s, EventArgs e)
        {
            if (barre.Value != (int)numLongueur.Value) barre.Value = (int)numLongueur.Value;
            Generer();
        }

        void SurLongueurBarre(object s, EventArgs e)
        {
            if ((int)numLongueur.Value != barre.Value) numLongueur.Value = barre.Value;
        }

        void SurSymboles(object s, EventArgs e)
        {
            cbSymMobiles.Enabled = cbSym.Checked;
        }

        void PlacerCase(CheckBox cb, int x, int y, int largeur, string texte, bool coche)
        {
            cb.SetBounds(x, y, largeur, 24);
            cb.Text = texte;
            cb.Checked = coche;
            if (cb != cbEffacer) cb.CheckedChanged += delegate { Generer(); };
            Controls.Add(cb);
        }

        void Generer()
        {
            if (!pret) return;

            var jeux = new System.Collections.Generic.List<string>();
            bool sansAmbigus = cbAmbigus.Checked;
            if (cbMin.Checked) jeux.Add(Generateur.Filtrer(Generateur.Minuscules, sansAmbigus));
            if (cbMaj.Checked) jeux.Add(Generateur.Filtrer(Generateur.Majuscules, sansAmbigus));
            if (cbNum.Checked) jeux.Add(Generateur.Filtrer(Generateur.Chiffres, sansAmbigus));
            if (cbSym.Checked)
                jeux.Add(Generateur.Filtrer(Generateur.JeuSymboles(cbSymMobiles.Checked), sansAmbigus));

            if (jeux.Count == 0)
            {
                txtMdp.Text = "";
                lblEntropie.Text = "Coche au moins une famille de caractères.";
                lblEntropie.ForeColor = Color.Firebrick;
                return;
            }

            int longueur = (int)numLongueur.Value;
            txtMdp.Text = Generateur.Generer(jeux.ToArray(), longueur);

            int pool = string.Concat(jeux).Length;
            double bits = Generateur.Entropie(pool, longueur);
            string verdict;
            Color couleur;
            if (bits < 60) { verdict = "faible"; couleur = Color.Firebrick; }
            else if (bits < 90) { verdict = "correct"; couleur = Color.DarkOrange; }
            else if (bits < 128) { verdict = "fort"; couleur = Color.SeaGreen; }
            else { verdict = "très fort"; couleur = Color.SeaGreen; }

            lblEntropie.Text = string.Format(
                "{0:0} bits d'entropie - {1}   ({2} caractères, alphabet de {3})",
                bits, verdict, longueur, pool);
            lblEntropie.ForeColor = couleur;
            lblEtat.Text = "";
        }

        void Copier()
        {
            if (txtMdp.Text.Length == 0) return;
            Clipboard.SetText(txtMdp.Text);
            dernierCopie = txtMdp.Text;
            lblEtat.Text = cbEffacer.Checked
                ? "Copié - le presse-papiers sera vidé dans 60 s."
                : "Copié dans le presse-papiers.";
            minuteur.Stop();
            if (cbEffacer.Checked) minuteur.Start();
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
