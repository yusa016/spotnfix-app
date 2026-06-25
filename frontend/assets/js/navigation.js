const navToggle = document.querySelector(".nav-toggle");
const mainNav = document.querySelector("#primary-navigation");
const userIconLink = document.querySelector(".user-icon");

function updateUserNav() {
  if (!userIconLink || !window.SpotnFixAPI) return;

  const user = SpotnFixAPI.getUser();
  const isAuthPage = window.location.pathname.includes("/pages/auth/");

  if (user) {
    userIconLink.setAttribute("aria-label", `Logged in as ${user.firstName}`);
    userIconLink.title = `${user.firstName} ${user.lastName} (${user.role})`;
    userIconLink.href = isAuthPage ? "../system/reports.html#track" : userIconLink.getAttribute("data-default-href") || userIconLink.href;

    let logoutBtn = document.querySelector("#spotnfix-logout-btn");
    if (!logoutBtn && mainNav) {
      logoutBtn = document.createElement("button");
      logoutBtn.id = "spotnfix-logout-btn";
      logoutBtn.type = "button";
      logoutBtn.className = "spotnfix-logout-btn";
      logoutBtn.textContent = "Log out";
      logoutBtn.addEventListener("click", () => {
        if (window.SpotnFixAuth) SpotnFixAuth.logout();
      });
      mainNav.appendChild(logoutBtn);
    }
  } else if (mainNav) {
    const logoutBtn = document.querySelector("#spotnfix-logout-btn");
    if (logoutBtn) logoutBtn.remove();
  }
}

if (userIconLink && !userIconLink.getAttribute("data-default-href")) {
  userIconLink.setAttribute("data-default-href", userIconLink.getAttribute("href") || "");
}

if (navToggle && mainNav) {
  const closeMenu = () => {
    mainNav.classList.remove("menu-open");
    navToggle.setAttribute("aria-expanded", "false");
  };

  const openMenu = () => {
    mainNav.classList.add("menu-open");
    navToggle.setAttribute("aria-expanded", "true");
  };

  navToggle.addEventListener("click", () => {
    const isExpanded = navToggle.getAttribute("aria-expanded") === "true";
    if (isExpanded) {
      closeMenu();
      return;
    }
    openMenu();
  });

  navToggle.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
      navToggle.focus();
    }
  });

  mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      closeMenu();
    });
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 769) {
      closeMenu();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  updateUserNav();
  if (window.SpotnFixStatus) SpotnFixStatus.refreshStatus();
  if (window.SpotnFixAdminContacts) SpotnFixAdminContacts.showAdminTabIfNeeded();
  if (window.SpotnFixAuth?.applyReportSubmitVisibility) SpotnFixAuth.applyReportSubmitVisibility();
});
