(function () {
  const RETURN_KEY = "spotnfix_return_url";

  function getReturnUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("return") || sessionStorage.getItem(RETURN_KEY) || "";
  }

  function saveReturnUrl(url) {
    if (url) sessionStorage.setItem(RETURN_KEY, url);
  }

  function clearReturnUrl() {
    sessionStorage.removeItem(RETURN_KEY);
  }

  function loginPath() {
    const returnUrl = encodeURIComponent(window.location.href);
    if (window.location.pathname.includes("/pages/auth/")) {
      return `login.html?return=${returnUrl}`;
    }
    if (window.location.pathname.includes("/pages/")) {
      return `../auth/login.html?return=${returnUrl}`;
    }
    return `pages/auth/login.html?return=${returnUrl}`;
  }

  function registerPath() {
    const returnUrl = encodeURIComponent(window.location.href);
    if (window.location.pathname.includes("/pages/auth/")) {
      return `register.html?return=${returnUrl}`;
    }
    if (window.location.pathname.includes("/pages/")) {
      return `../auth/register.html?return=${returnUrl}`;
    }
    return `pages/auth/register.html?return=${returnUrl}`;
  }

  function isLoggedIn() {
    return window.SpotnFixAPI && SpotnFixAPI.getToken();
  }

  function isAdmin() {
    return SpotnFixAPI.getUser()?.role === "admin";
  }

  function canSubmitReports() {
    return isLoggedIn() && !isAdmin();
  }

  function applyReportSubmitVisibility() {
    const admin = isAdmin();
    document.body.classList.toggle("spotnfix-user-admin", admin);
    document.body.classList.toggle("spotnfix-can-submit-reports", canSubmitReports());

    const submitSelectors = [
      "#open-report-modal",
      "#open-home-report-modal",
      "#submit-new-report",
      "#submit-home-new-report",
    ];

    submitSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((button) => {
        if (admin) button.setAttribute("hidden", "");
        else button.removeAttribute("hidden");
      });
    });

    document.querySelectorAll('a[href*="reports.html"]').forEach((link) => {
      const isTrackLink =
        link.dataset.navScreen === "track" || link.getAttribute("href")?.includes("#track");
      if (isTrackLink) return;
      link.classList.toggle("spotnfix-hide-for-admin", admin);
    });

    document.querySelectorAll('[data-nav-screen="report"]').forEach((link) => {
      link.classList.toggle("spotnfix-hide-for-admin", admin);
    });

    document.querySelectorAll("[data-nav-track]").forEach((link) => {
      link.classList.toggle("spotnfix-hide-for-user", !admin);
    });
  }

  function requireAuth(options = {}) {
    if (isLoggedIn()) return true;

    const message =
      options.message ||
      "You need to log in or create an account before submitting a report.";

    if (options.redirect !== false) {
      saveReturnUrl(options.returnUrl || window.location.href);
      const goLogin = window.confirm(`${message}\n\nPress OK to go to Login, or Cancel to create an account.`);
      window.location.href = goLogin ? loginPath() : registerPath();
      return false;
    }

    window.alert(message);
    return false;
  }

  function redirectAfterLogin() {
    const target = getReturnUrl();
    clearReturnUrl();
    if (target) {
      if (SpotnFixAPI.getUser()?.role === "admin" && target.includes("reports.html") && !target.includes("#")) {
        window.location.href = target.replace(/#.*$/, "") + "#track";
        return;
      }
      window.location.href = target;
      return;
    }
    if (window.location.pathname.includes("/pages/auth/")) {
      window.location.href = "../system/reports.html#track";
      return;
    }
    window.location.href = "pages/system/reports.html#track";
  }

  function logout() {
    if (window.SpotnFixAPI) SpotnFixAPI.clearSession();
    window.location.href = window.location.pathname.includes("/pages/") ? "../../index.html" : "index.html";
  }

  window.SpotnFixAuth = {
    getReturnUrl,
    saveReturnUrl,
    clearReturnUrl,
    loginPath,
    registerPath,
    isLoggedIn,
    isAdmin,
    canSubmitReports,
    applyReportSubmitVisibility,
    requireAuth,
    redirectAfterLogin,
    logout,
  };
})();
