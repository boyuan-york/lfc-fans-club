import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm";

const form = document.querySelector("#contact-form");
const statusEl = document.querySelector("#form-status");
const submitBtn = document.querySelector("#submit-btn");

if (!form || !statusEl) {
  console.warn("Contact form elements not found on this page.");
} else {
  initContactForm();
}

function setStatus(message, tone) {
  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
  statusEl.hidden = false;
}

function clearStatus() {
  statusEl.textContent = "";
  delete statusEl.dataset.tone;
  statusEl.hidden = true;
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

function initContactForm() {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearStatus();

    const name = form.querySelector("#name").value.trim();
    const email = form.querySelector("#email").value.trim();
    const message = form.querySelector("#message").value.trim();

    if (!name || !email || !message) {
      setStatus("Please fill in all fields.", "error");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      setStatus("Please enter a valid email address.", "error");
      return;
    }

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

    const { error } = await supabase.from("contact_messages").insert({
      name,
      email,
      message,
    });

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

    setStatus("Thank you, your message has been sent.", "success");
    form.reset();
  });
}
