import { useState } from 'react';
import { getPosition, PRECISE_FIX } from './geolocation';
import { clearHome, loadHome, saveHome } from './home';

/** Enregistre le point de départ utilisé quand le GPS ne répond pas. */
export function HomeSettings() {
  const [home, setHome] = useState(loadHome);
  const [status, setStatus] = useState<'idle' | 'locating' | 'failed'>('idle');

  async function saveCurrentPosition() {
    if (home && !window.confirm('Remplacer ton domicile par ta position actuelle ?')) return;
    setStatus('locating');
    try {
      const point = await getPosition(PRECISE_FIX);
      saveHome(point);
      setHome(point);
      setStatus('idle');
    } catch {
      setStatus('failed');
    }
  }

  function forget() {
    clearHome();
    setHome(null);
  }

  return (
    <section className="home" aria-labelledby="home-title">
      <h2 id="home-title">Domicile de secours</h2>
      <p>
        {home
          ? 'Enregistré sur ce téléphone, et nulle part ailleurs. Il sert de départ quand le GPS ne répond pas.'
          : 'Aucun. Enregistre-le une fois, depuis chez toi : il servira de départ quand le GPS ne répond pas.'}
      </p>
      <div className="home__actions">
        <button className="button" type="button" onClick={saveCurrentPosition} disabled={status === 'locating'}>
          {status === 'locating' ? 'Localisation…' : home ? 'Remplacer par ma position' : 'Utiliser ma position actuelle'}
        </button>
        {home && (
          <button className="button button--quiet" type="button" onClick={forget}>
            Effacer
          </button>
        )}
      </div>
      {status === 'failed' && (
        <p className="error" role="alert">
          Position introuvable. Vérifie que la localisation est autorisée, puis réessaie.
        </p>
      )}
    </section>
  );
}
