// ChargeSmart Authentication Controller
const form = document.querySelector("#authForm");
const roleSelect = document.querySelector("#role");
const message = document.querySelector("#authMessage");
const nameWrap = document.querySelector("#nameWrap");
const heading = document.querySelector("#heading");
const subheading = document.querySelector("#subheading");
const submitBtn = document.querySelector("#submitBtn");
const switchMode = document.querySelector("#switchMode");
const userInput = document.querySelector("#username") || document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const demoBox = document.querySelector("#demoBox");
const demoTitle = document.querySelector("#demoTitle");
const demoCredsText = document.querySelector("#demoCredsText");
const fillDemoBtn = document.querySelector("#fillDemoBtn");
const togglePassword = document.querySelector("#togglePassword");

let isSignup = false;

// Pre-configured default demo accounts for instant access
const PRESET_ACCOUNTS = [
  {
    username: "owner",
    email: "owner@chargesmart.com",
    aliases: ["admin", "stationowner", "owner@demo.com"],
    passwords: ["owner123", "password123", "password", "admin123", "owner"],
    fullName: "Station Owner",
    role: "owner"
  },
  {
    username: "driver",
    email: "driver@chargesmart.com",
    aliases: ["alex", "evdriver", "driver@demo.com"],
    passwords: ["driver123", "password123", "password", "driver"],
    fullName: "Alex EV Driver",
    role: "driver"
  }
];

function getStoredUsers() {
  try {
    return JSON.parse(localStorage.getItem("chargesmart_users") || "[]");
  } catch (e) {
    return [];
  }
}

function saveStoredUsers(users) {
  localStorage.setItem("chargesmart_users", JSON.stringify(users));
}

function saveActiveSession(user) {
  const session = {
    user: {
      id: user.id || "cs-user-" + (user.username || Date.now()),
      username: user.username || user.email || "user",
      email: user.email || (user.username?.includes("@") ? user.username : `${user.username || "user"}@chargesmart.local`),
      full_name: user.fullName || user.full_name || user.username || "User",
      role: user.role || "driver"
    },
    token: "cs-token-" + Date.now(),
    loggedInAt: new Date().toISOString()
  };
  localStorage.setItem("chargesmart_session", JSON.stringify(session));
  return session;
}

function showMessage(text, type = "info") {
  if (!message) return;
  message.textContent = text;
  message.className = type;
}

function updateUIForRole() {
  const role = roleSelect.value;
  if (role === "owner") {
    if (demoTitle) demoTitle.innerHTML = "⚡ <b>Default Owner Login</b>";
    if (demoCredsText) demoCredsText.innerHTML = "<div>Username: <code>owner</code> &nbsp;|&nbsp; Password: <code>owner123</code></div>";
    if (fillDemoBtn) fillDemoBtn.textContent = "Auto-fill Owner";
    if (submitBtn) submitBtn.textContent = isSignup ? "Create Station Owner Account" : "Log in as Station Owner";
  } else {
    if (demoTitle) demoTitle.innerHTML = "⚡ <b>Default Driver Login</b>";
    if (demoCredsText) demoCredsText.innerHTML = "<div>Username: <code>driver</code> &nbsp;|&nbsp; Password: <code>driver123</code></div>";
    if (fillDemoBtn) fillDemoBtn.textContent = "Auto-fill Driver";
    if (submitBtn) submitBtn.textContent = isSignup ? "Create EV Driver Account" : "Log in as EV Driver";
  }

  if (demoBox) {
    demoBox.style.display = isSignup ? "none" : "block";
  }
}

// Check role from URL query param (?role=owner or ?role=driver)
const requestedRole = new URLSearchParams(location.search).get("role");
if (requestedRole === "driver" || requestedRole === "owner") {
  roleSelect.value = requestedRole;
} else {
  roleSelect.value = "owner"; // Default to owner as requested
}
updateUIForRole();

roleSelect.addEventListener("change", () => {
  updateUIForRole();
  showMessage("");
});

// Quick auto-fill button
fillDemoBtn?.addEventListener("click", () => {
  const role = roleSelect.value;
  if (role === "owner") {
    userInput.value = "owner";
    passwordInput.value = "owner123";
    showMessage("Owner credentials filled! Click Log in.", "success");
  } else {
    userInput.value = "driver";
    passwordInput.value = "driver123";
    showMessage("Driver credentials filled! Click Log in.", "success");
  }
  submitBtn.focus();
});

// Toggle password visibility
togglePassword?.addEventListener("click", () => {
  const isPwd = passwordInput.type === "password";
  passwordInput.type = isPwd ? "text" : "password";
  togglePassword.textContent = isPwd ? "🙈" : "👁️";
});

// Toggle Login / Signup mode
switchMode?.addEventListener("click", () => {
  isSignup = !isSignup;
  nameWrap.classList.toggle("hidden", !isSignup);
  const fullNameInput = document.querySelector("#fullName");
  if (fullNameInput) fullNameInput.required = isSignup;

  heading.textContent = isSignup ? "Create your account" : "Welcome back";
  subheading.textContent = isSignup
    ? "Sign up with a username and password to get started."
    : "Log in to continue to your dashboard.";
  switchMode.textContent = isSignup
    ? "Already registered? Log in"
    : "New here? Create an account";

  updateUIForRole();
  showMessage("");
});

// Submit handler
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const usernameVal = userInput.value.trim();
  const passwordVal = passwordInput.value;
  const role = roleSelect.value;

  if (!usernameVal || !passwordVal) {
    showMessage("Please enter both username and password.", "error");
    return;
  }

  submitBtn.disabled = true;
  showMessage("Authenticating…", "info");

  try {
    if (isSignup) {
      // SIGN UP FLOW
      const fullName = (document.querySelector("#fullName")?.value || "").trim() || usernameVal;
      const cleanUser = usernameVal.toLowerCase();

      // Check if username already exists in presets or stored users
      const users = getStoredUsers();
      const existingUser = users.find(u => u.username.toLowerCase() === cleanUser || (u.email && u.email.toLowerCase() === cleanUser));
      const existingPreset = PRESET_ACCOUNTS.find(p => p.username.toLowerCase() === cleanUser || p.email.toLowerCase() === cleanUser);

      if (existingUser || existingPreset) {
        throw new Error(`Username "${usernameVal}" is already registered. Please choose another username or log in.`);
      }

      const email = cleanUser.includes("@") ? usernameVal : `${cleanUser}@chargesmart.local`;
      const newUser = {
        id: "usr-" + Date.now(),
        fullName,
        username: usernameVal,
        email,
        password: passwordVal,
        role
      };

      users.push(newUser);
      saveStoredUsers(users);

      // Attempt Supabase signUp if email format and client ready (optional/non-blocking)
      if (supabaseClient && cleanUser.includes("@")) {
        try {
          await supabaseClient.auth.signUp({
            email: usernameVal,
            password: passwordVal,
            options: { data: { full_name: fullName, role } }
          });
        } catch (sbErr) {
          console.warn("Supabase background signup notice:", sbErr.message);
        }
      }

      // Save local session and redirect immediately
      saveActiveSession(newUser);
      showMessage("Account created! Redirecting to " + (role === "owner" ? "Owner Console…" : "Driver Dashboard…"), "success");
      setTimeout(() => {
        location.href = role === "owner" ? "owner.html" : "driver.html";
      }, 500);

    } else {
      // LOGIN FLOW
      const cleanInput = usernameVal.toLowerCase();

      // 1. Check PRESET accounts (owner / driver)
      const preset = PRESET_ACCOUNTS.find(p =>
        p.username.toLowerCase() === cleanInput ||
        p.email.toLowerCase() === cleanInput ||
        (p.aliases && p.aliases.some(a => a.toLowerCase() === cleanInput))
      );

      if (preset) {
        if (!preset.passwords.includes(passwordVal)) {
          throw new Error(`Incorrect password for ${preset.username}. Default password is "${preset.passwords[0]}".`);
        }

        // Preset user authenticated!
        const targetRole = preset.role;
        saveActiveSession(preset);
        showMessage("Login successful! Loading " + (targetRole === "owner" ? "Owner Console…" : "Driver Dashboard…"), "success");
        setTimeout(() => {
          location.href = targetRole === "owner" ? "owner.html" : "driver.html";
        }, 400);
        return;
      }

      // 2. Check locally registered accounts in localStorage
      const users = getStoredUsers();
      const localUser = users.find(u =>
        u.username.toLowerCase() === cleanInput ||
        (u.email && u.email.toLowerCase() === cleanInput)
      );

      if (localUser) {
        if (localUser.password !== passwordVal) {
          throw new Error("Incorrect password. Please try again.");
        }

        const targetRole = localUser.role || role;
        saveActiveSession(localUser);
        showMessage("Login successful! Loading " + (targetRole === "owner" ? "Owner Console…" : "Driver Dashboard…"), "success");
        setTimeout(() => {
          location.href = targetRole === "owner" ? "owner.html" : "driver.html";
        }, 400);
        return;
      }

      // 3. Fallback: Check Supabase Auth if input looks like an email and client is available
      if (cleanInput.includes("@") && supabaseClient) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email: usernameVal,
          password: passwordVal
        });

        if (error) throw error;

        const actualRole = data.user?.user_metadata?.role || role;
        saveActiveSession({
          id: data.user.id,
          username: data.user.email?.split("@")[0] || "user",
          email: data.user.email,
          fullName: data.user.user_metadata?.full_name || data.user.email,
          role: actualRole
        });

        showMessage("Login successful! Redirecting…", "success");
        setTimeout(() => {
          location.href = actualRole === "owner" ? "owner.html" : "driver.html";
        }, 400);
        return;
      }

      // If neither preset, local user, nor Supabase email matched
      throw new Error(`User "${usernameVal}" not found. For Owner login, use username "owner" and password "owner123".`);
    }
  } catch (err) {
    showMessage(err.message || "Could not complete login. Please check your credentials.", "error");
    submitBtn.disabled = false;
  }
});
