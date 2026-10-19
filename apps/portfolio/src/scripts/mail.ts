/**
 * Les liens vers mon adresse (« M'écrire », l'adresse au pied des pages) : sans messagerie installée sur
 * l'ordinateur, le navigateur ne fait rien d'un lien mailto:. Le clic copie donc aussi l'adresse et la montre
 * quelques secondes dans la carte du bas de l'écran ([data-mail-toast], posée par layouts/Voyage.astro) ; la
 * messagerie, s'il y en a une, s'ouvre comme avant. Écouté sur le document : les fiches posées sous leur escale
 * après coup (scripts/voyage-fiche.ts) en profitent aussi.
 */

const toast = document.querySelector<HTMLElement>("[data-mail-toast]");

if (toast) {
  const title = toast.querySelector<HTMLElement>("[data-mail-title]")!;
  const address = toast.querySelector<HTMLElement>("[data-mail-address]")!;
  let timer = 0;

  const show = (copied: boolean, email: string) => {
    title.textContent = copied ? toast.dataset.copied! : toast.dataset.shown!;
    address.textContent = email;
    toast.classList.add("is-shown");
    window.clearTimeout(timer);
    timer = window.setTimeout(() => toast.classList.remove("is-shown"), copied ? 4000 : 8000);
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

  document.addEventListener("click", (event) => {
    const link = (event.target as Element).closest?.<HTMLAnchorElement>('a[href^="mailto:"]');
    if (!link) return;
    const email = decodeURIComponent(link.href.slice("mailto:".length).split("?")[0]!);
    if (!navigator.clipboard) return show(copyBySelection(email), email);
    navigator.clipboard.writeText(email).then(
      () => show(true, email),
      () => show(copyBySelection(email), email),
    );
  });
}
