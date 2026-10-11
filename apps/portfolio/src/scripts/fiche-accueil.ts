// L'accueil du copilote sur une fiche (components/voyage/FicheAccueil.astro), à la première fiche ouverte dans
// ce navigateur. Le script en ligne du haut de la fiche a déjà posé « fiche-accueil » sur <html>, avant
// l'affichage : la fiche n'a que son en-tête (FichePage.astro cache le reste). Ici, on le montre, et le
// navigateur s'en souvient (localStorage) : il ne revient sur aucune fiche. « Voir les détails », la croix ou
// Échap montrent la fiche (« fiche-revele », le temps qu'elle apparaisse) ; lui saute dans sa pastille, en bas à
// droite (le bouton « Reprends ton voyage », scripts/resume-button.ts), qui l'appelle alors quelques secondes.
// Un clic sur lui ramène au voyage. En mouvement réduit, il ne saute pas : il s'efface, et la pastille apparaît.

/** Le saut vers la pastille, sa hauteur, et le temps où la pastille l'appelle. */
const FLIGHT_MS = 700;
const LIFT = 70;
const CALL_MS = 4000;
const SEEN_KEY = "index:copilote-fiche";

const html = document.documentElement;
const welcome = document.querySelector<HTMLElement>("[data-fiche-accueil]");
const me = welcome?.querySelector<HTMLElement>("[data-fiche-accueil-moi]");
const button = document.querySelector<HTMLElement>("[data-resume]");
const dockImg = document.querySelector<HTMLElement>("[data-resume-dock] img");

if (welcome && me && button && dockImg && html.classList.contains("fiche-accueil")) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (2 - 2 * t) ** 3 / 2);
  let leaving = false;

  try {
    localStorage.setItem(SEEN_KEY, "vu");
  } catch {
    // Stockage bloqué : l'accueil reviendra à la prochaine fiche.
  }
  welcome.hidden = false;

  /** Le saut, comme celui de la pastille vers la bande du bas : il file vers elle, s'élève un peu puis retombe,
   *  penche et rapetisse, et finit exactement sur l'image de la pastille. */
  const fly = () => {
    const img = me.querySelector("img")!;
    const from = img.getBoundingClientRect();
    const to = dockImg.getBoundingClientRect();
    const box = me.getBoundingClientRect();
    const x = to.left - from.left;
    const y = to.top - from.top;
    const scale = to.width / from.width;
    me.style.transformOrigin = `${from.left - box.left}px ${from.top - box.top}px`;
    const frames = Array.from({ length: 25 }, (_, k) => {
      const t = k / 24;
      const dx = x * easeInOut(t);
      const dy = y * t * t - 4 * LIFT * t * (1 - t);
      const tilt = -12 * Math.sin(Math.PI * t);
      return { transform: `translate(${dx}px, ${dy}px) rotate(${tilt}deg) scale(${1 + (scale - 1) * t})` };
    });
    const flight = me.animate(frames, { duration: FLIGHT_MS, fill: "forwards" }).finished;
    // Si la page ne se dessine pas (un onglet caché fige les animations), il se pose quand même.
    return Promise.race([flight, new Promise((done) => window.setTimeout(done, FLIGHT_MS + 150))]);
  };

  /** Posé : la pastille rebondit, sa bulle s'ouvre, et elle l'appelle quelques secondes. */
  const land = () => {
    welcome.hidden = true;
    button.classList.remove("is-waiting");
    button.classList.add("is-calling");
    window.setTimeout(() => {
      button.classList.remove("is-calling");
      html.classList.remove("fiche-revele");
    }, CALL_MS);
  };

  const reveal = () => {
    if (leaving) return;
    leaving = true;
    const hadFocus = welcome.contains(document.activeElement);
    welcome.classList.add("bye");
    button.classList.add("is-waiting");
    html.classList.remove("fiche-accueil");
    html.classList.add("fiche-revele");
    // La fiche est là : le bouton « Reprends ton voyage » reprend sa place.
    document.dispatchEvent(new Event("fiche:revele"));
    if (hadFocus) {
      const main = document.querySelector<HTMLElement>("main");
      if (main) {
        main.tabIndex = -1;
        main.focus({ preventScroll: true });
      }
    }
    if (reduced.matches) window.setTimeout(land, 300);
    else fly().then(land, land);
  };

  welcome.addEventListener("click", (event) => {
    if ((event.target as Element).closest("[data-fiche-accueil-fermer]")) reveal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !welcome.hidden) reveal();
  });
}

export {};
