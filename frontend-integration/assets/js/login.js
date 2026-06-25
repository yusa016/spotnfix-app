const loginForm = document.querySelector("#login-form");
const loginEmail = document.querySelector("#login-email");
const loginPassword = document.querySelector("#login-password");
const loginError = document.querySelector("#login-error");

if (loginForm && loginEmail && loginPassword && loginError) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();

    if (!email || !password) {
      loginError.textContent = "Please enter both email and password.";
      return;
    }

    loginError.textContent = "";

    try {
      await SpotnFixAPI.login(email, password);
      window.location.href = "../system/reports.html#track";
    } catch (error) {
      loginError.textContent = error.message || "Login failed.";
    }
  });
}
