const ACCESS_CODE = "2012";
const SESSION_KEY = "armoryArchiveAccess";

const gate = document.getElementById("maintenance-screen");
const form = document.getElementById("maintenance-form");
const input = document.getElementById("maintenance-code");
const error = document.getElementById("maintenance-error");
const persist = document.getElementById("maintenance-persist");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let archiveStarted = false;
let unlockInProgress = false;

function setArchiveInert(locked) {
  for (const element of document.body.children) {
    if (element === gate || element.id === "site-loader" || element.tagName === "SCRIPT") continue;
    element.inert = locked;
  }
}

function startArchive() {
  if (archiveStarted) return;
  archiveStarted = true;
  Promise.all([import("./app.js"), import("./crosshair.js")]).catch((cause) => {
    archiveStarted = false;
    console.error("Unable to initialize the archive", cause);
  });
}

function finishUnlock() {
  if (unlockInProgress) return;
  unlockInProgress = true;
  if (persist.checked) {
    try { sessionStorage.setItem(SESSION_KEY, "unlocked"); } catch { /* Session storage can be disabled by browser policy. */ }
  } else {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* The current tab still unlocks without storage. */ }
  }

  setArchiveInert(false);
  document.body.classList.remove("is-maintenance");
  gate.classList.add("is-unlocking");
  const reveal = () => {
    gate.hidden = true;
    gate.setAttribute("aria-hidden", "true");
    startArchive();
  };
  if (reducedMotion.matches) reveal();
  else gate.addEventListener("transitionend", (event) => {
    if (event.target === gate && event.propertyName === "opacity") reveal();
  }, { once: true });
}

function hasSessionAccess() {
  try { return sessionStorage.getItem(SESSION_KEY) === "unlocked"; } catch { return false; }
}

setArchiveInert(true);
if (hasSessionAccess()) finishUnlock();

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
