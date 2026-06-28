(function () {
  const userIconLink = document.querySelector(".user-icon");
  let deleteAccountUser = null;
  let deleteModalScrollY = 0;

  function profilePath() {
    if (window.location.pathname.includes("/pages/system/")) return "profile.html";
    if (window.location.pathname.includes("/pages/auth/")) return "../system/profile.html";
    if (window.location.pathname.includes("/pages/")) return "../system/profile.html";
    return "pages/system/profile.html";
  }

  function loginPath() {
    if (window.location.pathname.includes("/pages/auth/")) return "login.html";
    if (window.location.pathname.includes("/pages/")) return "../auth/login.html";
    return "pages/auth/login.html";
  }

  function idConfirmLabel(role) {
    return role === "student"
      ? "Enter your Student Number to confirm"
      : "Enter your ID Number to confirm";
  }

  function idMismatchMessage(role) {
    return role === "student"
      ? "Student number does not match your account."
      : "ID number does not match your account.";
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
      <a href="${profilePath()}" role="menuitem">Profile Information</a>
      <button type="button" role="menuitem" id="spotnfix-menu-logout">Log-out</button>
      <button type="button" role="menuitem" class="user-menu-danger" id="spotnfix-menu-delete">Delete Account</button>
    `;

    menu.querySelector("#spotnfix-menu-logout")?.addEventListener("click", () => {
      SpotnFixAuth.logout();
    });

    menu.querySelector("#spotnfix-menu-delete")?.addEventListener("click", () => {
      openDeleteAccountModal();
    });
  }

  function closeDeleteAccountModal() {
    const backdrop = document.querySelector("#delete-account-backdrop");
    if (!backdrop) return;
    backdrop.hidden = true;
    document.body.classList.remove("modal-open");
    document.body.style.top = "";
    document.body.style.width = "";
    window.scrollTo(0, deleteModalScrollY);
  }

  function getDeleteBackdrop() {
    return document.querySelector("#delete-account-backdrop");
  }

  function validateDeleteAccountInput() {
    const backdrop = getDeleteBackdrop();
    if (!backdrop || backdrop.hidden) return;

    const user = deleteAccountUser;
    const idInput = backdrop.querySelector("#delete-account-id");
    const errorEl = backdrop.querySelector("#delete-account-error");
    const confirmBtn = backdrop.querySelector("#confirm-delete-account");
    if (!idInput || !confirmBtn) return;

    const entered = SpotnFixAPI.normalizeIdNumber(idInput.value);
    const expected = SpotnFixAPI.resolveAccountIdNumber(user);
    const matches = entered.length > 0 && entered === expected;

    confirmBtn.disabled = !matches;
    if (errorEl) {
      errorEl.textContent = entered && !matches ? idMismatchMessage(user?.role) : "";
    }
  }

  async function submitDeleteAccount() {
    const backdrop = getDeleteBackdrop();
    if (!backdrop || backdrop.hidden) return;

    const user = deleteAccountUser;
    const idInput = backdrop.querySelector("#delete-account-id");
    const errorEl = backdrop.querySelector("#delete-account-error");
    const confirmBtn = backdrop.querySelector("#confirm-delete-account");
    if (!idInput || !confirmBtn) return;

    const entered = SpotnFixAPI.normalizeIdNumber(idInput.value);
    const expected = SpotnFixAPI.resolveAccountIdNumber(user);

    if (entered !== expected) {
      if (errorEl) errorEl.textContent = idMismatchMessage(user?.role);
      confirmBtn.disabled = true;
      return;
    }

    confirmBtn.disabled = true;
    if (errorEl) errorEl.textContent = "Deleting account...";

    try {
      await SpotnFixAPI.deleteAccount(entered);
      SpotnFixAPI.clearSession();
      window.location.href = loginPath();
    } catch (error) {
      if (errorEl) errorEl.textContent = error.message || "Failed to delete account.";
      confirmBtn.disabled = false;
    }
  }

  function ensureDeleteAccountModal() {
    let backdrop = getDeleteBackdrop();
    if (backdrop) return backdrop;

    backdrop = document.createElement("div");
    backdrop.id = "delete-account-backdrop";
    backdrop.className = "delete-account-backdrop";
    backdrop.hidden = true;
    backdrop.innerHTML = `
      <section class="delete-account-modal" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
        <button type="button" class="modal-close" id="close-delete-account" aria-label="Close">&times;</button>
        <h2 id="delete-account-title">Delete Account</h2>
        <p class="delete-account-warning">
          This action is permanent. Your account and submitted reports will be removed and cannot be recovered.
        </p>
        <label class="delete-account-label" for="delete-account-id" id="delete-account-label">Enter your ID Number to confirm</label>
        <input class="modal-text-input" id="delete-account-id" type="text" inputmode="numeric" autocomplete="off" />
        <p class="create-report-error" id="delete-account-error" aria-live="polite"></p>
        <div class="delete-account-actions">
          <button type="button" class="delete-account-cancel" id="cancel-delete-account">Cancel</button>
          <button type="button" class="delete-account-submit" id="confirm-delete-account" disabled>Delete Account</button>
        </div>
      </section>
    `;
    document.body.appendChild(backdrop);

    backdrop.addEventListener("click", (event) => {
      const target = event.target;
      if (target === backdrop) {
        closeDeleteAccountModal();
        return;
      }
      if (target.id === "close-delete-account" || target.id === "cancel-delete-account") {
        closeDeleteAccountModal();
        return;
      }
      if (target.id === "confirm-delete-account" && !target.disabled) {
        submitDeleteAccount();
      }
    });

    backdrop.addEventListener("input", (event) => {
      if (event.target.id === "delete-account-id") {
        validateDeleteAccountInput();
      }
    });

    return backdrop;
  }

  async function openDeleteAccountModal() {
    let user = SpotnFixAPI.getUser();
    try {
      user = await SpotnFixAPI.fetchCurrentUser();
    } catch (_error) {
      // Keep cached session user if refresh fails.
    }

    if (!user) return;

    deleteAccountUser = user;
    const backdrop = ensureDeleteAccountModal();
    const idInput = backdrop.querySelector("#delete-account-id");
    const errorEl = backdrop.querySelector("#delete-account-error");
    const confirmBtn = backdrop.querySelector("#confirm-delete-account");
    const labelEl = backdrop.querySelector("#delete-account-label");

    if (labelEl) labelEl.textContent = idConfirmLabel(user.role);
    if (idInput) idInput.value = "";
    if (errorEl) errorEl.textContent = "";
    if (confirmBtn) confirmBtn.disabled = true;

    deleteModalScrollY = window.scrollY || 0;
    document.body.classList.add("modal-open");
    document.body.style.top = `-${deleteModalScrollY}px`;
    document.body.style.width = "100%";
    backdrop.hidden = false;
    closeMenu(document.querySelector("#spotnfix-user-menu"), userIconLink);
    idInput?.focus();
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
      closeDeleteAccountModal();
    }
  });

  document.addEventListener("DOMContentLoaded", updateUserMenu);

  window.SpotnFixUserMenu = { updateUserMenu };
})();
