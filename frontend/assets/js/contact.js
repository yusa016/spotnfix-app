const contactForm = document.querySelector(".contact-form");

if (contactForm && !(window.SpotnFixAuth?.isAdmin?.())) {
  const firstNameInput = document.querySelector("#contact-first-name");
  const lastNameInput = document.querySelector("#contact-last-name");
  const emailInput = document.querySelector("#contact-email");
  const subjectInput = document.querySelector("#contact-subject");
  const messageInput = document.querySelector("#contact-message");
  const errorEl = document.querySelector("#contact-error");
  const successEl = document.querySelector("#contact-success");
  const submitBtn = contactForm.querySelector(".contact-submit");

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const firstName = firstNameInput?.value.trim() || "";
    const lastName = lastNameInput?.value.trim() || "";
    const email = emailInput?.value.trim() || "";
    const subject = subjectInput?.value.trim() || "";
    const message = messageInput?.value.trim() || "";

    if (!firstName || !lastName || !email || !subject || !message) {
      if (errorEl) errorEl.textContent = "Please fill in all fields.";
      if (successEl) successEl.textContent = "";
      return;
    }

    if (message.length < 10) {
      if (errorEl) errorEl.textContent = "Message should be at least 10 characters.";
      return;
    }

    if (errorEl) errorEl.textContent = "";
    if (successEl) successEl.textContent = "";
    if (submitBtn) submitBtn.disabled = true;

    try {
      const result = await SpotnFixAPI.submitContact({ firstName, lastName, email, subject, message });
      contactForm.reset();
      if (successEl) successEl.textContent = result.message || "Message sent successfully!";
      if (window.SpotnFixStatus) SpotnFixStatus.refreshStatus();
    } catch (error) {
      if (errorEl) errorEl.textContent = error.message || "Failed to send message.";
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}
