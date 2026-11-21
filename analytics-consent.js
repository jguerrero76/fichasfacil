(() => {
  const key = 'fichasfacil.analytics-consent';
  const measurementId = 'G-G2LNQ3H6ET';

  const enable = () => {
    if (window.__fichasAnalyticsLoaded) return;
    window.__fichasAnalyticsLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = (...args) => window.dataLayer.push(args);
    window.gtag('js', new Date());
    window.gtag('config', measurementId, { anonymize_ip: true });
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.append(script);
  };

  const saved = localStorage.getItem(key);
  if (saved === 'accepted') { enable(); return; }
  if (saved === 'rejected') return;

  const banner = document.createElement('section');
  banner.className = 'analytics-consent';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Preferencias de analítica');
  banner.innerHTML = '<p>Usamos analítica anónima para mejorar FichasFácil. Puedes aceptar o rechazarla.</p><p><a href="cookies.html">Más información sobre cookies</a></p><div><button type="button" data-choice="reject">Rechazar</button><button type="button" data-choice="accept">Aceptar analítica</button></div>';
  banner.addEventListener('click', event => {
    const choice = event.target.closest('[data-choice]')?.dataset.choice;
    if (!choice) return;
    localStorage.setItem(key, choice === 'accept' ? 'accepted' : 'rejected');
    if (choice === 'accept') enable();
    banner.remove();
  });
  document.addEventListener('DOMContentLoaded', () => document.body.append(banner));
})();
