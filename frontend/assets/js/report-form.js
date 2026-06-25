(function () {
  const FLOOR_OPTIONS = [
    "8th Floor",
    "7th Floor",
    "6th Floor",
    "5th Floor",
    "4th Floor",
    "3rd Floor",
    "2nd Floor",
    "1st Floor",
  ];

  const resolvedFloors = new Map();
  const lookupTimers = new Map();

  function fieldId(prefix, id) {
    return prefix ? `${prefix}-${id}` : id;
  }

  function el(prefix, id) {
    return document.querySelector(`#${fieldId(prefix, id)}`);
  }

  function locationTypeName(prefix) {
    return prefix ? `${prefix}-location-type` : "location-type";
  }

  function getLocationType(prefix = "") {
    const radio = document.querySelector(`input[name="${locationTypeName(prefix)}"]:checked`);
    return radio ? radio.value : "room";
  }

  function toggleLocationFields(prefix = "") {
    const locationType = getLocationType(prefix);
    const roomInput = el(prefix, "create-room");
    const areaInput = el(prefix, "create-area");
    const floorSelect = el(prefix, "create-floor");
    const detectedFloor = el(prefix, "detected-floor");

    if (locationType === "room") {
      roomInput?.removeAttribute("hidden");
      areaInput?.setAttribute("hidden", "true");
      floorSelect?.setAttribute("hidden", "true");
      floorSelect?.removeAttribute("required");
      detectedFloor?.removeAttribute("hidden");
      if (roomInput?.value.trim()) scheduleRoomLookup(prefix);
      else if (detectedFloor) {
        detectedFloor.textContent = "Enter a room number (e.g. 216) and the floor is detected automatically.";
        detectedFloor.style.color = "";
      }
    } else {
      roomInput?.setAttribute("hidden", "true");
      areaInput?.removeAttribute("hidden");
      floorSelect?.removeAttribute("hidden");
      floorSelect?.setAttribute("required", "true");
      detectedFloor?.setAttribute("hidden", "true");
      resolvedFloors.delete(prefix);
    }
  }

  async function lookupRoomFloorHint(prefix = "") {
    const roomInput = el(prefix, "create-room");
    const hint = el(prefix, "detected-floor");
    const room = roomInput?.value.trim() || "";

    if (!hint) return null;

    if (!room) {
      resolvedFloors.delete(prefix);
      hint.textContent = "Enter a room number (e.g. 216) and the floor is detected automatically.";
      hint.style.color = "";
      return null;
    }

    hint.textContent = "Detecting floor...";
    hint.style.color = "";

    try {
      const result = await SpotnFixAPI.lookupRoom(room);
      resolvedFloors.set(prefix, result);
      hint.textContent = `Detected floor: ${result.floor}${result.source === "pattern" ? " (from room number)" : ""}`;
      hint.style.color = "#28a745";
      return result;
    } catch (error) {
      resolvedFloors.delete(prefix);
      hint.textContent = error.message || "Could not detect floor. Switch to Area and pick the floor manually.";
      hint.style.color = "#dc3545";
      return null;
    }
  }

  function scheduleRoomLookup(prefix = "") {
    clearTimeout(lookupTimers.get(prefix));
    lookupTimers.set(
      prefix,
      setTimeout(() => {
        lookupRoomFloorHint(prefix);
      }, 350)
    );
  }

  function getValues(prefix = "") {
    const p = prefix ? `${prefix}-` : "";
    const photoInput = document.querySelector(`#${p}create-photo`);
    const locationType = getLocationType(prefix);

    if (locationType === "area") {
      return {
        locationType,
        floor: el(prefix, "create-floor")?.value.trim() || "",
        room: el(prefix, "create-area")?.value.trim() || "",
        facilityType: el(prefix, "create-facility-type")?.value.trim() || "",
        facilityName: el(prefix, "create-facility-name")?.value.trim() || "",
        issueType: el(prefix, "create-issue-type")?.value.trim() || "",
        description: el(prefix, "create-description")?.value.trim() || "",
        photoFile: photoInput?.files?.[0] || null,
      };
    }

    return {
      locationType,
      floor: resolvedFloors.get(prefix)?.floor || "",
      room: el(prefix, "create-room")?.value.trim() || "",
      facilityType: el(prefix, "create-facility-type")?.value.trim() || "",
      facilityName: el(prefix, "create-facility-name")?.value.trim() || "",
      issueType: el(prefix, "create-issue-type")?.value.trim() || "",
      description: el(prefix, "create-description")?.value.trim() || "",
      photoFile: photoInput?.files?.[0] || null,
    };
  }

  function clearForm(prefix = "") {
    const p = prefix ? `${prefix}-` : "";
    [`create-room`, `create-area`, `create-floor`, `create-facility-type`, `create-facility-name`, `create-issue-type`, `create-description`, `create-photo`].forEach((id) => {
      const field = document.querySelector(`#${p}${id}`);
      if (!field) return;
      if (field.type === "file") field.value = "";
      else if (field.tagName === "SELECT") field.selectedIndex = 0;
      else field.value = "";
    });

    const roomRadio = document.querySelector(`input[name="${locationTypeName(prefix)}"][value="room"]`);
    if (roomRadio) roomRadio.checked = true;
    resolvedFloors.delete(prefix);
    toggleLocationFields(prefix);
  }

  async function validate(values, prefix = "") {
    const locationType = values.locationType || "room";

    if (locationType === "area") {
      if (!values.room) return "Please enter an area name (e.g. Library).";
      if (!values.floor || !FLOOR_OPTIONS.includes(values.floor)) {
        return "Please select a floor from 1st to 8th Floor.";
      }
    } else {
      if (!values.room) return "Please enter a room number (e.g. 216).";
      let resolved = resolvedFloors.get(prefix);
      if (!resolved) {
        resolved = await lookupRoomFloorHint(prefix);
      }
      if (!resolved) {
        return "Could not detect the floor for that room. Use a number like 216, or switch to Area and pick the floor manually.";
      }
      values.floor = resolved.floor;
    }

    if (!values.facilityType) return "Please select an equipment type.";
    if (!values.facilityName) return "Please enter an equipment name (e.g. Television #10).";
    if (!values.issueType) return "Please select an issue type.";
    if (!values.description) return "Please describe the issue.";
    if (values.description.length < 10) return "Description should be at least 10 characters.";
    return "";
  }

  function setupLocationHandlers(prefix = "") {
    document.querySelectorAll(`input[name="${locationTypeName(prefix)}"]`).forEach((radio) => {
      radio.addEventListener("change", () => toggleLocationFields(prefix));
    });

    const roomInput = el(prefix, "create-room");
    roomInput?.addEventListener("input", () => scheduleRoomLookup(prefix));
    roomInput?.addEventListener("blur", () => lookupRoomFloorHint(prefix));

    toggleLocationFields(prefix);
  }

  window.SpotnFixReportForm = {
    FLOOR_OPTIONS,
    getValues,
    clearForm,
    validate,
    toggleLocationFields,
    setupLocationHandlers,
  };

  document.addEventListener("DOMContentLoaded", () => {
    setupLocationHandlers("");
    setupLocationHandlers("home");
  });
})();
