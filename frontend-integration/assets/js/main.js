/**
 * Drop-in replacement for assets/js/main.js
 * Copy into your frontend repo after adding config.js and api.js.
 */
const reportsPage = document.querySelector(".reports-page");

if (reportsPage) {
  const DESKTOP_BREAKPOINT = 769;
  const navLinks = document.querySelectorAll("[data-nav-screen]");
  const switchButtons = document.querySelectorAll("[data-switch-screen]");
  const reportList = document.querySelector("#reports-list");

  const searchInput = document.querySelector(".reports-search");
  const filterSelects = document.querySelectorAll(".reports-filters select");
  const clearButton = document.querySelector(".clear-btn");
  const floorButtons = document.querySelectorAll(".floor-btn");

  const modalBackdrop = document.querySelector("#report-modal-backdrop");
  const modalDialog = document.querySelector(".report-modal");
  const openModalButton = document.querySelector("#open-report-modal");
  const closeModalButton = document.querySelector("#close-report-modal");
  const submitNewReportButton = document.querySelector("#submit-new-report");
  const createFloor = document.querySelector("#create-floor");
  const createRoom = document.querySelector("#create-room");
  const createType = document.querySelector("#create-type");
  const createDescription = document.querySelector("#create-description");
  const createError = document.querySelector("#create-report-error");

  const detailPanel = document.querySelector("#report-detail-panel");
  const detailDesktop = document.querySelector("#admin-portal-desktop");
  const trackDetailBackdrop = document.querySelector("#track-detail-backdrop");
  const trackDetailModal = document.querySelector(".track-detail-modal");
  const detailMobile = document.querySelector("#admin-portal-mobile");
  const closeTrackDetailButton = document.querySelector("#close-track-detail");
  const DEFAULT_FLOOR = "8th Floor";

  const getFloorLabelFromButton = (button) => {
    if (!button) return DEFAULT_FLOOR;
    const firstTextNode = Array.from(button.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
    const label = (firstTextNode ? firstTextNode.textContent : button.textContent || "").trim();
    return label || DEFAULT_FLOOR;
  };

  floorButtons.forEach((button) => {
    button.dataset.floor = getFloorLabelFromButton(button);
  });

  let lockedScrollY = 0;
  let detailLockedScrollY = 0;
  let lastFocusedElement = null;
  let selectedReportId = null;
  const initialActiveFloorButton = Array.from(floorButtons).find((button) => button.classList.contains("floor-btn-active"));
  let selectedFloor = initialActiveFloorButton ? initialActiveFloorButton.dataset.floor : floorButtons[0] ? floorButtons[0].dataset.floor : DEFAULT_FLOOR;
  let reports = [];
  let analytics = { total: 0, open: 0, inProgress: 0, resolved: 0 };

  const isDesktop = () => window.innerWidth >= DESKTOP_BREAKPOINT;
  const getSelectedReport = () => reports.find((r) => r.id === selectedReportId) || null;
  const currentUser = () => (window.SpotnFixAPI ? SpotnFixAPI.getUser() : null);

  const buildAdminPortalHTML = (report) => {
    const historyHTML =
      report.history && report.history.length
        ? report.history
            .map(
              (item) => `
          <article class="history-item">
            <p><strong>Date:</strong> ${item.date || "N/A"}</p>
            <p><strong>Submitted by:</strong> ${item.submitter || report.submittedBy}</p>
            <p><strong>Content:</strong> ${item.content || report.description}</p>
            <p><strong>Date Resolved:</strong> ${item.resolved || "Pending"}</p>
          </article>
        `
            )
            .join("")
        : `<p class="note-empty">No history yet.</p>`;

    const notesHTML =
      report.notes && report.notes.length > 0
        ? report.notes
            .map(
              (note) => `
          <div class="note-card">
            <p class="note-meta">${note.author} · ${note.time}</p>
            <p class="note-text">${note.text}</p>
          </div>
        `
            )
            .join("")
        : `<p class="note-empty">No notes yet.</p>`;

    const isAdmin = currentUser() && currentUser().role === "admin";

    return `
      <h3 class="admin-portal-title" id="track-detail-title">ADMIN PORTAL</h3>
      <section class="admin-info-box">
        <h4>Information</h4>
        <p><strong>Submitted by:</strong> <span data-field="submittedBy">${report.submittedBy}</span></p>
        <p><strong>Student No.:</strong> <span data-field="studentNo">${report.studentNo}</span></p>
        <p><strong>Room:</strong> ${report.room} · <strong>Type:</strong> ${report.type}</p>
        <p><strong>Reported:</strong> ${report.date} at ${report.time}</p>
        <p><strong>Issue:</strong> ${report.description}</p>
      </section>
      <section class="admin-history">
        <h4>History</h4>
        ${historyHTML}
      </section>
      ${
        isAdmin
          ? `
      <label class="detail-label" for="detail-status-${report.id}">Status</label>
      <select class="detail-status" id="detail-status-${report.id}" data-detail-status>
        <option value="open" ${report.status.toLowerCase() === "open" ? "selected" : ""}>Open</option>
        <option value="in progress" ${report.status.toLowerCase() === "in progress" ? "selected" : ""}>In Progress</option>
        <option value="resolved" ${report.status.toLowerCase() === "resolved" ? "selected" : ""}>Resolved</option>
      </select>`
          : `<p><strong>Status:</strong> ${report.status}</p>`
      }
      <section class="admin-notes">
        <div class="notes-header"><h4>Notes</h4></div>
        <div class="notes-list">${notesHTML}</div>
      </section>
    `;
  };

  const bindAdminPortalEvents = (container) => {
    if (!container) return;
    const statusSelect = container.querySelector("[data-detail-status]");
    if (!statusSelect) return;

    statusSelect.addEventListener("change", async () => {
      const report = getSelectedReport();
      if (!report) return;

      const nextStatus = statusSelect.value;
      try {
        if (nextStatus === "resolved") {
          await SpotnFixAPI.deleteReport(report.reportId || report.id.replace(/^r/, ""));
          selectedReportId = null;
          await refreshReports();
          hideDetailViews();
          window.alert("Resolved report removed from the list.");
          return;
        }

        const updated = await SpotnFixAPI.updateReportStatus(report.reportId || report.id.replace(/^r/, ""), nextStatus);
        Object.assign(report, updated);
        renderReports();
        renderAnalytics();
        populateDetailView(report);
      } catch (error) {
        window.alert(error.message || "Failed to update status.");
      }
    });
  };

  const populateDetailView = (report) => {
    if (!report) return;
    const html = buildAdminPortalHTML(report);
    if (detailDesktop) {
      detailDesktop.innerHTML = html;
      bindAdminPortalEvents(detailDesktop);
    }
    if (detailMobile) {
      detailMobile.innerHTML = html;
      bindAdminPortalEvents(detailMobile);
    }
  };

  const hideDetailViews = () => {
    if (detailPanel) {
      detailPanel.hidden = true;
      detailPanel.setAttribute("aria-hidden", "true");
    }
    if (trackDetailBackdrop) trackDetailBackdrop.hidden = true;
    if (!modalBackdrop || modalBackdrop.hidden) {
      document.body.classList.remove("modal-open");
      document.body.style.top = "";
      document.body.style.width = "";
    }
  };

  const openTrackDetailMobile = () => {
    if (!trackDetailBackdrop) return;
    detailLockedScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.classList.add("modal-open");
    document.body.style.top = `-${detailLockedScrollY}px`;
    document.body.style.width = "100%";
    trackDetailBackdrop.hidden = false;
    if (trackDetailModal) trackDetailModal.focus();
  };

  const closeTrackDetailMobile = () => {
    if (!trackDetailBackdrop) return;
    trackDetailBackdrop.hidden = true;
    if (!modalBackdrop || modalBackdrop.hidden) {
      document.body.classList.remove("modal-open");
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, detailLockedScrollY);
    }
  };

  const showDetailForSelection = () => {
    const report = getSelectedReport();
    if (!report || reportsPage.dataset.screen !== "track") {
      hideDetailViews();
      return;
    }
    populateDetailView(report);
    if (isDesktop()) {
      if (detailPanel) {
        detailPanel.hidden = false;
        detailPanel.setAttribute("aria-hidden", "false");
      }
      closeTrackDetailMobile();
    } else {
      if (detailPanel) {
        detailPanel.hidden = true;
        detailPanel.setAttribute("aria-hidden", "true");
      }
      openTrackDetailMobile();
    }
  };

  const analyticsView = document.querySelector("#reports-analytics-view");

  const setActiveScreen = (screen) => {
    const normalized = screen === "track" || screen === "analytics" ? screen : "report";
    reportsPage.dataset.screen = normalized;
    const navScreen = normalized === "report" ? "report" : "track";
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.dataset.navScreen === navScreen);
    });
    switchButtons.forEach((button) => {
      const isActive =
        normalized === "analytics"
          ? button.dataset.switchScreen === "analytics"
          : button.dataset.switchScreen === "track";
      button.classList.toggle("reports-tab-active", isActive);
    });
    if (analyticsView) analyticsView.hidden = normalized !== "analytics";
    if (normalized === "report") hideDetailViews();
    else if (normalized === "analytics") {
      hideDetailViews();
      selectedReportId = null;
      renderReports();
      renderAnalytics();
    } else if (selectedReportId) showDetailForSelection();
    else hideDetailViews();
  };

  const getFilters = () => ({
    search: searchInput ? searchInput.value.trim().toLowerCase() : "",
    date: filterSelects[0] ? filterSelects[0].value.toLowerCase() : "",
    type: filterSelects[1] ? filterSelects[1].value.toLowerCase() : "",
    room: filterSelects[2] ? filterSelects[2].value.toLowerCase() : "",
    status: filterSelects[3] ? filterSelects[3].value.toLowerCase() : "",
  });

  const matchesFilter = (report, filters) => {
    const joined = `${report.room} ${report.type} ${report.date} ${report.description} ${report.time} ${report.status}`.toLowerCase();
    if (filters.search && !joined.includes(filters.search)) return false;
    if (filters.date && filters.date !== "date" && report.date.toLowerCase() !== filters.date) return false;
    if (filters.type && filters.type !== "type" && !report.type.toLowerCase().includes(filters.type)) return false;
    if (filters.room && filters.room !== "room" && report.room.toLowerCase() !== filters.room) return false;
    if (filters.status && filters.status !== "status" && report.status.toLowerCase() !== filters.status) return false;
    return true;
  };

  const renderReports = () => {
    if (!reportList) return;
    const filters = getFilters();
    const visibleReports = reports
      .filter((report) => report.floor === selectedFloor)
      .filter((report) => matchesFilter(report, filters));

    reportList.innerHTML = visibleReports
      .map((report) => {
        const isSelected = report.id === selectedReportId ? " row-selected" : "";
        const statusClass = report.status.toLowerCase() === "in progress" ? "status-yellow" : "status-red";
        return `
          <article class="report-row${isSelected}" data-report-id="${report.id}">
            <div class="row-main">
              <span class="status-dot ${statusClass}"></span>
              <span>${report.room}</span>
              <span>${report.type}</span>
              <span>${report.date}</span>
            </div>
            <div class="row-sub">
              <span>${report.description}</span>
              <span>${report.time}</span>
            </div>
          </article>
        `;
      })
      .join("");
  };

  const renderAnalytics = () => {
    const totalEl = document.querySelector("#analytics-total");
    const openEl = document.querySelector("#analytics-open");
    const progressEl = document.querySelector("#analytics-progress");
    const resolvedEl = document.querySelector("#analytics-resolved");
    if (!totalEl) return;
    totalEl.textContent = String(analytics.total);
    if (openEl) openEl.textContent = String(analytics.open);
    if (progressEl) progressEl.textContent = String(analytics.inProgress);
    if (resolvedEl) resolvedEl.textContent = String(analytics.resolved);
  };

  async function refreshReports() {
    reports = await SpotnFixAPI.getReports();
    analytics = await SpotnFixAPI.getAnalytics();
    renderReports();
    renderAnalytics();
  }

  const clearCreateForm = () => {
    if (createFloor) createFloor.value = "";
    if (createRoom) createRoom.value = "";
    if (createType) createType.value = "";
    if (createDescription) createDescription.value = "";
    if (createError) createError.textContent = "";
  };

  const openCreateModal = () => {
    if (!modalBackdrop) return;
    if (!SpotnFixAPI.getToken()) {
      window.location.href = "../auth/login.html";
      return;
    }
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockedScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.classList.add("modal-open");
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.width = "100%";
    modalBackdrop.hidden = false;
    if (modalDialog) modalDialog.focus();
  };

  const closeCreateModal = () => {
    if (!modalBackdrop) return;
    modalBackdrop.hidden = true;
    if (!trackDetailBackdrop || trackDetailBackdrop.hidden) {
      document.body.classList.remove("modal-open");
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, lockedScrollY);
    }
    if (lastFocusedElement) lastFocusedElement.focus();
  };

  const createReport = async () => {
    const floor = createFloor ? createFloor.value.trim() : "";
    const room = createRoom ? createRoom.value.trim() : "";
    const type = createType ? createType.value.trim() : "";
    const description = createDescription ? createDescription.value.trim() : "";

    if (!floor || !room || !type || !description) {
      if (createError) createError.textContent = "Please fill in Floor, Room, Type, and Description.";
      return;
    }

    if (!SpotnFixAPI.getToken()) {
      window.location.href = "../auth/login.html";
      return;
    }

    try {
      await SpotnFixAPI.createReport({ floor, room, type, description, issueType: type });
      selectedReportId = null;
      hideDetailViews();
      await refreshReports();
      clearCreateForm();
      closeCreateModal();
      setActiveScreen("report");
      history.replaceState(null, "", `${window.location.pathname}`);
    } catch (error) {
      if (createError) createError.textContent = error.message || "Failed to submit report.";
    }
  };

  const selectReport = (reportId) => {
    selectedReportId = reportId;
    renderReports();
    setActiveScreen("track");
    showDetailForSelection();
    history.replaceState(null, "", `${window.location.pathname}#track`);
  };

  const ensureCreateModalClosed = () => {
    if (!modalBackdrop) return;
    modalBackdrop.hidden = true;
  };
  ensureCreateModalClosed();
  hideDetailViews();

  refreshReports().catch((error) => {
    if (reportList) {
      reportList.innerHTML = `<p class="create-report-error">Could not load reports. Is the backend running? (${error.message})</p>`;
    }
  });

  const updateScreenFromHash = () => {
    if (window.location.hash === "#analytics") return setActiveScreen("analytics");
    if (window.location.hash === "#track") return setActiveScreen("track");
    setActiveScreen("report");
  };

  updateScreenFromHash();
  window.addEventListener("hashchange", updateScreenFromHash);
  window.addEventListener("resize", () => {
    if (selectedReportId && reportsPage.dataset.screen === "track") showDetailForSelection();
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const screen = link.dataset.navScreen || "report";
      if (screen === "report") selectedReportId = null;
      setActiveScreen(screen);
      history.replaceState(null, "", `${window.location.pathname}${screen === "track" ? "#track" : ""}`);
      renderReports();
    });
  });

  switchButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.switchScreen || "track";
      setActiveScreen(target);
      const hash = target === "track" ? "#track" : target === "analytics" ? "#analytics" : "";
      history.replaceState(null, "", `${window.location.pathname}${hash}`);
    });
  });

  floorButtons.forEach((button) => {
    button.addEventListener("click", () => {
      floorButtons.forEach((item) => item.classList.remove("floor-btn-active"));
      button.classList.add("floor-btn-active");
      selectedFloor = button.dataset.floor || DEFAULT_FLOOR;
      selectedReportId = null;
      hideDetailViews();
      renderReports();
    });
  });

  if (reportList) {
    reportList.addEventListener("click", (event) => {
      const row = event.target.closest(".report-row");
      if (!row) return;
      selectReport(row.dataset.reportId || null);
    });
    reportList.addEventListener("scroll", () => reportList.classList.add("is-scrolling"));
  }

  if (searchInput) searchInput.addEventListener("input", renderReports);
  filterSelects.forEach((select) => select.addEventListener("change", renderReports));
  if (clearButton) {
    clearButton.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      filterSelects.forEach((select) => { select.selectedIndex = 0; });
      renderReports();
    });
  }
  if (openModalButton) openModalButton.addEventListener("click", () => { if (createError) createError.textContent = ""; openCreateModal(); });
  if (closeModalButton) closeModalButton.addEventListener("click", closeCreateModal);
  if (submitNewReportButton) submitNewReportButton.addEventListener("click", createReport);
  if (modalBackdrop) modalBackdrop.addEventListener("click", (event) => { if (event.target === modalBackdrop) closeCreateModal(); });
  if (closeTrackDetailButton) closeTrackDetailButton.addEventListener("click", closeTrackDetailMobile);
  if (trackDetailBackdrop) trackDetailBackdrop.addEventListener("click", (event) => { if (event.target === trackDetailBackdrop) closeTrackDetailMobile(); });
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (trackDetailBackdrop && trackDetailBackdrop.hidden === false) return closeTrackDetailMobile();
    if (modalBackdrop && modalBackdrop.hidden === false) closeCreateModal();
  });
}

const homeOpenModalButton = document.querySelector("#open-home-report-modal");
const homeModalBackdrop = document.querySelector("#home-report-modal-backdrop");
const homeModalDialog = document.querySelector("#home-report-modal-backdrop .report-modal");
const homeCloseModalButton = document.querySelector("#close-home-report-modal");
const homeSubmitButton = document.querySelector("#submit-home-new-report");
const homeCreateFloor = document.querySelector("#home-create-floor");
const homeCreateRoom = document.querySelector("#home-create-room");
const homeCreateType = document.querySelector("#home-create-type");
const homeCreateDescription = document.querySelector("#home-create-description");
const homeCreateError = document.querySelector("#home-create-report-error");

if (homeOpenModalButton && homeModalBackdrop) {
  let homeLockedScrollY = 0;
  let homeLastFocusedElement = null;

  const clearHomeCreateForm = () => {
    if (homeCreateFloor) homeCreateFloor.value = "";
    if (homeCreateRoom) homeCreateRoom.value = "";
    if (homeCreateType) homeCreateType.value = "";
    if (homeCreateDescription) homeCreateDescription.value = "";
    if (homeCreateError) homeCreateError.textContent = "";
  };

  const openHomeCreateModal = () => {
    homeLastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    homeLockedScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.classList.add("modal-open");
    document.body.style.top = `-${homeLockedScrollY}px`;
    document.body.style.width = "100%";
    homeModalBackdrop.hidden = false;
    if (homeModalDialog) homeModalDialog.focus();
  };

  const closeHomeCreateModal = () => {
    homeModalBackdrop.hidden = true;
    document.body.classList.remove("modal-open");
    document.body.style.top = "";
    document.body.style.width = "";
    window.scrollTo(0, homeLockedScrollY);
    if (homeLastFocusedElement) homeLastFocusedElement.focus();
  };

  const createHomeReport = async () => {
    const floor = homeCreateFloor ? homeCreateFloor.value.trim() : "";
    const room = homeCreateRoom ? homeCreateRoom.value.trim() : "";
    const type = homeCreateType ? homeCreateType.value.trim() : "";
    const description = homeCreateDescription ? homeCreateDescription.value.trim() : "";

    if (!floor || !room || !type || !description) {
      if (homeCreateError) homeCreateError.textContent = "Please fill in Floor, Room, Type, and Description.";
      return;
    }

    if (!window.SpotnFixAPI || !SpotnFixAPI.getToken()) {
      window.location.href = "pages/auth/login.html";
      return;
    }

    try {
      await SpotnFixAPI.createReport({ floor, room, type, description, issueType: type });
      clearHomeCreateForm();
      closeHomeCreateModal();
      window.location.href = "pages/system/reports.html#track";
    } catch (error) {
      if (homeCreateError) homeCreateError.textContent = error.message || "Failed to submit report.";
    }
  };

  homeOpenModalButton.addEventListener("click", () => { if (homeCreateError) homeCreateError.textContent = ""; openHomeCreateModal(); });
  if (homeCloseModalButton) homeCloseModalButton.addEventListener("click", closeHomeCreateModal);
  if (homeSubmitButton) homeSubmitButton.addEventListener("click", createHomeReport);
  homeModalBackdrop.addEventListener("click", (event) => { if (event.target === homeModalBackdrop) closeHomeCreateModal(); });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && homeModalBackdrop.hidden === false) closeHomeCreateModal();
  });
}
