/* PETITE MOOD - PWA, installazione e statistiche anonime */
(function () {
  "use strict";

  const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

  window.PetiteMoodPWA = Object.freeze({ isStandalone });

  const safeStorage = {
    get(key) { try { return localStorage.getItem(key); } catch (_) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }
  };
  const randomId = () => {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
      const value = Math.floor(Math.random() * 16);
      return (character === "x" ? value : (value & 3) | 8).toString(16);
    });
  };
  const sessionId = safeStorage.get("petiteMoodPwaAnonymousIdV1") || randomId();
  safeStorage.set("petiteMoodPwaAnonymousIdV1", sessionId);

  const deviceType = () => /Android/i.test(navigator.userAgent) ? "android" : /iPhone|iPad|iPod/i.test(navigator.userAgent) ? "ios" : "desktop";
  const browserName = () => {
    const ua = navigator.userAgent;
    if (/SamsungBrowser/i.test(ua)) return "samsung_internet";
    if (/Edg/i.test(ua)) return "edge";
    if (/CriOS|Chrome/i.test(ua)) return "chrome";
    if (/Safari/i.test(ua)) return "safari";
    return "other";
  };

  const sentThisPage = new Set();
  async function track(eventType, onceKey) {
    if (sentThisPage.has(eventType)) return;
    if (onceKey && safeStorage.get(onceKey)) return;
    sentThisPage.add(eventType);

    const config = window.PETITE_MOOD_CONFIG || {};
    const base = String(config.supabaseUrl || "").replace(/\/+$/, "");
    const key = String(config.supabasePublishableKey || "");
    if (!base.startsWith("https://") || key.length < 20) return;

    try {
      const response = await fetch(`${base}/rest/v1/pwa_events`, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}`, Prefer: "return=minimal" },
        body: JSON.stringify({
          event_type: eventType,
          session_id: sessionId,
          device_type: deviceType(),
          browser: browserName(),
          is_standalone: isStandalone(),
          page_path: location.pathname.slice(0, 300)
        })
      });
      if (response.ok && onceKey) safeStorage.set(onceKey, "1");
    } catch (_) {
      /* Le statistiche non devono mai interferire con il sito. */
    }
  }
  window.PetiteMoodPWA.track = track;

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/service-worker.js", { scope: "/" }).catch(() => {}));
  }

  document.addEventListener("DOMContentLoaded", () => {
    const standalone = isStandalone();
    document.documentElement.classList.toggle("is-pwa", standalone);
    if (standalone) {
      const firstKey = "petiteMoodPwaFirstOpenTrackedV1";
      if (safeStorage.get(firstKey)) track("pwa_open");
      else track("pwa_first_open", firstKey);
    }

    let deferredPrompt = null;
    const isHome = /\/(?:index\.html)?$/.test(location.pathname);
    const installed = standalone || safeStorage.get("petiteMoodPwaInstalledV1") === "1";
    let installBox = null;

    if (isHome && !installed) {
      installBox = document.createElement("section");
      installBox.className = "pwa-download-section";
      installBox.setAttribute("aria-label", "Installa Petite Mood");
      installBox.innerHTML = `
        <div class="pwa-download-inner">
          <div class="pwa-download-heading">
            <span class="pwa-download-kicker">UN MESSAGGIO PER LE NOSTRE PETITE GIRL 💗</span>
            <h2>Lo sapevi che puoi scaricare l’app Petite Mood?</h2>
            <p>Aggiungila gratuitamente al tuo telefono e porta il mondo Petite Mood sempre con te, senza cercare ogni volta il sito.</p>
            <ul class="pwa-benefits" aria-label="Vantaggi dell'app Petite Mood">
              <li>Accesso veloce dalla schermata Home</li>
              <li>Esperienza a tutto schermo, proprio come un’app</li>
              <li>Gratuita</li>
              <li>Guide e novità sempre aggiornate</li>
            </ul>
          </div>
          <div class="pwa-download-grid">
            <article class="pwa-download-card pwa-android-card">
              <span class="pwa-device-icon" aria-hidden="true">🤖</span>
              <h3>Hai Android?</h3>
              <p>Apri Petite Mood con Chrome, Samsung Internet o Edge e premi il pulsante qui sotto.</p>
              <button type="button" class="pwa-install-button">Scarica l’app Petite Mood</button>
              <p class="pwa-install-help" role="status" aria-live="polite" hidden></p>
              <small>Se il pulsante non compare, premi il menu <strong>⋮</strong> del browser e scegli <strong>Installa app</strong> oppure <strong>Aggiungi a schermata Home</strong>.</small>
            </article>
            <article class="pwa-download-card pwa-apple-card">
              <span class="pwa-device-icon" aria-hidden="true"></span>
              <h3>Hai un iPhone o iPad?</h3>
              <p>Con Apple bastano tre semplici passaggi per avere Petite Mood tra le tue app.</p>
              <ol><li>Apri Safari</li><li>Premi Condividi</li><li>Scegli “Aggiungi alla schermata Home”</li></ol>
            </article>
          </div>
        </div>`;
      const main = document.querySelector("main") || document.body;
      const hero = document.querySelector(".hero");
      if (hero) hero.insertAdjacentElement("afterend", installBox);
      else main.insertAdjacentElement("afterbegin", installBox);
    }

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredPrompt = event;
      if (!installBox) return;
      const installButton = installBox.querySelector(".pwa-install-button");
      if (installButton) installButton.dataset.installReady = "true";
      track("install_button_shown", "petiteMoodInstallButtonShownV1");
    });

    if (installBox) installBox.querySelector(".pwa-install-button").addEventListener("click", async () => {
      track("install_button_clicked");
      if (!deferredPrompt) {
        const help = installBox.querySelector(".pwa-install-help");
        const isAppleDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        help.textContent = isAppleDevice
          ? "Su iPhone o iPad: apri Petite Mood in Safari, premi Condividi e scegli Aggiungi alla schermata Home."
          : "Se non si apre la finestra automatica, premi il menu ⋮ del browser e scegli Installa app oppure Aggiungi a schermata Home.";
        help.hidden = false;
        const targetCard = isAppleDevice
          ? installBox.querySelector(".pwa-apple-card")
          : installBox.querySelector(".pwa-android-card");
        if (targetCard) targetCard.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      track(choice.outcome === "accepted" ? "install_accepted" : "install_dismissed");
      deferredPrompt = null;
      installBox.querySelector(".pwa-install-button").removeAttribute("data-install-ready");
    });

    window.addEventListener("appinstalled", () => {
      safeStorage.set("petiteMoodPwaInstalledV1", "1");
      track("install_confirmed", "petiteMoodInstallConfirmedV1");
      if (installBox) installBox.remove();
    });

    const isiOSSafari = /iPhone|iPad|iPod/i.test(navigator.userAgent) && /Safari/i.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/i.test(navigator.userAgent);
    if (isiOSSafari && !standalone && !safeStorage.get("petiteMoodIosInstallHintClosedV1")) {
      const hint = document.createElement("aside");
      hint.className = "pwa-ios-hint";
      hint.setAttribute("role", "status");
      hint.innerHTML = `<span>Per installare Petite Mood: premi <strong>Condividi</strong> e poi <strong>Aggiungi alla schermata Home</strong>.</span><button type="button" aria-label="Chiudi">×</button>`;
      document.body.appendChild(hint);
      hint.querySelector("button").addEventListener("click", () => {
        safeStorage.set("petiteMoodIosInstallHintClosedV1", "1");
        hint.remove();
      });
    }
  });
})();
