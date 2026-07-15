/* PETITE MOOD - ANALYTICS CON CONSENSO PREVENTIVO */

document.addEventListener("DOMContentLoaded", () => {
    const isEnglish = document.documentElement.lang.toLowerCase().startsWith("en");
    const language = isEnglish ? "en" : "it";
    const pagePath = window.location.pathname.replace(/\/+$/, "") || "/";
    const pageSlug = pagePath.split("/").filter(Boolean).pop() || "home";
    const isGuide = Boolean(document.querySelector(".article-body"));
    const pageType = isGuide
        ? "guide"
        : pageSlug === "home" || pageSlug === "index.html"
          ? "homepage"
          : pageSlug.replace(/\.html$/i, "").replace(/[^a-z0-9_-]/gi, "_");
    const contentGroup = isGuide
        ? `Guide ${language.toUpperCase()}`
        : `Pagine ${language.toUpperCase()}`;
    const copy = isEnglish
        ? {
              label: "Analytics preferences",
              title: "May we collect anonymous statistics?",
              text: "They help us improve Petite Mood. Analytics are activated only if you choose ‘Accept’.",
              more: "Learn more",
              reject: "Reject",
              accept: "Accept",
              privacy: "privacy.html",
          }
        : {
              label: "Preferenze statistiche",
              title: "Possiamo raccogliere statistiche anonime?",
              text: "Ci aiutano a migliorare Petite Mood. I dati statistici vengono attivati soltanto se scegli ‘Accetta’.",
              more: "Scopri di più",
              reject: "Rifiuta",
              accept: "Accetta",
              privacy: "privacy.html",
          };
    const measurementId = String(
        (window.PETITE_MOOD_CONFIG || {}).googleAnalyticsId || ""
    ).trim();

    if (!/^G-[A-Z0-9]+$/i.test(measurementId)) return;

    const consentKey = "petiteMoodAnalyticsConsentV1";
    let savedConsent = null;

    const track = (eventName, parameters = {}) => {
        if (typeof window.gtag !== "function") return false;
        window.gtag("event", eventName, {
            content_group: contentGroup,
            content_language: language,
            page_type: pageType,
            ...parameters,
        });
        return true;
    };

    window.PetiteMoodAnalytics = {
        track,
        context: {
            contentGroup,
            language,
            pageSlug: pageSlug.replace(/\.html$/i, ""),
            pageType,
        },
    };

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
            content_group: contentGroup,
            content_language: language,
            page_type: pageType,
        });

        if (isGuide) {
            track("guide_view", {
                guide_slug: pageSlug.replace(/\.html$/i, ""),
                guide_title: document.querySelector("h1")?.textContent.trim() || document.title,
            });
        }
        if (pageType === "404") {
            track("page_not_found");
        }

        const reachedScrollDepths = new Set();
        let scrollScheduled = false;
        const measureScrollDepth = () => {
            scrollScheduled = false;
            const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (scrollableHeight <= 0) return;

            const percentage = Math.min(
                100,
                Math.round((window.scrollY / scrollableHeight) * 100)
            );

            [25, 50, 75].forEach((threshold) => {
                if (percentage < threshold || reachedScrollDepths.has(threshold)) return;
                reachedScrollDepths.add(threshold);
                track("content_scroll", { percent_scrolled: threshold });
            });
        };

        window.addEventListener(
            "scroll",
            () => {
                if (scrollScheduled) return;
                scrollScheduled = true;
                window.requestAnimationFrame(measureScrollDepth);
            },
            { passive: true }
        );

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
    banner.setAttribute("aria-label", copy.label);
    banner.innerHTML = `
        <div>
            <strong>${copy.title}</strong>
            <p>
                ${copy.text}
                <a href="${copy.privacy}">${copy.more}</a>.
            </p>
        </div>
        <div class="cookie-actions">
            <button type="button" data-cookie-choice="rejected">${copy.reject}</button>
            <button type="button" class="cookie-accept" data-cookie-choice="accepted">${copy.accept}</button>
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
