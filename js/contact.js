import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm";

const form = document.querySelector("#contact-form");
const statusEl = document.querySelector("#form-status");
const submitBtn = document.querySelector("#submit-btn");

const fields = {
  name: {
    input: form?.querySelector("#name"),
    error: form?.querySelector("#name-error"),
  },
  email: {
    input: form?.querySelector("#email"),
    error: form?.querySelector("#email-error"),
  },
  message: {
    input: form?.querySelector("#message"),
    error: form?.querySelector("#message-error"),
  },
};

if (!form || !statusEl) {
  console.warn("Contact form elements not found on this page.");
} else {
  initContactForm();
}

function setStatus(message, tone) {
  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
  statusEl.hidden = false;
  statusEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function clearStatus() {
  statusEl.textContent = "";
  delete statusEl.dataset.tone;
  statusEl.hidden = true;
}

function clearFieldErrors() {
  Object.values(fields).forEach(({ input, error }) => {
    if (!input || !error) return;
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-describedby");
    error.textContent = "";
    error.hidden = true;
    input.closest(".field")?.classList.remove("field--invalid");
  });
}

function setFieldError(key, message) {
  const { input, error } = fields[key];
  if (!input || !error) return;

  input.setAttribute("aria-invalid", "true");
  input.setAttribute("aria-describedby", error.id);
  error.textContent = message;
  error.hidden = false;
  input.closest(".field")?.classList.add("field--invalid");
}

async function loadConfig() {
  try {
    const config = await import("./config.js");
    if (
      !config.SUPABASE_URL ||
      !config.SUPABASE_ANON_KEY ||
      config.SUPABASE_URL.includes("YOUR_PROJECT")
    ) {
      return null;
    }
    return config;
  } catch {
    return null;
  }
}

function validateForm() {
  clearFieldErrors();
  clearStatus();

  const name = fields.name.input.value.trim();
  const email = fields.email.input.value.trim();
  const message = fields.message.input.value.trim();

  if (!name) {
    setFieldError("name", "Please enter your name.");
    setStatus("Please fix the errors below.", "error");
    fields.name.input.focus();
    return false;
  }

  if (!email) {
    setFieldError("email", "Please enter your email address.");
    setStatus("Please fix the errors below.", "error");
    fields.email.input.focus();
    return false;
  }

  if (!email.includes("@") || !email.includes(".")) {
    setFieldError("email", "Please enter a valid email address.");
    setStatus("Please fix the errors below.", "error");
    fields.email.input.focus();
    return false;
  }

  if (!message) {
    setFieldError("message", "Please enter a message.");
    setStatus("Please fix the errors below.", "error");
    fields.message.input.focus();
    return false;
  }

  return { name, email, message };
}

function initContactForm() {
  Object.values(fields).forEach(({ input }) => {
    input?.addEventListener("input", () => {
      const key = input.id;
      if (fields[key]?.error?.textContent) {
        const { error } = fields[key];
        if (input.value.trim()) {
          input.removeAttribute("aria-invalid");
          error.textContent = "";
          error.hidden = true;
          input.closest(".field")?.classList.remove("field--invalid");
        }
      }
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const values = validateForm();
    if (!values) return;

    const config = await loadConfig();
    if (!config) {
      setStatus(
        "Supabase is not configured yet. Copy js/config.example.js to js/config.js and add your keys. See references/SUPABASE_SETUP.md.",
        "info"
      );
      return;
    }

    const supabaseUrl = config.SUPABASE_URL.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
    const supabase = createClient(supabaseUrl, config.SUPABASE_ANON_KEY);

    submitBtn.disabled = true;
    setStatus("Sending…", "info");

    const { error } = await supabase.from("contact_messages").insert(values);

    submitBtn.disabled = false;

    if (error) {
      console.error("Supabase insert failed:", error);
      const hint =
        error.code === "PGRST205" || error.message?.includes("404")
          ? " Table not found — run the SQL in references/SUPABASE_SETUP.md."
          : "";
      setStatus(
        `Something went wrong: ${error.message || "Unknown error"}.${hint}`,
        "error"
      );
      return;
    }

    clearFieldErrors();
    setStatus("Thank you, your message has been sent.", "success");
    form.reset();
  });
}
