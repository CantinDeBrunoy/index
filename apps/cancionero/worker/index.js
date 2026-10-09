// Une chanson (/song/<id>) reçoit sa page pré-rendue, song/[id].html, et non l'accueil : React hydrate
// alors un HTML qui correspond à la page affichée (sinon, erreur #418 et tout l'écran refait). Seules ces
// adresses passent par ce Worker (run_worker_first) ; le reste est servi directement depuis les fichiers.
export default {
  fetch(request, env) {
    const url = new URL(request.url);
    // Sous sa forme encodée : c'est l'adresse canonique du fichier, que le serveur de fichiers sert sans rediriger.
    url.pathname = "/song/%5Bid%5D";
    return env.ASSETS.fetch(new Request(url, request));
  },
};
