// ====================
//  Scandic Books Funnel - script.js
// ====================

// ---- Konfiguration ----
const PDF_URL = "assets/resource.pdf";  // ändra om din pdf heter/ligger annat
const REDIRECT_AFTER_MS = 400;          // hur snabbt vi går till sida 2 efter nedladdning
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbyU4uHrSeaoaI6vWOEAk0uYzVSciVPwiO1zQPWFLlTzlY66NVOHRi-x2YPZLTPBJGbfHQ/exec"; // t.ex. https://script.google.com/macros/s/.../exec


async function saveLead(payload) {
  if (!WEBHOOK_URL) return;

  // Försök med Beacon (triggar inte CORS, funkar även vid redirect)
  try {
    if (navigator.sendBeacon) {
      const data = new URLSearchParams({ ...payload, referer: location.href }).toString();
      const blob = new Blob([data], { type: "application/x-www-form-urlencoded" });
      const ok = navigator.sendBeacon(WEBHOOK_URL, blob);
      if (ok) return; // klart!
    }
  } catch (_) {}

  // Fallback: FormData + no-cors (vi läser inte svaret – Apps Script tar emot ändå)
  const fd = new FormData();
  Object.entries({ ...payload, referer: location.href }).forEach(([k, v]) => fd.append(k, v));
  await fetch(WEBHOOK_URL, { method: "POST", mode: "no-cors", body: fd });
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
  // --- Klientvalidering ---
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com","10minutemail.com","tempmail.com","guerrillamail.com","yopmail.com",
  "dispostable.com","sharklasers.com","trashmail.com","fakeinbox.com"
]);

function isValidName(s) {
  if (!s) return false;
  const t = s.trim();
  if (t.length < 2) return false;                   // minst 2 tecken
  if (/[^a-zA-ZåäöÅÄÖéèêáíóúüç ñ'-]/.test(t)) return false; // bara bokstäver, mellanslag, bindestreck, apostrof
  if (/^\w$/.test(t)) return false;                 // enstaka bokstav/initial
  if (t === "." || t === "-") return false;
  return true;
}

function isValidEmail(email) {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  // rimlig e-post-regex
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
  if (!ok) return false;
  const domain = e.split("@")[1];
  if (DISPOSABLE_DOMAINS.has(domain)) return false; // blocka engångsdomäner
  return true;
}

function normalizePhone(raw) {
  const d = raw.replace(/[^\d+]/g, "");
  // Tillåt ledande +, annars bara siffror
  return d;
}

function isValidPhone(raw) {
  const p = normalizePhone(raw);
  // enkel E.164-lik: +?[7–15 siffror]
  if (!/^\+?\d{8,15}$/.test(p)) return false;
  // enkla skräpfilter: inte bara samma siffra, inte 000...
  if (/^(\+)?([0-9])\2{6,}$/.test(p)) return false;
  return true;
}

// anti-bot: kräver att minst 3 sek gått sedan sidan laddades
const pageLoadedAt = Date.now();

function validateClient(form, msgEl) {
  const first = form.firstName.value;
  const last  = form.lastName.value;
  const email = form.email.value;
  const phone = form.phone.value;

  // honeypot
  if (form.company && form.company.value.trim() !== "") {
    msgEl.textContent = "Ogiltig inlämning.";
    return false;
  }
  // minimalt tidsspann
  if (Date.now() - pageLoadedAt < 3000) {
    msgEl.textContent = "Vänta ett ögonblick och försök igen.";
    return false;
  }

  if (!isValidName(first)) { msgEl.textContent = "Ange ett riktigt förnamn."; return false; }
  if (!isValidName(last))  { msgEl.textContent = "Ange ett riktigt efternamn."; return false; }
  if (!isValidEmail(email)) { msgEl.textContent = "Ange en giltig e-postadress (inga engångsmejl)."; return false; }
  if (!isValidPhone(phone)) { msgEl.textContent = "Ange ett giltigt telefonnummer (8–15 siffror, ev. +)."; return false; }

  // normalisera telefon innan vi skickar
  form.phone.value = normalizePhone(phone);
  return true;
}


form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validateClient(form, msg)) return;

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
