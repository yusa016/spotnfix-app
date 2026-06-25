const registerForm = document.querySelector("#register-form");
const registerIdNumber = document.querySelector("#register-id-number");
const registerFirstName = document.querySelector("#register-first-name");
const registerLastName = document.querySelector("#register-last-name");
const registerEmail = document.querySelector("#register-email");
const registerRole = document.querySelector("#register-role");
const registerPassword = document.querySelector("#register-password");
const registerConfirm = document.querySelector("#register-confirm");
const registerError = document.querySelector("#register-error");
const registerEmailHint = document.querySelector("#register-email-hint");

const ROLE_EMAIL_RULES = {
  student: {
    domain: "mymail.mapua.edu.ph",
    placeholder: "you@mymail.mapua.edu.ph",
    hint: "Students should use their Mapúa student email ending in @mymail.mapua.edu.ph.",
    mismatch: "Students must use a @mymail.mapua.edu.ph email address. Select Other if you need a different email.",
  },
  faculty: {
    domain: "mapua.edu.ph",
    placeholder: "you@mapua.edu.ph",
    hint: "Faculty should use their Mapúa email ending in @mapua.edu.ph.",
    mismatch: "Faculty must use a @mapua.edu.ph email address. Select Other if you need a different email.",
  },
  other: {
    domain: null,
    placeholder: "you@example.com",
    hint: "Other accounts may use any valid email address.",
    mismatch: "",
  },
};

function updateEmailGuidance() {
  const role = registerRole?.value || "student";
  const rules = ROLE_EMAIL_RULES[role] || ROLE_EMAIL_RULES.student;
  if (registerEmail) registerEmail.placeholder = rules.placeholder;
  if (registerEmailHint) registerEmailHint.textContent = rules.hint;
}

function emailDomain(email) {
  return email.split("@")[1]?.toLowerCase() || "";
}

if (registerRole) {
  registerRole.addEventListener("change", updateEmailGuidance);
  updateEmailGuidance();
}

if (registerForm && registerEmail && registerPassword && registerConfirm && registerError) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const idNumber = registerIdNumber ? registerIdNumber.value.trim() : "";
    const firstName = registerFirstName ? registerFirstName.value.trim() : "";
    const lastName = registerLastName ? registerLastName.value.trim() : "";
    const email = registerEmail.value.trim().toLowerCase();
    const role = registerRole ? registerRole.value : "student";
    const password = registerPassword.value.trim();
    const confirmPassword = registerConfirm.value.trim();
    const rules = ROLE_EMAIL_RULES[role] || ROLE_EMAIL_RULES.student;

    if (!idNumber || !firstName || !lastName || !email || !password || !confirmPassword) {
      registerError.textContent = "Please fill in all fields.";
      return;
    }

    if (password.length < 6) {
      registerError.textContent = "Password must be at least 6 characters.";
      return;
    }

    if (password !== confirmPassword) {
      registerError.textContent = "Passwords do not match.";
      return;
    }

    if (rules.domain && emailDomain(email) !== rules.domain) {
      registerError.textContent = rules.mismatch;
      return;
    }

    registerError.textContent = "";
    registerForm.querySelector(".auth-submit").disabled = true;

    try {
      await SpotnFixAPI.register({
        idNumber: Number(idNumber),
        firstName,
        lastName,
        email,
        password,
        role,
      });

      const returnUrl = window.SpotnFixAuth ? SpotnFixAuth.getReturnUrl() : "";
      window.location.href = returnUrl
        ? `login.html?return=${encodeURIComponent(returnUrl)}`
        : "login.html";
    } catch (error) {
      registerError.textContent = error.message || "Registration failed.";
    } finally {
      registerForm.querySelector(".auth-submit").disabled = false;
    }
  });
}
