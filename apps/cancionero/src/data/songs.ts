import type { Song } from '@/features/songs/types';

// Chansons fournies avec l'app. Ce sont des textes ORIGINAUX écrits pour
// l'apprentissage (vocabulaire simple et progressif) — aucun problème de droits.
// L'utilisateur peut ajouter ses propres chansons depuis l'écran « Ajouter ».

export const BUILTIN_SONGS: Song[] = [
  {
    id: 'hola-como-estas',
    title: 'Hola, ¿cómo estás?',
    artist: 'Original',
    level: 'debutant',
    emoji: '👋',
    color: 'rosa',
    source: 'builtin',
    lines: [
      { es: 'Hola, hola, ¿cómo estás?', fr: 'Salut, salut, comment vas-tu ?' },
      { es: 'Muy bien, gracias, ¿y tú qué tal?', fr: 'Très bien, merci, et toi ça va ?' },
      { es: 'Buenos días, buenas tardes,', fr: 'Bonjour (le matin), bon après-midi,' },
      { es: 'buenas noches, hasta mañana.', fr: 'bonne nuit, à demain.' },
      { es: 'Me llamo Ana, ¿y tú cómo te llamas?', fr: "Je m'appelle Ana, et toi comment t'appelles-tu ?" },
      { es: 'Mucho gusto, encantada.', fr: 'Enchanté(e), ravie.' },
      { es: 'Adiós, adiós, hasta luego,', fr: 'Au revoir, au revoir, à bientôt,' },
      { es: 'nos vemos pronto, te lo prometo.', fr: 'on se voit bientôt, je te le promets.' },
    ],
  },
  {
    id: 'mi-familia',
    title: 'Mi familia',
    artist: 'Original',
    level: 'debutant',
    emoji: '👨‍👩‍👧‍👦',
    color: 'amarillo',
    source: 'builtin',
    lines: [
      { es: 'Esta es mi familia, te la voy a presentar.', fr: 'Voici ma famille, je vais te la présenter.' },
      { es: 'Mi madre y mi padre me quieren cuidar.', fr: 'Ma mère et mon père veulent prendre soin de moi.' },
      { es: 'Mi hermano es pequeño, mi hermana es mayor.', fr: 'Mon frère est petit, ma sœur est plus grande.' },
      { es: 'Los abuelos nos cuentan historias de amor.', fr: "Les grands-parents nous racontent des histoires d'amour." },
      { es: 'En casa vivimos con el perro y el gato,', fr: 'À la maison on vit avec le chien et le chat,' },
      { es: 'comemos todos juntos, es un buen rato.', fr: "on mange tous ensemble, c'est un bon moment." },
    ],
  },
  {
    id: 'en-el-mercado',
    title: 'En el mercado',
    artist: 'Original',
    level: 'intermediaire',
    emoji: '🧺',
    color: 'turquesa',
    source: 'builtin',
    lines: [
      { es: 'Voy al mercado por la mañana,', fr: 'Je vais au marché le matin,' },
      { es: 'con mi cesta y muchas ganas.', fr: "avec mon panier et plein d'envie." },
      { es: 'Quiero manzanas, quiero pan,', fr: 'Je veux des pommes, je veux du pain,' },
      { es: 'dos tomates y un buen flan.', fr: 'deux tomates et un bon flan.' },
      { es: '¿Cuánto cuesta? Pregunto al señor.', fr: 'Combien ça coûte ? Je demande au monsieur.' },
      { es: 'Tres euros, dice, con una sonrisa mejor.', fr: 'Trois euros, dit-il, avec un beau sourire.' },
      { es: 'Gracias, pago y me voy contento,', fr: 'Merci, je paie et je repars content,' },
      { es: 'con comida fresca para el momento.', fr: "avec de la nourriture fraîche pour l'instant." },
    ],
  },
];
