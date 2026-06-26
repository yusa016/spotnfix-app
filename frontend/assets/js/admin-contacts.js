(function () {
  const publicView = document.querySelector("#contact-public-view");
  const publicDeco = document.querySelector("#contact-public-deco");
  const bgPattern = document.querySelector(".contact-bg-pattern");
  const contactPage = document.querySelector(".contact-page");
  const inboxView = document.querySelector("#contact-inbox-view");
  const contactsList = document.querySelector("#contacts-list");
  const contactsDetail = document.querySelector("#contacts-detail");

  if (!contactsList || !inboxView) return;

  let messages = [];
  let selectedId = null;

  function isAdmin() {
    return SpotnFixAPI.getUser()?.role === "admin";
  }

  function formatDate(value) {
    return new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function applyContactPageMode() {
    const admin = isAdmin();
    if (publicView) publicView.hidden = admin;
    if (publicDeco) publicDeco.hidden = admin;
    if (bgPattern) bgPattern.hidden = admin;
    if (contactPage) contactPage.classList.toggle("contact-page--inbox", admin);
    inboxView.hidden = !admin;

    if (admin) {
      document.title = "Contact Inbox | Cardinal's SpotN'Fix";
      loadInbox().catch((error) => {
        contactsList.innerHTML = `<p class="create-report-error">${error.message}</p>`;
      });
    } else {
      document.title = "Contact | Cardinal's SpotN'Fix";
    }
  }

  function renderList() {
    if (!messages.length) {
      contactsList.innerHTML = `<p class="reports-empty">No contact messages yet. Messages from the Contact us page will appear here.</p>`;
      return;
    }

    contactsList.innerHTML = messages
      .map(
        (msg) => `
      <article class="contact-inbox-row${msg.contactId === selectedId ? " row-selected" : ""}" data-contact-id="${msg.contactId}">
        <div class="row-main">
          <span class="status-dot ${msg.status === "New" ? "status-red" : msg.status === "Read" ? "status-yellow" : "status-green"}"></span>
          <span>${msg.firstName} ${msg.lastName}</span>
          <span>${msg.subject}</span>
          <span>${formatDate(msg.submittedAt)}</span>
        </div>
        <div class="row-sub">
          <span>${msg.email}</span>
          <span>${msg.status}</span>
        </div>
      </article>`
      )
      .join("");
  }

  function renderDetail() {
    const msg = messages.find((m) => m.contactId === selectedId);
    if (!msg || !contactsDetail) {
      if (contactsDetail) contactsDetail.innerHTML = `<p class="reports-empty">Select a message to read it.</p>`;
      return;
    }

    contactsDetail.innerHTML = `
      <h3>Contact Message #${msg.contactId}</h3>
      <section class="admin-info-box">
        <p><strong>From:</strong> ${msg.firstName} ${msg.lastName}</p>
        <p><strong>Email:</strong> ${msg.email}</p>
        <p><strong>Subject:</strong> ${msg.subject}</p>
        <p><strong>Sent:</strong> ${formatDate(msg.submittedAt)}</p>
        <p><strong>Message:</strong></p>
        <p>${msg.message}</p>
      </section>
      <label class="detail-label" for="contact-status-${msg.contactId}">Status</label>
      <select class="detail-status" id="contact-status-${msg.contactId}" data-contact-status>
        <option value="New" ${msg.status === "New" ? "selected" : ""}>New</option>
        <option value="Read" ${msg.status === "Read" ? "selected" : ""}>Read</option>
        <option value="Archived" ${msg.status === "Archived" ? "selected" : ""}>Archived</option>
      </select>
      <button type="button" class="contact-delete-btn" data-delete-contact="${msg.contactId}">Delete message</button>
    `;

    contactsDetail.querySelector("[data-contact-status]")?.addEventListener("change", async (event) => {
      try {
        const updated = await SpotnFixAPI.updateContactStatus(msg.contactId, event.target.value);
        Object.assign(msg, updated);
        renderList();
        renderDetail();
      } catch (error) {
        window.alert(error.message || "Failed to update status.");
      }
    });

    contactsDetail.querySelector("[data-delete-contact]")?.addEventListener("click", async () => {
      if (!window.confirm("Delete this contact message?")) return;
      try {
        await SpotnFixAPI.deleteContactMessage(msg.contactId);
        selectedId = null;
        await loadInbox();
      } catch (error) {
        window.alert(error.message || "Failed to delete message.");
      }
    });

    if (msg.status === "New") {
      SpotnFixAPI.updateContactStatus(msg.contactId, "Read")
        .then((updated) => {
          Object.assign(msg, updated);
          renderList();
        })
        .catch(() => {});
    }
  }

  async function loadInbox() {
    if (!isAdmin()) {
      throw new Error("Only administrators can view contact messages.");
    }
    contactsList.innerHTML = `<p class="reports-loading">Loading contact messages...</p>`;
    messages = await SpotnFixAPI.getContactMessages();
    renderList();
    renderDetail();
  }

  contactsList.addEventListener("click", (event) => {
    const row = event.target.closest(".contact-inbox-row");
    if (!row) return;
    selectedId = Number(row.dataset.contactId);
    renderList();
    renderDetail();
  });

  window.SpotnFixAdminContacts = { loadInbox, applyContactPageMode };
})();
