(function () {
  function createBanner() {
    if (document.querySelector("#spotnfix-status-banner")) return;

    const banner = document.createElement("div");
    banner.id = "spotnfix-status-banner";
    banner.className = "spotnfix-status-banner spotnfix-status-loading";
    banner.innerHTML = `<span class="spotnfix-status-text">Checking system connection...</span>`;

    const header = document.querySelector(".site-header");
    if (header) {
      header.insertAdjacentElement("afterend", banner);
    } else {
      document.body.prepend(banner);
    }
  }

  function syncBannerLayout() {
    const banner = document.querySelector("#spotnfix-status-banner");
    if (!banner) return;
    document.body.classList.add("has-spotnfix-status");
    const height = banner.offsetHeight;
    document.documentElement.style.setProperty("--status-banner-height", `${height}px`);
  }

  function removeBanner() {
    const banner = document.querySelector("#spotnfix-status-banner");
    if (banner) banner.remove();
    document.body.classList.remove("has-spotnfix-status");
    document.documentElement.style.removeProperty("--status-banner-height");
  }

  function setBanner(type, message) {
    createBanner();
    const banner = document.querySelector("#spotnfix-status-banner");
    banner.className = `spotnfix-status-banner spotnfix-status-${type}`;
    banner.querySelector(".spotnfix-status-text").textContent = message;
    syncBannerLayout();
  }

  async function refreshStatus() {
    const user = window.SpotnFixAPI?.getUser?.();
    if (user?.role !== "admin") {
      removeBanner();
      return;
    }

    createBanner();

    if (!window.SpotnFixAPI) {
      setBanner("error", "API scripts not loaded. Check config.js and api.js.");
      return;
    }

    try {
      const health = await SpotnFixAPI.checkHealth();
      const userLabel = user ? `Logged in as ${user.firstName} ${user.lastName} (${user.role})` : "Not logged in";
      setBanner(
        "ok",
        `Database connected (${health.database.name}) · ${health.database.reports} reports · ${health.database.contacts ?? 0} contact messages · ${userLabel}`
      );
    } catch (error) {
      setBanner(
        "error",
        `Cannot reach backend or database. Start XAMPP MySQL, then run "npm run dev" in backend. (${error.message})`
      );
    }
  }

  document.addEventListener("DOMContentLoaded", refreshStatus);
  window.addEventListener("resize", syncBannerLayout);
  window.SpotnFixStatus = { refreshStatus };
})();
