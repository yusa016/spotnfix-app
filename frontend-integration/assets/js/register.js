const registerForm = document.querySelector("#register-form");
const registerIdNumber = document.querySelector("#register-id-number");
const registerFirstName = document.querySelector("#register-first-name");
const registerLastName = document.querySelector("#register-last-name");
const registerEmail = document.querySelector("#register-email");
const registerPassword = document.querySelector("#register-password");
const registerConfirm = document.querySelector("#register-confirm");
const registerError = document.querySelector("#register-error");

if (registerForm && registerEmail && registerPassword && registerConfirm && registerError) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const idNumber = registerIdNumber ? registerIdNumber.value.trim() : "";
    const firstName = registerFirstName ? registerFirstName.value.trim() : "Student";
    const lastName = registerLastName ? registerLastName.value.trim() : "User";
    const email = registerEmail.value.trim().toLowerCase();
    const password = registerPassword.value.trim();
    const confirmPassword = registerConfirm.value.trim();

    if (!email || !password || !confirmPassword) {
      registerError.textContent = "Please fill in all fields.";
      return;
    }

    if (!idNumber) {
      registerError.textContent = "Please enter your ID number.";
      return;
    }

    if (password !== confirmPassword) {
      registerError.textContent = "Passwords do not match.";
      return;
    }

    registerError.textContent = "";

    try {
      await SpotnFixAPI.register({
        idNumber: Number(idNumber),
        firstName,
        lastName,
        email,
        password,
        role: "student",
      });
      window.location.href = "login.html";
    } catch (error) {
      registerError.textContent = error.message || "Registration failed.";
    }
  });
}
