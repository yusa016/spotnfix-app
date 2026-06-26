(function () {
  const userIconLink = document.querySelector(".user-icon");

  function profilePath() {
    if (window.location.pathname.includes("/pages/system/")) return "profile.html";
    if (window.location.pathname.includes("/pages/auth/")) return "../system/profile.html";
    if (window.location.pathname.includes("/pages/")) return "../system/profile.html";
    return "pages/system/profile.html";
  }

  function resetPasswordPath() {
    if (window.location.pathname.includes("/pages/auth/")) return "reset-password.html";
    if (window.location.pathname.includes("/pages/")) return "../auth/reset-password.html";
    return "pages/auth/reset-password.html";
  }

  function loginPath() {
    if (window.location.pathname.includes("/pages/auth/")) return "login.html";
    if (window.location.pathname.includes("/pages/")) return "../auth/login.html";
    return "pages/auth/login.html";
  }

  function closeMenu(menu, trigger) {
    if (!menu) return;
    menu.hidden = true;
    trigger?.setAttribute("aria-expanded", "false");
  }

  function ensureMenuStructure() {
    if (!userIconLink || userIconLink.closest(".user-menu")) return userIconLink?.closest(".user-menu");

    const wrapper = document.createElement("div");
    wrapper.className = "user-menu";
    userIconLink.parentNode.insertBefore(wrapper, userIconLink);
    wrapper.appendChild(userIconLink);

    const menu = document.createElement("div");
    menu.className = "user-menu-dropdown";
    menu.id = "spotnfix-user-menu";
    menu.hidden = true;
    menu.setAttribute("role", "menu");
    wrapper.appendChild(menu);

    userIconLink.setAttribute("aria-haspopup", "menu");
    userIconLink.setAttribute("aria-expanded", "false");
    userIconLink.setAttribute("aria-controls", "spotnfix-user-menu");

    return wrapper;
  }

  function buildLoggedInMenu(menu) {
    const user = SpotnFixAPI.getUser();
    if (!user) return;

    menu.innerHTML = `
      <div class="user-menu-header">
        <strong>${user.firstName} ${user.lastName}</strong>
        <span>${user.email}</span>
      </div>
      <a href="${profilePath()}" role="menuitem">View Profile Information</a>
      <a href="${profilePath()}#account-settings" role="menuitem">Profile Settings</a>
      <a href="${resetPasswordPath()}?email=${encodeURIComponent(user.email)}" role="menuitem">Change Password</a>
      <button type="button" role="menuitem" id="spotnfix-menu-logout">Logout</button>
      <button type="button" role="menuitem" class="user-menu-danger" id="spotnfix-menu-delete">Delete Account</button>
    `;

    menu.querySelector("#spotnfix-menu-logout")?.addEventListener("click", () => {
      SpotnFixAuth.logout();
    });

    menu.querySelector("#spotnfix-menu-delete")?.addEventListener("click", () => {
      openDeleteAccountModal(user);
    });
  }

  function openDeleteAccountModal(user) {
    let backdrop = document.querySelector("#delete-account-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "delete-account-backdrop";
      backdrop.className = "delete-account-backdrop";
      backdrop.hidden = true;
      backdrop.innerHTML = `
        <section class="delete-account-modal" role="dialog" aria-modal="true" aria-labelledby="delete-account-title" tabindex="-1">
          <button type="button" class="modal-close" id="close-delete-account" aria-label="Close">&times;</button>
          <h2 id="delete-account-title">Delete Account</h2>
          <p class="delete-account-warning">
            This action is permanent. Your account and submitted reports will be removed and cannot be recovered.
          </p>
          <label class="delete-account-label" for="delete-account-id">Enter your Student Number to confirm</label>
          <input class="modal-text-input" id="delete-account-id" type="text" inputmode="numeric" autocomplete="off" />
          <p class="create-report-error" id="delete-account-error" aria-live="polite"></p>
          <div class="delete-account-actions">
            <button type="button" class="delete-account-cancel" id="cancel-delete-account">Cancel</button>
            <button type="button" class="delete-account-submit" id="confirm-delete-account" disabled>Delete Account</button>
          </div>
        </section>
      `;
      document.body.appendChild(backdrop);

      backdrop.querySelector("#close-delete-account")?.addEventListener("click", () => {
        backdrop.hidden = true;
      });
      backdrop.querySelector("#cancel-delete-account")?.addEventListener("click", () => {
        backdrop.hidden = true;
      });
      backdrop.addEventListener("click", (event) => {
        if (event.target === backdrop) backdrop.hidden = true;
      });
    }

    const idInput = backdrop.querySelector("#delete-account-id");
    const errorEl = backdrop.querySelector("#delete-account-error");
    const confirmBtn = backdrop.querySelector("#confirm-delete-account");

    if (idInput) idInput.value = "";
    if (errorEl) errorEl.textContent = "";
    if (confirmBtn) confirmBtn.disabled = true;

    const validate = () => {
      const entered = Number(String(idInput?.value || "").trim());
      const matches = entered > 0 && entered === Number(user.idNumber);
      if (confirmBtn) confirmBtn.disabled = !matches;
      if (errorEl && idInput?.value && !matches) {
        errorEl.textContent = "Student number does not match your account.";
      } else if (errorEl) {
        errorEl.textContent = "";
      }
    };

    idInput?.removeEventListener("input", idInput._spotnfixValidate);
    idInput._spotnfixValidate = validate;
    idInput?.addEventListener("input", validate);

    confirmBtn?.replaceWith(confirmBtn.cloneNode(true));
    const freshConfirm = backdrop.querySelector("#confirm-delete-account");
    freshConfirm?.addEventListener("click", async () => {
      const idNumber = Number(String(idInput?.value || "").trim());
      if (idNumber !== Number(user.idNumber)) {
        if (errorEl) errorEl.textContent = "Student number does not match your account.";
        return;
      }

      freshConfirm.disabled = true;
      if (errorEl) errorEl.textContent = "Deleting account...";

      try {
        await SpotnFixAPI.deleteAccount(idNumber);
        SpotnFixAPI.clearSession();
        window.location.href = loginPath();
      } catch (error) {
        if (errorEl) errorEl.textContent = error.message || "Failed to delete account.";
        freshConfirm.disabled = false;
      }
    });

    backdrop.hidden = false;
    backdrop.querySelector(".delete-account-modal")?.focus();
    closeMenu(document.querySelector("#spotnfix-user-menu"), userIconLink);
  }

  function updateUserMenu() {
    if (!userIconLink || !window.SpotnFixAPI) return;

    ensureMenuStructure();
    const menu = document.querySelector("#spotnfix-user-menu");
    const user = SpotnFixAPI.getUser();
    const isAuthPage = window.location.pathname.includes("/pages/auth/");

    document.querySelector("#spotnfix-logout-btn")?.remove();

    if (user) {
      userIconLink.setAttribute("aria-label", `Account menu for ${user.firstName}`);
      userIconLink.title = `${user.firstName} ${user.lastName} (${user.role})`;
      userIconLink.href = "#";
      buildLoggedInMenu(menu);

      if (!userIconLink._spotnfixMenuBound) {
        userIconLink._spotnfixMenuBound = true;
        userIconLink.addEventListener("click", (event) => {
          event.preventDefault();
          if (!menu) return;
          const willOpen = menu.hidden;
          menu.hidden = !willOpen;
          userIconLink.setAttribute("aria-expanded", willOpen ? "true" : "false");
        });
      }
    } else {
      userIconLink.setAttribute("aria-label", "Login");
      userIconLink.removeAttribute("title");
      userIconLink.href = userIconLink.getAttribute("data-default-href") || loginPath();
      userIconLink.setAttribute("aria-expanded", "false");
      if (menu) {
        menu.hidden = true;
        menu.innerHTML = "";
      }
      if (isAuthPage) {
        userIconLink.href = loginPath();
      }
    }
  }

  if (userIconLink && !userIconLink.getAttribute("data-default-href")) {
    userIconLink.setAttribute("data-default-href", userIconLink.getAttribute("href") || "");
  }

  document.addEventListener("click", (event) => {
    const menu = document.querySelector("#spotnfix-user-menu");
    if (!menu || menu.hidden) return;
    if (!event.target.closest(".user-menu")) {
      closeMenu(menu, userIconLink);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu(document.querySelector("#spotnfix-user-menu"), userIconLink);
      const backdrop = document.querySelector("#delete-account-backdrop");
      if (backdrop && !backdrop.hidden) backdrop.hidden = true;
    }
  });

  document.addEventListener("DOMContentLoaded", updateUserMenu);

  window.SpotnFixUserMenu = { updateUserMenu };
})();
