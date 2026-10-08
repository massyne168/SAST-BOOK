const ACCESS_CODE = "2012";
const SESSION_KEY = "armoryArchiveAccess";
const RETRY_KEY = "armoryArchiveAccessRetry";

const gate = document.getElementById("maintenance-screen");
const form = document.getElementById("maintenance-form");
const input = document.getElementById("maintenance-code");
const error = document.getElementById("maintenance-error");
const persist = document.getElementById("maintenance-persist");
const retry = document.getElementById("maintenance-retry");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let archiveStarted = false;
let archiveStartPromise = null;
let unlockInProgress = false;

function setArchiveInert(locked) {
  for (const element of document.body.children) {
    if (element === gate || element.id === "site-loader" || element.tagName === "SCRIPT") continue;
    element.inert = locked;
  }
}

function showInitializationError(cause) {
  console.error("Unable to initialize the archive", cause);
  error.textContent = "ARCHIVE INITIALIZATION FAILED. RETRY TO CONTINUE.";
  retry.hidden = false;
  gate.hidden = false;
  gate.style.pointerEvents = "";
  gate.classList.remove("is-unlocking");
  gate.setAttribute("aria-hidden", "false");
  document.body.classList.add("is-maintenance");
  setArchiveInert(true);
  retry.focus();
}

function startArchive() {
  if (archiveStarted) return Promise.resolve(true);
  if (archiveStartPromise) return archiveStartPromise;
  archiveStartPromise = Promise.all([import("./app.js"), import("./crosshair.js")])
    .then(() => {
      archiveStarted = true;
      return true;
    })
    .catch((cause) => {
      archiveStartPromise = null;
      showInitializationError(cause);
      return false;
    });
  return archiveStartPromise;
}

function hideMaintenance() {
  gate.hidden = true;
  gate.style.pointerEvents = "none";
  gate.setAttribute("aria-hidden", "true");
  document.body.classList.remove("is-maintenance");
  setArchiveInert(false);
  retry.hidden = true;
  error.textContent = "";
}

function finishUnlock() {
  if (unlockInProgress || archiveStarted) return;
  unlockInProgress = true;
  if (persist.checked) {
    try { sessionStorage.setItem(SESSION_KEY, "unlocked"); } catch { /* Session storage can be disabled by browser policy. */ }
  } else {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* The current tab still unlocks without storage. */ }
  }

  setArchiveInert(false);
  document.body.classList.remove("is-maintenance");
  gate.classList.add("is-unlocking");
  let fallbackTimer;
  const onTransitionEnd = (event) => {
    if (event.target === gate && event.propertyName === "opacity") reveal();
  };
  const reveal = () => {
    if (!unlockInProgress) return;
    gate.removeEventListener("transitionend", onTransitionEnd);
    window.clearTimeout(fallbackTimer);
    unlockInProgress = false;
    hideMaintenance();
    void startArchive();
  };
  if (reducedMotion.matches) {
    reveal();
    return;
  }
  gate.addEventListener("transitionend", onTransitionEnd);
  fallbackTimer = window.setTimeout(reveal, 500);
}

function hasSessionAccess() {
  try {
    const retryAccess = sessionStorage.getItem(RETRY_KEY) === "unlocked";
    if (retryAccess) sessionStorage.removeItem(RETRY_KEY);
    return retryAccess || sessionStorage.getItem(SESSION_KEY) === "unlocked";
  } catch { return false; }
}

setArchiveInert(true);
if (hasSessionAccess()) finishUnlock();

retry.addEventListener("click", () => {
  retry.disabled = true;
  try { sessionStorage.setItem(RETRY_KEY, "unlocked"); } catch { /* The access form remains available after reload. */ }
  window.location.reload();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (input.value === ACCESS_CODE) {
    input.removeAttribute("aria-invalid");
    error.textContent = "";
    finishUnlock();
    return;
  }

  error.textContent = "INVALID ACCESS CODE";
  input.setAttribute("aria-invalid", "true");
  input.value = "";
  input.classList.remove("is-invalid");
  void input.offsetWidth;
  input.classList.add("is-invalid");
  input.focus();
});

input.addEventListener("input", () => {
  input.removeAttribute("aria-invalid");
  error.textContent = "";
  input.classList.remove("is-invalid");
});
