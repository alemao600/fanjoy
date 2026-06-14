(function () {
  const STORAGE_KEY = "fanjoy_admin_credentials";
  const DEFAULT_CREDENTIALS = {
    username: "Fanjoy",
    password: "GabiDi$$$",
    apiToken: "admin123"
  };

  function getCredentials() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && saved.username && saved.password) {
        return {
          username: String(saved.username),
          password: String(saved.password),
          apiToken: saved.apiToken || DEFAULT_CREDENTIALS.apiToken
        };
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    return { ...DEFAULT_CREDENTIALS };
  }

  function validate(username, password) {
    const credentials = getCredentials();
    return String(username).trim() === credentials.username && String(password) === credentials.password;
  }

  function updateCredentials(username, password) {
    const next = {
      username: String(username).trim(),
      password: String(password),
      apiToken: getCredentials().apiToken || DEFAULT_CREDENTIALS.apiToken
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  window.FanjoyAdminAuth = {
    getCredentials,
    validate,
    updateCredentials,
    defaultCredentials: { ...DEFAULT_CREDENTIALS }
  };
})();
