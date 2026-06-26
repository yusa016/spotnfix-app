const reportsPage = document.querySelector(".reports-page");

function photoUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const base = window.SPOTNFIX_SERVER_BASE || "http://localhost:3000";
  return `${base}${path}`;
}

function statusDotClass(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "in progress") return "status-yellow";
  if (normalized === "resolved") return "status-green";
  return "status-red";
}

function applyAdminReportRestrictions() {
  if (window.SpotnFixAuth?.applyReportSubmitVisibility) {
    SpotnFixAuth.applyReportSubmitVisibility();
  }
}

async function submitReportForm(prefix, errorEl, onSuccess) {
  if (!SpotnFixAuth.requireAuth({ message: "Please log in or register before submitting a report." })) {
    return;
  }

  if (SpotnFixAuth.isAdmin?.()) {
    if (errorEl) errorEl.textContent = "Administrators cannot submit issue reports.";
    return;
  }

  const values = SpotnFixReportForm.getValues(prefix);
  const validationError = await SpotnFixReportForm.validate(values, prefix);
  if (validationError) {
    if (errorEl) errorEl.textContent = validationError;
    return;
  }

  if (errorEl) errorEl.textContent = "Submitting report...";

  try {
    await SpotnFixAPI.createReport(values);
    SpotnFixReportForm.clearForm(prefix);
    if (errorEl) errorEl.textContent = "";
    if (window.SpotnFixStatus) SpotnFixStatus.refreshStatus();
    onSuccess();
  } catch (error) {
    if (errorEl) errorEl.textContent = error.message || "Failed to submit report.";
  }
}

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
    if (button.dataset.floor) return button.dataset.floor;
    const firstTextNode = Array.from(button.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
    return (firstTextNode ? firstTextNode.textContent : button.textContent || "").trim() || DEFAULT_FLOOR;
  };

  floorButtons.forEach((button) => {
    button.dataset.floor = getFloorLabelFromButton(button);
  });

  let lockedScrollY = 0;
  let detailLockedScrollY = 0;
  let lastFocusedElement = null;
  let selectedReportId = null;
  const initialActiveFloorButton = Array.from(floorButtons).find((b) => b.classList.contains("floor-btn-active"));
  let selectedFloor = initialActiveFloorButton?.dataset.floor || DEFAULT_FLOOR;
  let reports = [];
  let analytics = { total: 0, open: 0, inProgress: 0, resolved: 0 };

  const isDesktop = () => window.innerWidth >= DESKTOP_BREAKPOINT;
  const getSelectedReport = () => reports.find((r) => r.id === selectedReportId) || null;
  const currentUser = () => (window.SpotnFixAPI ? SpotnFixAPI.getUser() : null);

  const buildAdminPortalHTML = (report) => {
    const photoBlock = report.photoPath
      ? `<p><strong>Photo:</strong> <a href="${photoUrl(report.photoPath)}" target="_blank" rel="noopener">View evidence</a></p>`
      : "";

    const historyHTML =
      report.history?.length > 0
        ? report.history
            .map(
              (item) => `
          <article class="history-item">
            <p><strong>Date:</strong> ${item.date || "N/A"}</p>
            <p><strong>Submitted by:</strong> ${item.submitter || report.submittedBy}</p>
            <p><strong>Content:</strong> ${item.content || report.description}</p>
            <p><strong>Date Resolved:</strong> ${item.resolved || "Pending"}</p>
          </article>`
            )
            .join("")
        : `<p class="note-empty">No history yet.</p>`;

    const isAdmin = currentUser()?.role === "admin";

    return `
      <h3 class="admin-portal-title" id="track-detail-title">REPORT DETAILS</h3>
      <section class="admin-info-box">
        <h4>Information</h4>
        <p><strong>Submitted by:</strong> ${report.submittedBy}</p>
        <p><strong>ID Number:</strong> ${report.studentNo}</p>
        <p><strong>Floor:</strong> ${report.floor} · <strong>Room:</strong> ${report.room}</p>
        <p><strong>Equipment:</strong> ${report.type} (${report.facilityType || "N/A"})</p>
        <p><strong>Issue type:</strong> ${report.issueType || "N/A"}</p>
        <p><strong>Reported:</strong> ${report.date} at ${report.time}</p>
        <p><strong>Description:</strong> ${report.description}</p>
        ${photoBlock}
      </section>
      <section class="admin-history"><h4>History</h4>${historyHTML}</section>
      ${
        isAdmin
          ? `<label class="detail-label" for="detail-status-${report.id}">Status</label>
             <select class="detail-status" id="detail-status-${report.id}" data-detail-status>
               <option value="open" ${report.status === "open" ? "selected" : ""}>Open (Pending)</option>
               <option value="in progress" ${report.status === "in progress" ? "selected" : ""}>In Progress</option>
               <option value="resolved" ${report.status === "resolved" ? "selected" : ""}>Resolved</option>
             </select>`
          : `<p><strong>Status:</strong> ${report.status}</p>`
      }`;
  };

  const bindAdminPortalEvents = (container) => {
    const statusSelect = container?.querySelector("[data-detail-status]");
    if (!statusSelect) return;

    statusSelect.addEventListener("change", async () => {
      const report = getSelectedReport();
      if (!report) return;

      try {
        const updated = await SpotnFixAPI.updateReportStatus(
          report.reportId || report.id.replace(/^r/, ""),
          statusSelect.value
        );
        Object.assign(report, updated);
        await refreshReports();
        populateDetailView(getSelectedReport());
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
    detailLockedScrollY = window.scrollY || 0;
    document.body.classList.add("modal-open");
    document.body.style.top = `-${detailLockedScrollY}px`;
    document.body.style.width = "100%";
    trackDetailBackdrop.hidden = false;
    trackDetailModal?.focus();
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
      detailPanel.hidden = false;
      detailPanel.setAttribute("aria-hidden", "false");
      closeTrackDetailMobile();
    } else {
      detailPanel.hidden = true;
      detailPanel.setAttribute("aria-hidden", "true");
      openTrackDetailMobile();
    }
  };

  const analyticsView = document.querySelector("#reports-analytics-view");
  const workspace = document.querySelector(".reports-workspace");

  const setActiveScreen = (screen) => {
    let normalized = ["track", "analytics"].includes(screen) ? screen : "report";

    if (normalized === "report" && SpotnFixAuth.isAdmin?.()) {
      normalized = "track";
    }

    reportsPage.dataset.screen = normalized;
    navLinks.forEach((link) => link.classList.toggle("active", link.dataset.navScreen === (normalized === "report" ? "report" : "track")));
    switchButtons.forEach((button) => {
      const activeTarget = normalized === "analytics" ? "analytics" : "track";
      button.classList.toggle("reports-tab-active", button.dataset.switchScreen === activeTarget);
    });
    if (analyticsView) analyticsView.hidden = normalized !== "analytics";
    if (workspace) workspace.hidden = normalized === "analytics";

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
    search: searchInput?.value.trim().toLowerCase() || "",
    date: filterSelects[0]?.value.toLowerCase() || "",
    type: filterSelects[1]?.value.toLowerCase() || "",
    room: filterSelects[2]?.value.toLowerCase() || "",
    status: filterSelects[3]?.value.toLowerCase() || "",
  });

  const matchesFilter = (report, filters) => {
    const joined = `${report.room} ${report.type} ${report.issueType} ${report.date} ${report.description} ${report.status}`.toLowerCase();
    if (filters.search && !joined.includes(filters.search)) return false;
    if (filters.date && filters.date !== "date" && report.date.toLowerCase() !== filters.date) return false;
    if (filters.type && filters.type !== "type" && !joined.includes(filters.type)) return false;
    if (filters.room && filters.room !== "room" && report.room.toLowerCase() !== filters.room) return false;
    if (filters.status && filters.status !== "status" && report.status.toLowerCase() !== filters.status) return false;
    return true;
  };

  const updateFilterOptions = () => {
    if (filterSelects.length < 4) return;
    const dates = [...new Set(reports.map((r) => r.date))];
    const types = [...new Set(reports.map((r) => `${r.type} (${r.issueType})`))];
    const rooms = [...new Set(reports.map((r) => r.room))];
    const statuses = ["open", "in progress", "resolved"];

    const fill = (select, label, values) => {
      select.innerHTML = `<option value="">${label}</option>` + values.map((v) => `<option value="${v}">${v}</option>`).join("");
    };

    fill(filterSelects[0], "Date", dates);
    fill(filterSelects[1], "Type", types);
    fill(filterSelects[2], "Room", rooms);
    fill(filterSelects[3], "Status", statuses.map((s) => s.charAt(0).toUpperCase() + s.slice(1)));
  };

  const renderReports = () => {
    if (!reportList) return;
    const visible = reports.filter((r) => r.floor === selectedFloor).filter((r) => matchesFilter(r, getFilters()));

    if (!visible.length) {
      reportList.innerHTML = `<p class="reports-empty">No reports on ${selectedFloor} yet.</p>`;
      return;
    }

    reportList.innerHTML = visible
      .map(
        (report) => `
      <article class="report-row${report.id === selectedReportId ? " row-selected" : ""}" data-report-id="${report.id}">
        <div class="row-main">
          <span class="status-dot ${statusDotClass(report.status)}"></span>
          <span>${report.room}</span>
          <span>${report.type}</span>
          <span>${report.date}</span>
        </div>
        <div class="row-sub">
          <span>${report.issueType}: ${report.description}</span>
          <span>${report.time}</span>
        </div>
      </article>`
      )
      .join("");
  };

  const renderAnalytics = () => {
    const map = [
      ["#analytics-total", analytics.total],
      ["#analytics-open", analytics.open],
      ["#analytics-progress", analytics.inProgress],
      ["#analytics-resolved", analytics.resolved],
    ];
    map.forEach(([sel, val]) => {
      const el = document.querySelector(sel);
      if (el) el.textContent = String(val);
    });
  };

  const updateFloorCounts = () => {
    const floors = ["8th Floor", "7th Floor", "6th Floor", "5th Floor", "4th Floor", "3rd Floor", "2nd Floor", "1st Floor"];
    floors.forEach((floor, index) => {
      const floorNum = 8 - index;
      const count = reports.filter((r) => r.floor === floor && r.status !== "resolved").length;
      const countEl = document.querySelector(`#floor-count-${floorNum}`);
      if (!countEl) return;
      countEl.textContent = String(count);
      countEl.classList.toggle("reports-side-icon-empty", count === 0);
    });
  };

  async function refreshReports() {
    reports = await SpotnFixAPI.getReports();
    analytics = await SpotnFixAPI.getAnalytics();
    updateFilterOptions();
    renderReports();
    renderAnalytics();
    updateFloorCounts();
    if (window.SpotnFixStatus) SpotnFixStatus.refreshStatus();
  }

  const openCreateModal = () => {
    if (SpotnFixAuth.isAdmin?.()) {
      if (createError) createError.textContent = "Administrators cannot submit issue reports.";
      return;
    }
    if (!SpotnFixAuth.requireAuth({ message: "Please log in or register before submitting a report." })) return;
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockedScrollY = window.scrollY || 0;
    document.body.classList.add("modal-open");
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.width = "100%";
    modalBackdrop.hidden = false;
    modalDialog?.focus();
    if (window.SpotnFixReportForm?.toggleLocationFields) {
      SpotnFixReportForm.toggleLocationFields("");
    }
  };

  const closeCreateModal = () => {
    modalBackdrop.hidden = true;
    if (!trackDetailBackdrop || trackDetailBackdrop.hidden) {
      document.body.classList.remove("modal-open");
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, lockedScrollY);
    }
    lastFocusedElement?.focus();
  };

  if (modalBackdrop) modalBackdrop.hidden = true;
  hideDetailViews();
  applyAdminReportRestrictions();

  reportList.innerHTML = `<p class="reports-loading">Loading reports from database...</p>`;
  refreshReports().catch((error) => {
    reportList.innerHTML = `<p class="create-report-error">Could not load reports. ${error.message}</p>`;
  });

  const updateScreenFromHash = () => {
    if (window.location.hash === "#contacts") {
      window.location.href = "../../contact.html";
      return;
    }
    if (window.location.hash === "#analytics") return setActiveScreen("analytics");
    if (window.location.hash === "#track") return setActiveScreen("track");
    if (SpotnFixAuth.isAdmin?.()) {
      history.replaceState(null, "", `${window.location.pathname}#track`);
      return setActiveScreen("track");
    }
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
      let screen = link.dataset.navScreen || "report";
      if (screen === "report" && SpotnFixAuth.isAdmin?.()) {
        screen = "track";
      }
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

  reportList?.addEventListener("click", (event) => {
    const row = event.target.closest(".report-row");
    if (!row) return;
    selectedReportId = row.dataset.reportId;
    renderReports();
    setActiveScreen("track");
    showDetailForSelection();
    history.replaceState(null, "", `${window.location.pathname}#track`);
  });

  searchInput?.addEventListener("input", renderReports);
  filterSelects.forEach((select) => select.addEventListener("change", renderReports));
  clearButton?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    filterSelects.forEach((select) => { select.selectedIndex = 0; });
    renderReports();
  });

  openModalButton?.addEventListener("click", () => {
    if (createError) createError.textContent = "";
    openCreateModal();
  });
  closeModalButton?.addEventListener("click", closeCreateModal);
  submitNewReportButton?.addEventListener("click", () =>
    submitReportForm("", createError, async () => {
      closeCreateModal();
      await refreshReports();
      setActiveScreen("report");
    })
  );
  modalBackdrop?.addEventListener("click", (event) => {
    if (event.target === modalBackdrop) closeCreateModal();
  });
  closeTrackDetailButton?.addEventListener("click", closeTrackDetailMobile);
  trackDetailBackdrop?.addEventListener("click", (event) => {
    if (event.target === trackDetailBackdrop) closeTrackDetailMobile();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (trackDetailBackdrop && !trackDetailBackdrop.hidden) return closeTrackDetailMobile();
    if (modalBackdrop && !modalBackdrop.hidden) closeCreateModal();
  });
}

const homeOpenModalButton = document.querySelector("#open-home-report-modal");
const homeModalBackdrop = document.querySelector("#home-report-modal-backdrop");
const homeModalDialog = document.querySelector("#home-report-modal-backdrop .report-modal");
const homeCloseModalButton = document.querySelector("#close-home-report-modal");
const homeSubmitButton = document.querySelector("#submit-home-new-report");
const homeCreateError = document.querySelector("#home-create-report-error");

if (homeOpenModalButton && homeModalBackdrop) {
  let homeLockedScrollY = 0;
  let homeLastFocusedElement = null;

  const openHomeCreateModal = () => {
    if (SpotnFixAuth.isAdmin?.()) {
      window.alert("Administrators cannot submit issue reports.");
      return;
    }
    if (!SpotnFixAuth.requireAuth({ message: "Please log in or register before submitting a report." })) return;
    homeLastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    homeLockedScrollY = window.scrollY || 0;
    document.body.classList.add("modal-open");
    document.body.style.top = `-${homeLockedScrollY}px`;
    document.body.style.width = "100%";
    homeModalBackdrop.hidden = false;
    homeModalDialog?.focus();
    if (window.SpotnFixReportForm?.toggleLocationFields) {
      SpotnFixReportForm.toggleLocationFields("home");
    }
  };

  const closeHomeCreateModal = () => {
    homeModalBackdrop.hidden = true;
    document.body.classList.remove("modal-open");
    document.body.style.top = "";
    document.body.style.width = "";
    window.scrollTo(0, homeLockedScrollY);
    homeLastFocusedElement?.focus();
  };

  homeOpenModalButton.addEventListener("click", () => {
    if (homeCreateError) homeCreateError.textContent = "";
    openHomeCreateModal();
  });
  homeCloseModalButton?.addEventListener("click", closeHomeCreateModal);
  homeSubmitButton?.addEventListener("click", () =>
    submitReportForm("home", homeCreateError, () => {
      closeHomeCreateModal();
      window.location.href = "pages/system/reports.html#track";
    })
  );
  homeModalBackdrop.addEventListener("click", (event) => {
    if (event.target === homeModalBackdrop) closeHomeCreateModal();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !homeModalBackdrop.hidden) closeHomeCreateModal();
  });
}
