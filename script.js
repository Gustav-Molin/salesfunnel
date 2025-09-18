// ====================
//  Scandic Books Funnel - script.js
// ====================

// ---- Konfiguration ----
const PDF_URL = "assets/resource.pdf";  // ändra om din pdf heter/ligger annat
const REDIRECT_AFTER_MS = 400;          // hur snabbt vi går till sida 2 efter nedladdning
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwvEv6IKMqrqxY4yIXYXcYJ-apUZtxNoXUre9xJ_DwFXRO2MSuAAYfRqQdyhQh40giGdQ/exec"; // t.ex. https://script.google.com/macros/s/.../exec

// ---- Hjälpfunktioner ----

// Skicka lead till Google Sheets via Apps Script (form-encoded => ingen CORS-preflight)
async function saveLead(payload) {
  if (!WEBHOOK_URL || WEBHOOK_URL.includes("DIN_APPS_SCRIPT_EXEC_URL_HÄR")) {
    console.warn("WEBHOOK_URL saknas eller är inte uppsatt ännu. Hoppar över saveLead.");
    return; // gör inget, men låt flödet fortsätta
  }

  const params = new URLSearchParams({
    ...payload,
    referer: location.href
  });

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    body: params
    // Viktigt: sätt INTE Content-Type manuellt -> 'application/x-www-form-urlencoded' sätts automatiskt
  });

  // Apps Script svarar JSON { ok: true } vid lyckad loggning
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch (_) {}

  if (!res.ok || json.ok !== true) {
    throw new Error(`Save lead error (status ${res.status}): ${text}`);
  }
}

// Hämta och trigga lokal nedladdning av PDF utan att navigera till filen
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

// ---- Init (körs på index.html där formuläret finns) ----
(function () {
  const form = document.getElementById("leadForm");
  if (!form) return; // endast på sida 1

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

    // Plocka fältvärden
    const payload = {
      firstName: form.firstName?.value?.trim() || "",
      lastName:  form.lastName?.value?.trim()  || "",
      email:     form.email?.value?.trim()     || "",
      phone:     form.phone?.value?.trim()     || "",
      consentTs: new Date().toISOString(),
      // Lägg till fler fält här om du senare utökar formuläret
    };

    try {
      // 1) Försök spara lead (fortsätt ändå om det fallerar)
      try {
        await saveLead(payload);
      } catch (saveErr) {
        console.warn("Kunde inte spara lead:", saveErr);
        msg.textContent = "Obs: uppgifterna sparades inte, fortsätter…";
      }

      // 2) Starta nedladdning
      await downloadPdf(PDF_URL);
      msg.textContent = "Klart! Nedladdningen har startat.";

      // 3) Redirect till sida 2
      setTimeout(() => (window.location.href = "sida2.html"), REDIRECT_AFTER_MS);

    } catch (err) {
      console.error(err);
      msg.textContent = "Något gick fel. Kontrollera uppkoppling och försök igen.";
    } finally {
      btn.disabled = false;
      btn.textContent = "Skicka & ladda ner";
    }
  });
})();
