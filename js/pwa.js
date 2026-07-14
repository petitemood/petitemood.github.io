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
      installBox = document.createElement("aside");
      installBox.className = "pwa-install-box";
      installBox.hidden = true;
      installBox.setAttribute("aria-label", "Installa Petite Mood");
      installBox.innerHTML = `<div><strong>Porta Petite Mood sempre con te.</strong><p>Installala gratuitamente sul tuo telefono.</p></div><button type="button" class="pwa-install-button">Installa Petite Mood</button>`;
      const main = document.querySelector("main") || document.body;
      main.insertAdjacentElement("afterbegin", installBox);
    }

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredPrompt = event;
      if (!installBox) return;
      installBox.hidden = false;
      track("install_button_shown", "petiteMoodInstallButtonShownV1");
    });

    if (installBox) installBox.querySelector("button").addEventListener("click", async () => {
      if (!deferredPrompt) return;
      track("install_button_clicked");
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      track(choice.outcome === "accepted" ? "install_accepted" : "install_dismissed");
      deferredPrompt = null;
      installBox.hidden = true;
    });

    window.addEventListener("appinstalled", () => {
      safeStorage.set("petiteMoodPwaInstalledV1", "1");
      track("install_confirmed", "petiteMoodInstallConfirmedV1");
      if (installBox) installBox.hidden = true;
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
