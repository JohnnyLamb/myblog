(() => {
  const storageKey = 'theme';
  const root = document.documentElement;
  const button = document.getElementById('theme-toggle');

  const prefersDark = () => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  const applyTheme = (theme) => {
    if (theme) {
      root.setAttribute('data-theme', theme);
    } else {
      root.removeAttribute('data-theme');
    }
    if (button) {
      const isDark = (theme || (prefersDark() ? 'dark' : 'light')) === 'dark';
      button.textContent = isDark ? 'Light' : 'Dark';
      button.setAttribute('aria-pressed', String(isDark));
    }
  };

  const stored = localStorage.getItem(storageKey);
  if (stored === 'dark' || stored === 'light') {
    applyTheme(stored);
  } else {
    applyTheme(prefersDark() ? 'dark' : 'light');
  }

  if (button) {
    button.addEventListener('click', () => {
      const current = root.getAttribute('data-theme') || (prefersDark() ? 'dark' : 'light');
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem(storageKey, next);
      applyTheme(next);
    });
  }
})();
