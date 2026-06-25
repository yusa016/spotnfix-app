<!-- Add these fields inside your existing #register-form, before the email input -->
<input class="auth-input" id="register-id-number" name="idNumber" type="number" placeholder="ID Number" required>
<input class="auth-input" id="register-first-name" name="firstName" type="text" placeholder="First Name" required>
<input class="auth-input" id="register-last-name" name="lastName" type="text" placeholder="Last Name" required>

<!-- Add these script tags BEFORE login.js / register.js / main.js on every page that uses the API -->
<script src="../../assets/js/config.js"></script>
<script src="../../assets/js/api.js"></script>

<!-- On index.html use: -->
<!-- <script src="assets/js/config.js"></script> -->
<!-- <script src="assets/js/api.js"></script> -->

<!-- On pages/system/reports.html, add config.js + api.js before main.js -->
