"use client";

let toastTimer = null;

function removeExisting(id) {
  const old = document.getElementById(id);
  if (old) old.remove();
}

export function avancyToast(message, type = "success", duration = 3600) {
  if (typeof document === "undefined") return;

  removeExisting("avancy-toast");

  const toast = document.createElement("div");
  toast.id = "avancy-toast";
  toast.className = `avancy-toast avancy-toast-${type}`;

  const mark =
    type === "success" ? "✓" :
    type === "error" ? "!" :
    "i";

  toast.innerHTML = `
    <span class="avancy-toast-mark">${mark}</span>
    <span class="avancy-toast-message"></span>
    <button type="button" class="avancy-toast-close" aria-label="Close">×</button>
  `;

  toast.querySelector(".avancy-toast-message").textContent = String(message || "");
  toast.querySelector(".avancy-toast-close").onclick = () => toast.remove();

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("is-visible");
  });

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => toast.remove(), 220);
  }, duration);
}

function createDialog({ title, message, kind = "confirm", input = false, defaultValue = "" }) {
  return new Promise((resolve) => {
    const existing = document.getElementById("avancy-dialog");
    if (existing) existing.remove();

    const backdrop = document.createElement("div");
    backdrop.id = "avancy-dialog";
    backdrop.className = "avancy-dialog-backdrop";

    const box = document.createElement("div");
    box.className = "avancy-dialog";

    const safeTitle = String(title || "Avancy");
    const safeMessage = String(message || "");

    box.innerHTML = `
      <div class="avancy-dialog-kicker">AVANCY COLLECTIVES</div>
      <h2></h2>
      <p></p>
      ${
        input
          ? `<textarea class="avancy-dialog-input" maxlength="500" placeholder="Enter reason..."></textarea>`
          : ""
      }
      <div class="avancy-dialog-actions">
        <button type="button" class="avancy-dialog-cancel">CANCEL</button>
        <button type="button" class="avancy-dialog-confirm">
          ${kind === "danger" ? "DELETE" : input ? "SUBMIT" : "CONFIRM"}
        </button>
      </div>
    `;

    box.querySelector("h2").textContent = safeTitle;
    box.querySelector("p").textContent = safeMessage;

    if (input) {
      box.querySelector(".avancy-dialog-input").value = defaultValue || "";
    }

    backdrop.appendChild(box);
    document.body.appendChild(backdrop);

    const cleanup = (value) => {
      backdrop.classList.remove("is-visible");
      setTimeout(() => backdrop.remove(), 180);
      resolve(value);
    };

    box.querySelector(".avancy-dialog-cancel").onclick = () => {
      cleanup(input ? null : false);
    };

    box.querySelector(".avancy-dialog-confirm").onclick = () => {
      if (input) {
        cleanup(box.querySelector(".avancy-dialog-input").value.trim());
      } else {
        cleanup(true);
      }
    };

    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) {
        cleanup(input ? null : false);
      }
    });

    requestAnimationFrame(() => {
      backdrop.classList.add("is-visible");

      if (input) {
        box.querySelector(".avancy-dialog-input").focus();
      }
    });
  });
}

export function avancyConfirm(message, options = {}) {
  return createDialog({
    title: options.title || "Confirm action",
    message,
    kind: options.danger ? "danger" : "confirm",
  });
}

export function avancyPrompt(message, defaultValue = "", options = {}) {
  return createDialog({
    title: options.title || "Enter information",
    message,
    input: true,
    defaultValue,
  });
}
