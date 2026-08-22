using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

namespace Mithril
{
    /// <summary>
    /// Emblème de l'application : la Porte de Durin — l'arche de la Moria, l'étoile
    /// de Durin et sa couronne de sept étoiles. La porte naine qui ne s'ouvre qu'au
    /// mot de passe (« parlez, ami, et entrez ») : c'est le sujet du logiciel.
    ///
    /// Tout est dessiné par le code, à n'importe quelle taille, avec la palette de
    /// l'interface : aucun fichier d'image n'est versionné. L'icône de la fenêtre et
    /// de la barre d'état est construite en mémoire au démarrage ; celle du .exe est
    /// produite au moment du build par outils/build.ps1, qui compile ce fichier avec
    /// -define:OUTIL_ICONE pour en faire un petit générateur en ligne de commande.
    ///
    /// Le dessin s'allège quand la place manque : sous 64 px les sept étoiles de la
    /// couronne tiendraient chacune dans un pixel et ne feraient que salir, on les
    /// retire et l'étoile de Durin se recentre. À 16 px il reste le cadre de la porte
    /// et cette étoile, qui se lisent encore.
    /// </summary>
    static class Embleme
    {
        // Tailles de l'icône d'écran (fenêtre, barre des tâches, barre d'état).
        static readonly int[] TaillesEcran = { 16, 20, 24, 32, 40, 48 };
        // Tailles de l'icône du .exe : l'explorateur monte jusqu'à 256 px.
        static readonly int[] TaillesFichier = { 16, 20, 24, 32, 40, 48, 64, 128, 256 };

        // Au-delà de cette taille, la vignette est stockée en PNG dans le .ico plutôt
        // qu'en bitmap brut : c'est ce que fait Windows depuis Vista, et cela évite de
        // peser 260 Ko pour la seule vignette 256. En deçà, bitmap brut, lisible par
        // tout ce qui sait lire un .ico — y compris System.Drawing.Icon.
        const int SeuilPng = 48;

        // ------------------------------------------------------------------ dessin

        /// <summary>Dessine l'emblème dans un carré de côté <paramref name="c"/>, origine (0,0).</summary>
        public static void Dessiner(Graphics g, float c)
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;

            // Tuile sombre à coins arrondis : l'emblème garde son contraste aussi bien
            // sur une barre des tâches claire que sombre.
            using (var tuile = Arrondi(0.5f, 0.5f, c - 1f, c - 1f, c * 0.22f))
            {
                using (var fond = new LinearGradientBrush(new PointF(0, -1f), new PointF(0, c + 1f),
                                                          Palette.Carte, Palette.Fond))
                    g.FillPath(fond, tuile);
                if (c >= 20)
                    using (var stylo = new Pen(Palette.Bordure, Math.Max(1f, c * 0.016f)))
                        g.DrawPath(stylo, tuile);
            }

            // L'ithildin : plus clair en haut, là où la porte accroche la lumière.
            using (var argent = new LinearGradientBrush(new PointF(0, c * 0.05f), new PointF(0, c * 0.95f),
                                                        Palette.AccentSurvol, Palette.AccentPresse))
            {
                // Le cadre : arche brisée et seuil, d'un seul tenant, peint en bande
                // large. Une bande pleine survit à 16 px là où un filet disparaît.
                using (var porte = Porte(c))
                {
                    if (c >= 64)
                        using (var lueur = new Pen(Color.FromArgb(44, Palette.Accent), c * 0.150f))
                        {
                            lueur.LineJoin = LineJoin.Round;
                            g.DrawPath(lueur, porte);
                        }
                    using (var bande = new Pen(argent, Math.Max(1.5f, c * 0.075f)))
                    {
                        bande.LineJoin = LineJoin.Round;
                        g.DrawPath(bande, porte);
                    }
                }

                // L'étoile de Durin, au milieu du battant : c'est elle qu'on reconnaît
                // quand il ne reste que quelques pixels, donc elle ne disparaît jamais.
                // Elle descend d'un cran quand la couronne est là pour occuper le haut.
                using (var etoile = new GraphicsPath())
                {
                    etoile.AddPolygon(Rayons(c * 0.5f, c * (c >= 64 ? 0.630f : 0.545f),
                                             c * 0.145f, c * 0.050f, 8));
                    g.FillPath(argent, etoile);
                }

                // La couronne des sept étoiles, en arc sous la clef de voûte. À moins
                // de 64 px chacune tiendrait dans un pixel et ne ferait que salir.
                if (c >= 64)
                    using (var couronne = new GraphicsPath())
                    {
                        for (int i = 0; i < 7; i++)
                        {
                            double angle = (212.0 + i * (116.0 / 6.0)) * Math.PI / 180.0;
                            couronne.AddPolygon(Rayons(c * (0.5f + 0.255f * (float)Math.Cos(angle)),
                                                       c * (0.585f + 0.255f * (float)Math.Sin(angle)),
                                                       c * 0.032f, c * 0.011f, 4));
                        }
                        g.FillPath(argent, couronne);
                    }
            }
        }

        /// <summary>
        /// La porte : deux montants droits, deux arcs qui se rejoignent en pointe, et
        /// le seuil qui referme la figure. Chemin fermé, destiné à être peint au
        /// pinceau — sa largeur fait l'épaisseur du cadre.
        /// </summary>
        static GraphicsPath Porte(float c)
        {
            const float demi = 0.345f, ySoutien = 0.600f, yBase = 0.870f, ecart = 0.160f;
            float rayon = demi + ecart;
            float fleche = (float)Math.Sqrt(rayon * rayon - ecart * ecart);
            float angle = (float)(Math.Atan2(fleche, ecart) * 180.0 / Math.PI);
            float diametre = c * 2f * rayon;

            var chemin = new GraphicsPath();
            chemin.AddLine(c * (0.5f - demi), c * yBase, c * (0.5f - demi), c * ySoutien);
            chemin.AddArc(c * (0.5f + ecart) - diametre / 2f, c * ySoutien - diametre / 2f,
                          diametre, diametre, 180f, angle);
            chemin.AddArc(c * (0.5f - ecart) - diametre / 2f, c * ySoutien - diametre / 2f,
                          diametre, diametre, 360f - angle, angle);
            chemin.AddLine(c * (0.5f + demi), c * ySoutien, c * (0.5f + demi), c * yBase);
            chemin.CloseFigure();   // le seuil
            return chemin;
        }

        /// <summary>Étoile à branches droites : sommets alternés entre deux rayons.</summary>
        static PointF[] Rayons(float cx, float cy, float exterieur, float interieur, int branches)
        {
            var points = new PointF[branches * 2];
            for (int i = 0; i < points.Length; i++)
            {
                double angle = (i * Math.PI / branches) - Math.PI / 2.0;   // une pointe en haut
                float rayon = (i % 2 == 0) ? exterieur : interieur;
                points[i] = new PointF(cx + rayon * (float)Math.Cos(angle),
                                       cy + rayon * (float)Math.Sin(angle));
            }
            return points;
        }

        /// <summary>Rectangle à coins arrondis en coordonnées flottantes.</summary>
        static GraphicsPath Arrondi(float x, float y, float largeur, float hauteur, float rayon)
        {
            float d = rayon * 2f;
            var chemin = new GraphicsPath();
            chemin.AddArc(x, y, d, d, 180, 90);
            chemin.AddArc(x + largeur - d, y, d, d, 270, 90);
            chemin.AddArc(x + largeur - d, y + hauteur - d, d, d, 0, 90);
            chemin.AddArc(x, y + hauteur - d, d, d, 90, 90);
            chemin.CloseFigure();
            return chemin;
        }

        // ------------------------------------------------------------------ icônes

        /// <summary>Vignette carrée de l'emblème ; transparent hors de la tuile.</summary>
        public static Bitmap Rendre(int cote)
        {
            var image = new Bitmap(cote, cote, PixelFormat.Format32bppArgb);
            using (var g = Graphics.FromImage(image))
            {
                g.Clear(Color.Transparent);
                Dessiner(g, cote);
            }
            return image;
        }

        // Partagée par toutes les fenêtres : construite une fois, jamais libérée
        // (les formulaires ne libèrent que les icônes qu'ils créent eux-mêmes).
        static Icon partagee;

        /// <summary>Icône multi-tailles de la fenêtre et de la barre des tâches.</summary>
        public static Icon Icone()
        {
            if (partagee == null)
                using (var flux = new MemoryStream(Ico(TaillesEcran)))
                    partagee = new Icon(flux);
            return partagee;
        }

        /// <summary>Icône à la taille exacte demandée (barre d'état : 16 px en général).</summary>
        public static Icon Icone(Size taille)
        {
            using (var flux = new MemoryStream(Ico(TaillesEcran)))
                return new Icon(flux, taille);
        }

        /// <summary>Contenu d'un fichier .ico portant les tailles demandées.</summary>
        public static byte[] Ico(int[] tailles)
        {
            var vignettes = new byte[tailles.Length][];
            for (int i = 0; i < tailles.Length; i++)
                using (Bitmap image = Rendre(tailles[i]))
                    vignettes[i] = tailles[i] > SeuilPng ? EnPng(image) : EnBitmap(image);

            using (var flux = new MemoryStream())
            {
                var e = new BinaryWriter(flux);
                e.Write((short)0);                  // réservé
                e.Write((short)1);                  // type : icône
                e.Write((short)tailles.Length);
                int decalage = 6 + 16 * tailles.Length;
                for (int i = 0; i < tailles.Length; i++)
                {
                    byte cote = tailles[i] >= 256 ? (byte)0 : (byte)tailles[i]; // 0 signifie 256
                    e.Write(cote);
                    e.Write(cote);
                    e.Write((byte)0);               // palette : aucune
                    e.Write((byte)0);               // réservé
                    e.Write((short)1);              // plans
                    e.Write((short)32);             // bits par pixel
                    e.Write(vignettes[i].Length);
                    e.Write(decalage);
                    decalage += vignettes[i].Length;
                }
                for (int i = 0; i < tailles.Length; i++) e.Write(vignettes[i]);
                e.Flush();
                return flux.ToArray();
            }
        }

        /// <summary>Vignette au format bitmap brut (en-tête 40 octets, 32 bits, plus masque).</summary>
        static byte[] EnBitmap(Bitmap image)
        {
            int cote = image.Width;
            int octetsMasque = ((cote + 31) / 32) * 4;
            using (var flux = new MemoryStream())
            {
                var e = new BinaryWriter(flux);
                e.Write(40);                        // taille de l'en-tête
                e.Write(cote);                      // largeur
                e.Write(cote * 2);                  // hauteur : image puis masque
                e.Write((short)1);                  // plans
                e.Write((short)32);                 // bits par pixel
                e.Write(0);                         // compression : aucune
                e.Write(cote * cote * 4);           // taille de l'image
                e.Write(0); e.Write(0);             // résolution
                e.Write(0); e.Write(0);             // couleurs utilisées / importantes

                for (int y = cote - 1; y >= 0; y--) // lignes du bas vers le haut
                    for (int x = 0; x < cote; x++)
                    {
                        Color p = image.GetPixel(x, y);
                        e.Write(p.B); e.Write(p.G); e.Write(p.R); e.Write(p.A);
                    }

                // Masque monochrome entièrement opaque : c'est l'alpha qui découpe.
                var ligne = new byte[octetsMasque];
                for (int y = 0; y < cote; y++) e.Write(ligne);

                e.Flush();
                return flux.ToArray();
            }
        }

        /// <summary>Vignette au format PNG, pour les grandes tailles.</summary>
        static byte[] EnPng(Bitmap image)
        {
            using (var flux = new MemoryStream())
            {
                image.Save(flux, ImageFormat.Png);
                return flux.ToArray();
            }
        }

#if OUTIL_ICONE
        /// <summary>
        /// Point d'entrée du générateur appelé par outils/build.ps1 : écrit le .ico
        /// embarqué dans Mithril.exe, et si on le demande un aperçu PNG en 512 px.
        /// Usage : gen-icone &lt;sortie.ico&gt; [apercu.png]. Muet : le build se contente
        /// du code de retour, et rien de ce fichier ne doit tracer sur la console.
        /// </summary>
        static int Main(string[] args)
        {
            if (args.Length < 1) return 2;
            File.WriteAllBytes(args[0], Ico(TaillesFichier));
            if (args.Length >= 2)
                using (Bitmap apercu = Rendre(512))
                    apercu.Save(args[1], ImageFormat.Png);
            return 0;
        }
#endif
    }
}
