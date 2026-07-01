/* PETITE MOOD - ANALYTICS CON CONSENSO PREVENTIVO */

document.addEventListener("DOMContentLoaded", () => {
    const measurementId = String(
        (window.PETITE_MOOD_CONFIG || {}).googleAnalyticsId || ""
    ).trim();

    if (!/^G-[A-Z0-9]+$/i.test(measurementId)) return;

    const consentKey = "petiteMoodAnalyticsConsentV1";
    let savedConsent = null;

    try {
        savedConsent = localStorage.getItem(consentKey);
    } catch (_) {
        /* Nessun tracciamento se lo storage non è disponibile. */
    }

    const loadAnalytics = () => {
        if (document.querySelector('script[data-petite-analytics]')) return;

        window.dataLayer = window.dataLayer || [];
        window.gtag = function () {
            window.dataLayer.push(arguments);
        };
        window.gtag("js", new Date());
        window.gtag("config", measurementId, {
            anonymize_ip: true,
        });

        const script = document.createElement("script");
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
        script.dataset.petiteAnalytics = "true";
        document.head.appendChild(script);
    };

    if (savedConsent === "accepted") {
        loadAnalytics();
        return;
    }
    if (savedConsent === "rejected") return;

    const banner = document.createElement("aside");
    banner.className = "cookie-banner";
    banner.setAttribute("aria-label", "Preferenze statistiche");
    banner.innerHTML = `
        <div>
            <strong>Possiamo raccogliere statistiche anonime?</strong>
            <p>
                Ci aiutano a migliorare Petite Mood. I dati statistici vengono
                attivati soltanto se scegli “Accetta”.
                <a href="privacy.html">Scopri di più</a>.
            </p>
        </div>
        <div class="cookie-actions">
            <button type="button" data-cookie-choice="rejected">Rifiuta</button>
            <button type="button" class="cookie-accept" data-cookie-choice="accepted">Accetta</button>
        </div>
    `;
    document.body.appendChild(banner);

    banner.querySelectorAll("[data-cookie-choice]").forEach((button) => {
        button.addEventListener("click", () => {
            const choice = button.dataset.cookieChoice;
            try {
                localStorage.setItem(consentKey, choice);
            } catch (_) {
                /* La scelta resta valida per la pagina corrente. */
            }
            banner.remove();
            if (choice === "accepted") loadAnalytics();
        });
    });
});
