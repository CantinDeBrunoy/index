using System;
using System.Collections.Generic;
using System.Text;

namespace Mithril
{
    /// <summary>
    /// Encodeur QR minimal et autonome (ISO/IEC 18004) : mode octets, versions 1 à 10,
    /// correction d'erreurs niveau M. Suffisant pour un identifiant d'appareil Syncthing
    /// (63 caractères → version 5). Aucune dépendance : le dessin est laissé à l'appelant,
    /// qui reçoit une grille de booléens (vrai = module sombre).
    /// </summary>
    static class Qr
    {
        // Par version (index 1..10), niveau M : nombre total de mots de code, mots de
        // correction par bloc, nombre de blocs du groupe 1, mots de données par bloc du
        // groupe 1, nombre de blocs du groupe 2, mots de données par bloc du groupe 2.
        static readonly int[][] TableM = {
            null,
            new[] { 26, 10, 1, 16, 0, 0 },
            new[] { 44, 16, 1, 28, 0, 0 },
            new[] { 70, 26, 1, 44, 0, 0 },
            new[] { 100, 18, 2, 32, 0, 0 },
            new[] { 134, 24, 2, 43, 0, 0 },
            new[] { 172, 16, 4, 27, 0, 0 },
            new[] { 196, 18, 4, 31, 0, 0 },
            new[] { 242, 22, 2, 38, 2, 39 },
            new[] { 292, 22, 3, 36, 2, 37 },
            new[] { 346, 26, 4, 43, 1, 44 },
        };

        // Positions des motifs d'alignement par version (1..10).
        static readonly int[][] Alignements = {
            null, new int[0], new[] { 6, 18 }, new[] { 6, 22 }, new[] { 6, 26 }, new[] { 6, 30 },
            new[] { 6, 34 }, new[] { 6, 22, 38 }, new[] { 6, 24, 42 }, new[] { 6, 26, 46 }, new[] { 6, 28, 50 },
        };

        /// <summary>Encode le texte (UTF-8) ; renvoie la matrice [ligne, colonne], sans zone de silence.</summary>
        public static bool[,] Encoder(string texte)
        {
            byte[] octets = Encoding.UTF8.GetBytes(texte);
            int version = ChoisirVersion(octets.Length);
            int[] t = TableM[version];
            int totalDonnees = t[2] * t[3] + t[4] * t[5];

            // 1. Flux de bits : mode 0100, longueur sur 8 bits (versions 1-9) ou 16 (10+), données,
            //    terminateur, bourrage 0xEC / 0x11.
            var bits = new List<bool>();
            AjouterBits(bits, 4, 4);
            AjouterBits(bits, octets.Length, version <= 9 ? 8 : 16);
            foreach (byte o in octets) AjouterBits(bits, o, 8);
            int capacite = totalDonnees * 8;
            AjouterBits(bits, 0, Math.Min(4, capacite - bits.Count));
            while (bits.Count % 8 != 0) bits.Add(false);
            byte[] donnees = new byte[totalDonnees];
            for (int i = 0; i < bits.Count; i++) if (bits[i]) donnees[i / 8] |= (byte)(0x80 >> (i % 8));
            for (int i = bits.Count / 8, k = 0; i < totalDonnees; i++, k++) donnees[i] = (k % 2 == 0) ? (byte)0xEC : (byte)0x11;

            // 2. Blocs + Reed-Solomon, puis entrelacement.
            int nbBlocs = t[2] + t[4];
            var blocsDonnees = new byte[nbBlocs][];
            var blocsEc = new byte[nbBlocs][];
            int[] generateur = GenerateurRs(t[1]);
            int position = 0;
            for (int b = 0; b < nbBlocs; b++)
            {
                int taille = b < t[2] ? t[3] : t[5];
                blocsDonnees[b] = new byte[taille];
                Array.Copy(donnees, position, blocsDonnees[b], 0, taille);
                position += taille;
                blocsEc[b] = CalculerRs(blocsDonnees[b], generateur);
            }
            var final = new List<byte>(t[0]);
            int maxDonnees = Math.Max(t[3], t[5]);
            for (int i = 0; i < maxDonnees; i++)
                for (int b = 0; b < nbBlocs; b++)
                    if (i < blocsDonnees[b].Length) final.Add(blocsDonnees[b][i]);
            for (int i = 0; i < t[1]; i++)
                for (int b = 0; b < nbBlocs; b++) final.Add(blocsEc[b][i]);

            // 3. Matrice : motifs fonctionnels, puis données, puis meilleur masque.
            int taille2 = 17 + 4 * version;
            var modules = new bool[taille2, taille2];
            var fonction = new bool[taille2, taille2];
            PoserMotifs(modules, fonction, version);
            PlacerDonnees(modules, fonction, final.ToArray());

            int meilleurMasque = 0, meilleurePenalite = int.MaxValue;
            bool[,] meilleure = null;
            for (int m = 0; m < 8; m++)
            {
                var essai = (bool[,])modules.Clone();
                AppliquerMasque(essai, fonction, m);
                PoserFormat(essai, m);
                int penalite = Penalite(essai);
                if (penalite < meilleurePenalite) { meilleurePenalite = penalite; meilleurMasque = m; meilleure = essai; }
            }
            return meilleure;
        }

        static int ChoisirVersion(int longueur)
        {
            for (int v = 1; v <= 10; v++)
            {
                int[] t = TableM[v];
                int capacite = t[2] * t[3] + t[4] * t[5];
                int entete = 4 + (v <= 9 ? 8 : 16);
                if (entete + longueur * 8 <= capacite * 8) return v;
            }
            throw new ArgumentException("Texte trop long pour un QR jusqu'à la version 10.");
        }

        static void AjouterBits(List<bool> bits, int valeur, int nombre)
        {
            for (int i = nombre - 1; i >= 0; i--) bits.Add(((valeur >> i) & 1) != 0);
        }

        // --- Reed-Solomon sur GF(256), polynôme 0x11D ---

        static readonly byte[] Exp = new byte[512];
        static readonly byte[] Log = new byte[256];

        static Qr()
        {
            int x = 1;
            for (int i = 0; i < 255; i++)
            {
                Exp[i] = (byte)x;
                Log[x] = (byte)i;
                x <<= 1;
                if (x >= 256) x ^= 0x11D;
            }
            for (int i = 255; i < 512; i++) Exp[i] = Exp[i - 255];
        }

        static int Mul(int a, int b)
        {
            if (a == 0 || b == 0) return 0;
            return Exp[Log[a] + Log[b]];
        }

        static int[] GenerateurRs(int degre)
        {
            int[] g = { 1 };
            for (int i = 0; i < degre; i++)
            {
                int[] suivant = new int[g.Length + 1];
                for (int j = 0; j < g.Length; j++)
                {
                    suivant[j] ^= g[j];
                    suivant[j + 1] ^= Mul(g[j], Exp[i]);
                }
                g = suivant;
            }
            return g;
        }

        static byte[] CalculerRs(byte[] donnees, int[] generateur)
        {
            int degre = generateur.Length - 1;
            int[] reste = new int[degre];
            foreach (byte d in donnees)
            {
                int facteur = d ^ reste[0];
                Array.Copy(reste, 1, reste, 0, degre - 1);
                reste[degre - 1] = 0;
                for (int j = 0; j < degre; j++) reste[j] ^= Mul(generateur[j + 1], facteur);
            }
            byte[] sortie = new byte[degre];
            for (int i = 0; i < degre; i++) sortie[i] = (byte)reste[i];
            return sortie;
        }

        // --- Motifs fonctionnels ---

        static void PoserMotifs(bool[,] m, bool[,] f, int version)
        {
            int n = m.GetLength(0);
            PoserViseur(m, f, 0, 0);
            PoserViseur(m, f, n - 7, 0);
            PoserViseur(m, f, 0, n - 7);
            for (int i = 8; i < n - 8; i++) // synchronisation
            {
                m[6, i] = m[i, 6] = i % 2 == 0;
                f[6, i] = f[i, 6] = true;
            }
            int[] al = Alignements[version];
            for (int a = 0; a < al.Length; a++)
                for (int b = 0; b < al.Length; b++)
                {
                    int l = al[a], c = al[b];
                    if (f[l, c]) continue; // chevauche un viseur
                    for (int dl = -2; dl <= 2; dl++)
                        for (int dc = -2; dc <= 2; dc++)
                        {
                            m[l + dl, c + dc] = Math.Max(Math.Abs(dl), Math.Abs(dc)) != 1;
                            f[l + dl, c + dc] = true;
                        }
                }
            // Réservation des zones de format (posées après masquage) et module sombre.
            for (int i = 0; i < 9; i++) { f[8, i] = true; f[i, 8] = true; }
            for (int i = 0; i < 8; i++) { f[8, n - 1 - i] = true; f[n - 1 - i, 8] = true; }
            m[n - 8, 8] = true; f[n - 8, 8] = true;
            // Versions 7+ : information de version (18 bits, BCH 18,6).
            if (version >= 7)
            {
                int bits = version << 12;
                int reste = version << 12;
                for (int i = 17; i >= 12; i--) if (((reste >> i) & 1) != 0) reste ^= 0x1F25 << (i - 12);
                bits |= reste;
                for (int i = 0; i < 18; i++)
                {
                    bool bit = ((bits >> i) & 1) != 0;
                    int l = i / 3, c = n - 11 + i % 3;
                    m[l, c] = bit; f[l, c] = true;
                    m[c, l] = bit; f[c, l] = true;
                }
            }
        }

        static void PoserViseur(bool[,] m, bool[,] f, int l0, int c0)
        {
            int n = m.GetLength(0);
            for (int dl = -1; dl <= 7; dl++)
                for (int dc = -1; dc <= 7; dc++)
                {
                    int l = l0 + dl, c = c0 + dc;
                    if (l < 0 || c < 0 || l >= n || c >= n) continue;
                    bool bord = dl == -1 || dc == -1 || dl == 7 || dc == 7;
                    bool anneau = dl == 0 || dc == 0 || dl == 6 || dc == 6;
                    bool centre = dl >= 2 && dl <= 4 && dc >= 2 && dc <= 4;
                    m[l, c] = !bord && (anneau || centre);
                    f[l, c] = true;
                }
        }

        static void PlacerDonnees(bool[,] m, bool[,] f, byte[] donnees)
        {
            int n = m.GetLength(0);
            int bit = 0, total = donnees.Length * 8;
            for (int droite = n - 1; droite >= 1; droite -= 2)
            {
                if (droite == 6) droite = 5;
                for (int k = 0; k < n; k++)
                {
                    int l = ((droite + 1) & 2) == 0 ? n - 1 - k : k; // zigzag montant / descendant
                    for (int dc = 0; dc < 2; dc++)
                    {
                        int c = droite - dc;
                        if (f[l, c]) continue;
                        if (bit < total) m[l, c] = ((donnees[bit / 8] >> (7 - bit % 8)) & 1) != 0;
                        bit++;
                    }
                }
            }
        }

        static void AppliquerMasque(bool[,] m, bool[,] f, int masque)
        {
            int n = m.GetLength(0);
            for (int l = 0; l < n; l++)
                for (int c = 0; c < n; c++)
                {
                    if (f[l, c]) continue;
                    bool inverser;
                    switch (masque)
                    {
                        case 0: inverser = (l + c) % 2 == 0; break;
                        case 1: inverser = l % 2 == 0; break;
                        case 2: inverser = c % 3 == 0; break;
                        case 3: inverser = (l + c) % 3 == 0; break;
                        case 4: inverser = (l / 2 + c / 3) % 2 == 0; break;
                        case 5: inverser = (l * c) % 2 + (l * c) % 3 == 0; break;
                        case 6: inverser = ((l * c) % 2 + (l * c) % 3) % 2 == 0; break;
                        default: inverser = ((l + c) % 2 + (l * c) % 3) % 2 == 0; break;
                    }
                    if (inverser) m[l, c] = !m[l, c];
                }
        }

        /// <summary>Information de format : niveau M (00) + masque, BCH (15,5), masquée par 0x5412.</summary>
        static void PoserFormat(bool[,] m, int masque)
        {
            int n = m.GetLength(0);
            int donnees = (0 << 3) | masque; // niveau M = 00
            int reste = donnees << 10;
            for (int i = 14; i >= 10; i--) if (((reste >> i) & 1) != 0) reste ^= 0x537 << (i - 10);
            int bits = ((donnees << 10) | reste) ^ 0x5412;
            for (int i = 0; i < 15; i++)
            {
                bool bit = ((bits >> i) & 1) != 0;
                // Autour du viseur haut-gauche : colonne 8 de haut en bas, puis ligne 8 vers la gauche
                if (i < 6) m[i, 8] = bit;
                else if (i == 6) m[7, 8] = bit;
                else if (i == 7) m[8, 8] = bit;
                else if (i == 8) m[8, 7] = bit;
                else m[8, 14 - i] = bit;
                // Copie : ligne 8 sous le viseur haut-droit, colonne 8 à droite du viseur bas-gauche
                if (i < 8) m[8, n - 1 - i] = bit;
                else m[n - 15 + i, 8] = bit;
            }
            m[n - 8, 8] = true;
        }

        static int Penalite(bool[,] m)
        {
            int n = m.GetLength(0), total = 0;
            // Règle 1 : suites de 5+ modules identiques, en ligne et en colonne.
            for (int l = 0; l < n; l++)
            {
                int serieL = 1, serieC = 1;
                for (int c = 1; c < n; c++)
                {
                    if (m[l, c] == m[l, c - 1]) { if (++serieL == 5) total += 3; else if (serieL > 5) total++; } else serieL = 1;
                    if (m[c, l] == m[c - 1, l]) { if (++serieC == 5) total += 3; else if (serieC > 5) total++; } else serieC = 1;
                }
            }
            // Règle 2 : blocs 2×2 uniformes.
            for (int l = 0; l < n - 1; l++)
                for (int c = 0; c < n - 1; c++)
                    if (m[l, c] == m[l, c + 1] && m[l, c] == m[l + 1, c] && m[l, c] == m[l + 1, c + 1]) total += 3;
            // Règle 3 : motif 1011101 bordé de 4 clairs.
            for (int l = 0; l < n; l++)
                for (int c = 0; c + 11 <= n; c++)
                {
                    if (Motif(m, l, c, true)) total += 40;  // horizontal : ligne l, colonnes c..c+10
                    if (Motif(m, l, c, false)) total += 40; // vertical : colonne l, lignes c..c+10
                }
            // Règle 4 : proportion de sombre.
            int sombres = 0;
            foreach (bool b in m) if (b) sombres++;
            int pct = sombres * 100 / (n * n);
            total += Math.Min(Math.Abs(pct - 50) / 5, Math.Abs(pct - 50 + 4) / 5) * 10;
            return total;
        }

        static readonly bool[] MotifA = { true, false, true, true, true, false, true, false, false, false, false };
        static readonly bool[] MotifB = { false, false, false, false, true, false, true, true, true, false, true };

        static bool Motif(bool[,] m, int l, int c, bool horizontal)
        {
            bool a = true, b = true;
            for (int i = 0; i < 11; i++)
            {
                bool v = horizontal ? m[l, c + i] : m[c + i, l]; // vertical : l est la colonne, c le départ en ligne
                if (v != MotifA[i]) a = false;
                if (v != MotifB[i]) b = false;
            }
            return a || b;
        }
    }
}
