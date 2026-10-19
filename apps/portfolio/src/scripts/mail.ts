/**
 * Les liens vers l'adresse de Cantin (« M'écrire », l'adresse au pied des pages) : sans messagerie installée sur
 * l'ordinateur, le navigateur ne fait rien d'un lien mailto:. Le clic copie donc aussi l'adresse, et Adam arrive
 * en bas à droite pour l'annoncer ([data-mail-adam], posé par layouts/Voyage.astro) ; la messagerie, s'il y en a
 * une, s'ouvre comme avant. Écouté sur le document : les fiches posées sous leur escale après coup
 * (scripts/voyage-fiche.ts) en profitent aussi.
 */

const adam = document.querySelector<HTMLElement>("[data-mail-adam]");

if (adam) {
  const face = adam.querySelector<HTMLImageElement>("[data-mail-face]")!;
  const text = adam.querySelector<HTMLElement>("[data-mail-text]")!;
  const address = adam.querySelector<HTMLElement>("[data-mail-address]")!;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const mailLink = (target: EventTarget | null) => (target as Element | null)?.closest?.<HTMLAnchorElement>('a[href^="mailto:"]');
  let timer = 0;

  // Sa boucle animée pèse ~600 Ko : elle ne se charge qu'en visant le lien, son image fixe en attendant.
  const dress = () => {
    if (face.getAttribute("src")) return;
    face.src = adam.dataset.still!;
    if (reduce.matches) return;
    const loop = new Image();
    loop.onload = () => (face.src = loop.src);
    loop.src = adam.dataset.loop!;
  };

  const hide = () => adam.classList.remove("is-shown");
  const later = (ms: number) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(hide, ms);
  };
  const show = (copied: boolean, email: string) => {
    dress();
    text.textContent = copied ? adam.dataset.copied! : adam.dataset.shown!;
    address.textContent = email;
    adam.classList.add("is-shown");
    later(copied ? 6000 : 12000);
  };

  // L'ancienne copie, par une sélection, quand le presse-papiers refuse (ou n'existe pas).
  const copyBySelection = (email: string) => {
    const back = document.activeElement as HTMLElement | null;
    const field = document.createElement("textarea");
    field.value = email;
    field.setAttribute("readonly", "");
    field.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(field);
    field.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {}
    field.remove();
    back?.focus({ preventScroll: true });
    return copied;
  };

  document.addEventListener("pointerover", (event) => mailLink(event.target) && dress());
  document.addEventListener("focusin", (event) => mailLink(event.target) && dress());
  document.addEventListener("click", (event) => {
    const link = mailLink(event.target);
    if (!link) return;
    const email = decodeURIComponent(link.href.slice("mailto:".length).split("?")[0]!);
    if (!navigator.clipboard) return show(copyBySelection(email), email);
    navigator.clipboard.writeText(email).then(
      () => show(true, email),
      () => show(copyBySelection(email), email),
    );
  });

  // Il reste tant que le pointeur est sur sa bulle ; un clic la range (sauf sur l'adresse, qu'on peut sélectionner).
  adam.addEventListener("pointerenter", () => window.clearTimeout(timer));
  adam.addEventListener("pointerleave", () => adam.classList.contains("is-shown") && later(2500));
  adam.addEventListener("click", (event) => {
    if (!(event.target as Element).closest("[data-mail-address]")) hide();
  });
  document.addEventListener("keydown", (event) => event.key === "Escape" && hide());
}
