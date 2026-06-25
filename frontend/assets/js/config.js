(function () {
  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";

  if (isLocal) {
    window.SPOTNFIX_API_BASE = "http://localhost:3000/api";
    window.SPOTNFIX_SERVER_BASE = "http://localhost:3000";
    return;
  }

  // Live demo: API is served from the same host as the website
  window.SPOTNFIX_API_BASE = `${window.location.origin}/api`;
  window.SPOTNFIX_SERVER_BASE = window.location.origin;
})();
