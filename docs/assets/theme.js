(() => {
  const storageKey = 'theme';
  const root = document.documentElement;
  const button = document.getElementById('theme-toggle');

  const prefersDark = () => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const storage = (() => {
    try {
      localStorage.setItem('__t', '1');
      localStorage.removeItem('__t');
      return localStorage;
    } catch (err) {
      try {
        sessionStorage.setItem('__t', '1');
        sessionStorage.removeItem('__t');
        return sessionStorage;
      } catch (innerErr) {
        return null;
      }
    }
  })();

  const applyTheme = (theme) => {
    root.setAttribute('data-theme', theme);
    if (button) {
      const isDark = theme === 'dark';
      button.textContent = isDark ? 'Light' : 'Dark';
      button.setAttribute('aria-pressed', String(isDark));
    }
  };

  const stored = storage ? storage.getItem(storageKey) : null;
  const initial = stored === 'dark' || stored === 'light' ? stored : (prefersDark() ? 'dark' : 'light');
  applyTheme(initial);

  if (button) {
    button.addEventListener('click', () => {
      const current = root.getAttribute('data-theme') || (prefersDark() ? 'dark' : 'light');
      const next = current === 'dark' ? 'light' : 'dark';
      if (storage) storage.setItem(storageKey, next);
      applyTheme(next);
    });
  }
})();
