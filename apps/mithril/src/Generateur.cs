using System;
using System.Security.Cryptography;
using System.Text;

namespace Mithril
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

}
