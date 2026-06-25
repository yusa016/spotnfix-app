const resetForm = document.querySelector("#reset-form");
const resetEmail = document.querySelector("#reset-email");
const resetIdNumber = document.querySelector("#reset-id-number");
const resetPassword = document.querySelector("#reset-password");
const resetConfirm = document.querySelector("#reset-confirm");
const resetError = document.querySelector("#reset-error");
const resetSuccess = document.querySelector("#reset-success");

if (resetForm && resetEmail && resetIdNumber && resetPassword && resetConfirm) {
  resetForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = resetEmail.value.trim().toLowerCase();
    const idNumber = Number(resetIdNumber.value.trim());
    const newPassword = resetPassword.value.trim();
    const confirmPassword = resetConfirm.value.trim();

    if (!email || !idNumber || !newPassword || !confirmPassword) {
      if (resetError) resetError.textContent = "Please fill in all fields.";
      if (resetSuccess) resetSuccess.textContent = "";
      return;
    }

    if (newPassword.length < 6) {
      if (resetError) resetError.textContent = "Password must be at least 6 characters.";
      return;
    }

    if (newPassword !== confirmPassword) {
      if (resetError) resetError.textContent = "Passwords do not match.";
      return;
    }

    if (resetError) resetError.textContent = "";
    if (resetSuccess) resetSuccess.textContent = "";
    resetForm.querySelector(".auth-submit").disabled = true;

    try {
      const result = await SpotnFixAPI.resetPassword({ email, idNumber, newPassword });
      resetForm.reset();
      if (resetSuccess) resetSuccess.textContent = result.message || "Password updated successfully.";
    } catch (error) {
      if (resetError) resetError.textContent = error.message || "Password reset failed.";
    } finally {
      resetForm.querySelector(".auth-submit").disabled = false;
    }
  });
}
