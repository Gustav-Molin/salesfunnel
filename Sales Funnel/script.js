// === Konfiguration ===
// Om du lägger din PDF i assets/resource.pdf behöver du inte ändra detta.
const PDF_URL = "assets/resource.pdf";

// Ändra vid behov – hur snabbt vi går vidare till sida 2 efter att nedladdningen startat
const REDIRECT_AFTER_MS = 400; // ms

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

  async function downloadPdf(url) {
    // Viktigt: hosta PDF:en på samma domän för att undvika CORS-problem
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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validate()) return;

    msg.textContent = "";
    btn.disabled = true;
    btn.textContent = "Bearbetar…";

    // Här kan du spara leaden om du vill (skicka till API/Sheets/HubSpot etc.)
    const payload = {
      firstName: form.firstName.value.trim(),
      lastName: form.lastName.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      consentTs: new Date().toISOString(),
    };
    // console.log("Lead payload", payload);

    try {
      await downloadPdf(PDF_URL);
      msg.textContent = "Klart! Nedladdningen har startat.";
      // Gå vidare till sida 2 strax efter att nedladdningen triggas
      setTimeout(() => (window.location.href = "sida2.html"), REDIRECT_AFTER_MS);
    } catch (err) {
      console.error(err);
      msg.textContent = "Något gick fel. Försök igen.";
      btn.disabled = false;
      btn.textContent = "Skicka & ladda ner";
      return;
    }
  });
})();
