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
  const issueTypeSelect = document.querySelector("#filter-issue-type");
  const statusSelect = document.querySelector("#filter-status");
  const clearButton = document.querySelector(".clear-btn");
  const dateRangeTrigger = document.querySelector("#date-range-trigger");
  const dateRangePopover = document.querySelector("#date-range-popover");
  const dateRangeStart = document.querySelector("#date-range-start");
  const dateRangeEnd = document.querySelector("#date-range-end");
  const dateRangeApply = document.querySelector("#date-range-apply");
  const sortMenuBtn = document.querySelector("#sort-menu-btn");
  const sortMenuPopover = document.querySelector("#sort-menu-popover");
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
  let sortOrder = "date-desc";
  let dateRange = { start: "", end: "" };

  const DEFAULT_SORT = "date-desc";

  const parseIsoDate = (iso) => {
    if (!iso) return null;
    const [year, month, day] = iso.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const formatRangeLabel = (iso) => {
    const date = parseIsoDate(iso);
    if (!date) return "";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const updateDateRangeTriggerLabel = () => {
    if (!dateRangeTrigger) return;
    if (!dateRange.start && !dateRange.end) {
      dateRangeTrigger.textContent = "Date";
      return;
    }
    if (dateRange.start && dateRange.end && dateRange.start !== dateRange.end) {
      dateRangeTrigger.textContent = `${formatRangeLabel(dateRange.start)} – ${formatRangeLabel(dateRange.end)}`;
      return;
    }
    dateRangeTrigger.textContent = formatRangeLabel(dateRange.start || dateRange.end);
  };

  const closePopover = (popover, trigger) => {
    if (!popover) return;
    popover.hidden = true;
    trigger?.setAttribute("aria-expanded", "false");
  };

  const togglePopover = (popover, trigger) => {
    if (!popover || !trigger) return;
    const willOpen = popover.hidden;
    closePopover(sortMenuPopover, sortMenuBtn);
    closePopover(dateRangePopover, dateRangeTrigger);
    popover.hidden = !willOpen;
    trigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
  };

  const compareRoom = (a, b) => {
    const numA = Number.parseInt(String(a).replace(/\D/g, ""), 10);
    const numB = Number.parseInt(String(b).replace(/\D/g, ""), 10);
    if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) return numA - numB;
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
  };

  const applySort = (list) => {
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortOrder) {
        case "date-asc":
          return (a.reportDateIso || "").localeCompare(b.reportDateIso || "") || a.reportId - b.reportId;
        case "room-asc":
          return compareRoom(a.room, b.room);
        case "room-desc":
          return compareRoom(b.room, a.room);
        case "issue-asc":
          return (a.issueType || "").localeCompare(b.issueType || "", undefined, { sensitivity: "base" });
        case "issue-desc":
          return (b.issueType || "").localeCompare(a.issueType || "", undefined, { sensitivity: "base" });
        case "date-desc":
        default:
          return (b.reportDateIso || "").localeCompare(a.reportDateIso || "") || b.reportId - a.reportId;
      }
    });
    return sorted;
  };

  const getRoleScopedReports = () => {
    if (currentUser()?.role === "admin") return reports;
    return reports.filter((report) => report.status !== "resolved");
  };

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
    issueType: issueTypeSelect?.value.trim().toLowerCase() || "",
    status: statusSelect?.value.trim().toLowerCase() || "",
  });

  const matchesDateRange = (report) => {
    if (!dateRange.start && !dateRange.end) return true;
    const reportDate = parseIsoDate(report.reportDateIso);
    if (!reportDate) return false;

    const start = dateRange.start ? parseIsoDate(dateRange.start) : null;
    const end = dateRange.end ? parseIsoDate(dateRange.end) : null;

    if (start && end) {
      return reportDate >= start && reportDate <= end;
    }
    const single = start || end;
    return (
      reportDate.getFullYear() === single.getFullYear() &&
      reportDate.getMonth() === single.getMonth() &&
      reportDate.getDate() === single.getDate()
    );
  };

  const matchesFilter = (report, filters) => {
    const joined = `${report.room} ${report.type} ${report.issueType} ${report.date} ${report.description} ${report.status}`.toLowerCase();
    if (filters.search && !joined.includes(filters.search)) return false;
    if (!matchesDateRange(report)) return false;
    if (filters.issueType && (report.issueType || "").toLowerCase() !== filters.issueType) return false;
    if (filters.status && report.status.toLowerCase() !== filters.status) return false;
    return true;
  };

  const hasActiveFilters = () => {
    const filters = getFilters();
    return Boolean(
      filters.search ||
        filters.issueType ||
        filters.status ||
        dateRange.start ||
        dateRange.end ||
        sortOrder !== DEFAULT_SORT
    );
  };

  const updateFilterOptions = () => {
    const scoped = getRoleScopedReports();
    const issueTypes = [...new Set(scoped.map((r) => r.issueType).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );

    if (issueTypeSelect) {
      const current = issueTypeSelect.value;
      issueTypeSelect.innerHTML =
        `<option value="">Issue Type</option>` +
        issueTypes.map((type) => `<option value="${type}">${type}</option>`).join("");
      if ([...issueTypeSelect.options].some((option) => option.value === current)) {
        issueTypeSelect.value = current;
      }
    }

    if (statusSelect) {
      const isAdmin = currentUser()?.role === "admin";
      statusSelect.innerHTML = isAdmin
        ? `<option value="">Status</option>
           <option value="open">Open</option>
           <option value="in progress">In Progress</option>
           <option value="resolved">Resolved</option>`
        : `<option value="">Status</option>
           <option value="open">Open</option>
           <option value="in progress">In Progress</option>`;
    }
  };

  const getVisibleReports = () => {
    const filters = getFilters();
    return applySort(
      getRoleScopedReports()
        .filter((report) => report.floor === selectedFloor)
        .filter((report) => matchesFilter(report, filters))
    );
  };

  const renderReports = () => {
    if (!reportList) return;
    const visible = getVisibleReports();

    if (!visible.length) {
      const message = hasActiveFilters()
        ? "No reports match your filters."
        : `No reports on ${selectedFloor} yet.`;
      reportList.innerHTML = `<p class="reports-empty">${message}</p>`;
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
    const scoped = getRoleScopedReports();
    floors.forEach((floor, index) => {
      const floorNum = 8 - index;
      const count = scoped.filter((r) => r.floor === floor && r.status !== "resolved").length;
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

  const resetFilters = () => {
    if (searchInput) searchInput.value = "";
    if (issueTypeSelect) issueTypeSelect.selectedIndex = 0;
    if (statusSelect) statusSelect.selectedIndex = 0;
    dateRange = { start: "", end: "" };
    if (dateRangeStart) dateRangeStart.value = "";
    if (dateRangeEnd) dateRangeEnd.value = "";
    updateDateRangeTriggerLabel();
    sortOrder = DEFAULT_SORT;
    sortMenuPopover?.querySelectorAll("[data-sort]").forEach((button) => {
      button.classList.toggle("sort-option-active", button.dataset.sort === DEFAULT_SORT);
    });
    closePopover(dateRangePopover, dateRangeTrigger);
    closePopover(sortMenuPopover, sortMenuBtn);
    renderReports();
  };

  searchInput?.addEventListener("input", renderReports);
  issueTypeSelect?.addEventListener("change", renderReports);
  statusSelect?.addEventListener("change", renderReports);
  clearButton?.addEventListener("click", resetFilters);

  dateRangeTrigger?.addEventListener("click", (event) => {
    event.stopPropagation();
    togglePopover(dateRangePopover, dateRangeTrigger);
  });

  dateRangeApply?.addEventListener("click", () => {
    dateRange = {
      start: dateRangeStart?.value || "",
      end: dateRangeEnd?.value || "",
    };
    updateDateRangeTriggerLabel();
    closePopover(dateRangePopover, dateRangeTrigger);
    renderReports();
  });

  sortMenuBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    togglePopover(sortMenuPopover, sortMenuBtn);
  });

  sortMenuPopover?.querySelectorAll("[data-sort]").forEach((button) => {
    button.classList.toggle("sort-option-active", button.dataset.sort === sortOrder);
    button.addEventListener("click", () => {
      sortOrder = button.dataset.sort || DEFAULT_SORT;
      sortMenuPopover.querySelectorAll("[data-sort]").forEach((item) => {
        item.classList.toggle("sort-option-active", item.dataset.sort === sortOrder);
      });
      closePopover(sortMenuPopover, sortMenuBtn);
      renderReports();
    });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".date-range-filter")) {
      closePopover(dateRangePopover, dateRangeTrigger);
    }
    if (!event.target.closest(".sort-menu-wrap")) {
      closePopover(sortMenuPopover, sortMenuBtn);
    }
  });

  updateDateRangeTriggerLabel();

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
