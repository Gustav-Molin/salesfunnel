// === Konfiguration ===
const PDF_URL = "assets/resource.pdf";
const REDIRECT_AFTER_MS = 400;

// ❗️Byt till din Apps Script Web App URL (…/exec)
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwvEv6IKMqrqxY4yIXYXcYJ-apUZtxNoXUre9xJ_DwFXRO2MSuAAYfRqQdyhQh40giGdQ/exec";

// === Hjälpfunktioner ===
async function saveLead(payload) {
  // Skickar lead-data till Google Sheet via Apps Script Web App
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, referer: location.href })
  });

  // Apps Script svarar { ok: true } om allt gick bra
  let json = {};
  try { json = await res.json(); } catch (_) {}
  if (!res.ok || json.ok !== true) {
    throw new Error("Save lead error");
  }
}

async function downloadPdf(url) {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error("Kunde inte hämta PDF (" + res.status + ")");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = objectUrl;
  const filename = (url.split("/").pop() || "resource.pdf").split("?")[0];
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
}

(function () {
  const form = document.getElementById("leadForm");
  if (!form) return; // körs bara på index.html
  const msg = document.getElementById("formMsg");
  const btn = document.getElementById("submitBtn");

  function validate() {
    if (!form.checkValidity()) {
      form.reportValidity();
      return false;
    }
    return true;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validate()) return;

    msg.textContent = "";
    btn.disabled = true;
    btn.textContent = "Bearbetar…";

    const payload = {
      firstName: form.firstName.value.trim(),
      lastName:  form.lastName.value.trim(),
      email:     form.email.value.trim(),
      phone:     form.phone.value.trim(),
      consentTs: new Date().toISOString(),
      // Lägg till fler fält här om du senare har dem i formuläret
    };

    try {
      // 1) Spara i Google Sheet
      await saveLead(payload);

      // 2) Starta nedladdning utan att lämna sidan
      await downloadPdf(PDF_URL);

      msg.textContent = "Klart! Nedladdningen har startat.";

      // 3) Vidare till sida 2
      setTimeout(() => (window.location.href = "sida2.html"), REDIRECT_AFTER_MS);
    } catch (err) {
      console.error(err);
      msg.textContent = "Något gick fel. Försök igen.";
    } finally {
      btn.disabled = false;
      btn.textContent = "Skicka & ladda ner";
    }
  });
})();
