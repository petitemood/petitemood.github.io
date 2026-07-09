/* ==========================================
   PETITE MOOD
   SCRIPT 2.0
========================================== */

document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector("header");
    const nav = document.querySelector("nav");
    const menuToggle = document.getElementById("menu-toggle");
    const sections = document.querySelectorAll("section");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* HEADER DINAMICO */

    const updateHeader = () => {
        if (!header) return;

        const hasScrolled = window.scrollY > 40;

        header.style.background = hasScrolled
            ? "rgba(255,255,255,.98)"
            : "rgba(255,255,255,.92)";

        header.style.boxShadow = hasScrolled
            ? "0 10px 30px rgba(0,0,0,.08)"
            : "0 8px 30px rgba(0,0,0,.05)";
    };

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });

    /* ANIMAZIONE DELLE SEZIONI */

    if (!reducedMotion && "IntersectionObserver" in window && sections.length > 0) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;

                    entry.target.classList.add("show");
                    observer.unobserve(entry.target);
                });
            },
            {
                threshold: 0.12,
                rootMargin: "0px 0px -35px 0px",
            }
        );

        sections.forEach((section) => {
            section.classList.add("hidden");
            observer.observe(section);
        });
    } else {
        sections.forEach((section) => section.classList.add("show"));
    }

    /* MENU MOBILE */

    const closeMenu = () => {
        if (!nav || !menuToggle) return;

        nav.classList.remove("active");
        menuToggle.setAttribute("aria-expanded", "false");
    };

    const toggleMenu = () => {
        if (!nav || !menuToggle) return;

        const isOpen = nav.classList.toggle("active");
        menuToggle.setAttribute("aria-expanded", String(isOpen));
    };

    if (menuToggle && nav) {
        menuToggle.setAttribute("role", "button");
        menuToggle.setAttribute("tabindex", "0");
        menuToggle.setAttribute("aria-label", "Apri o chiudi il menu");
        menuToggle.setAttribute("aria-controls", "main-navigation");
        menuToggle.setAttribute("aria-expanded", "false");
        nav.id = nav.id || "main-navigation";

        menuToggle.addEventListener("click", toggleMenu);

        menuToggle.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;

            event.preventDefault();
            toggleMenu();
        });

        document.addEventListener("click", (event) => {
            if (!nav.classList.contains("active")) return;
            if (nav.contains(event.target) || menuToggle.contains(event.target)) return;

            closeMenu();
        });

        document.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") return;

            closeMenu();
            menuToggle.focus();
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth > 1180) closeMenu();
        });
    }

    /* LINK INTERNI E SCROLL FLUIDO */

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener("click", (event) => {
            const targetId = anchor.getAttribute("href");

            closeMenu();

            if (targetId === "#") {
                event.preventDefault();
                window.scrollTo({
                    top: 0,
                    behavior: reducedMotion ? "auto" : "smooth",
                });
                return;
            }

            const target = document.querySelector(targetId);
            if (!target) return;

            event.preventDefault();
            target.scrollIntoView({
                behavior: reducedMotion ? "auto" : "smooth",
                block: "start",
            });
        });
    });

    /* SICUREZZA DEI LINK ESTERNI */

    document.querySelectorAll('a[target="_blank"]').forEach((link) => {
        link.setAttribute("rel", "noopener noreferrer");
    });

       /* DATABASE, CONTATORI E NEWSLETTER */

    const petiteConfig = window.PETITE_MOOD_CONFIG || {
        supabaseUrl: "https://sortfvzxjcxuvhexkqeg.supabase.co",
        supabasePublishableKey: "sb_publishable_8-7p1KGq-d-j5XyimMSWDQ_Q4xUkNQW",
    };
    const supabaseUrl = String(petiteConfig.supabaseUrl || "").replace(/\/+$/, "");
    const supabaseKey = String(petiteConfig.supabasePublishableKey || "");
    const databaseReady = supabaseUrl.startsWith("https://") && supabaseKey.length > 20;

    const supabaseRequest = async (path, options = {}) => {
        if (!databaseReady) throw new Error("database_not_configured");

        return fetch(`${supabaseUrl}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                "apikey": supabaseKey,
                "Authorization": `Bearer ${supabaseKey}`,
                ...(options.headers || {}),
            },
        });
    };

    const formatNumber = (value) => {
        const number = Number(value);
        if (!Number.isFinite(number) || number <= 0) return "Stiamo crescendo";
        return new Intl.NumberFormat("it-IT").format(number);
    };

    const setStatValue = (selectors, value, suffix = "") => {
        const formattedNumber = formatNumber(value);
        const formattedValue = formattedNumber === "Stiamo crescendo"
            ? formattedNumber
            : `${formattedNumber}${suffix}`;

        selectors.forEach((selector) => {
            document.querySelectorAll(selector).forEach((element) => {
                element.textContent = formattedValue;
                element.classList.toggle("stat-placeholder", formattedValue === "Stiamo crescendo");
            });
        });
    };

    const loadPublicStats = async () => {
        if (!databaseReady) return;

        try {
            const response = await supabaseRequest(
                "/rest/v1/site_stats?select=instagram_followers,tiktok_followers,questionnaire_count&id=eq.1",
                {
                    method: "GET",
                }
            );

            if (!response.ok) return;

            const rows = await response.json();
            const stats = Array.isArray(rows) ? rows[0] : null;
            if (!stats) return;

            setStatValue(
                ['[data-stat="instagram"]', '[data-stat="instagram_followers"]'],
                stats.instagram_followers,
                "+"
            );

            setStatValue(
                ['[data-stat="tiktok"]', '[data-stat="tiktok_followers"]'],
                stats.tiktok_followers,
                "+"
            );

            setStatValue(
                ['[data-stat="questionnaires"]', '[data-stat="questionnaire_count"]', '[data-stat="questionari"]'],
                stats.questionnaire_count
            );

            try {
                const membersResponse = await supabaseRequest(
                    "/rest/v1/site_stats?select=members_count,newsletter_count&id=eq.1",
                    {
                        method: "GET",
                    }
                );

                if (membersResponse.ok) {
                    const memberRows = await membersResponse.json();
                    const memberStats = Array.isArray(memberRows) ? memberRows[0] : null;
                    const membersCount = Math.max(
                        Number(memberStats?.members_count || 0),
                        Number(memberStats?.newsletter_count || 0)
                    );

                    if (Number.isFinite(membersCount)) {
                        setStatValue(
                            ['[data-stat="members"]', '[data-stat="members_count"]', '[data-stat="newsletter_count"]'],
                            membersCount
                        );
                    }
                }
            } catch (_) {
                /* Il quarto contatore resta opzionale finché Supabase non espone il campo. */
            }
            try {
                const visitsResponse = await supabaseRequest(
                    "/rest/v1/site_stats?select=site_visit_count&id=eq.1",
                    {
                        method: "GET",
                    }
                );

                if (visitsResponse.ok) {
                    const visitRows = await visitsResponse.json();
                    const visitStats = Array.isArray(visitRows) ? visitRows[0] : null;

                    if (visitStats?.site_visit_count !== undefined && visitStats?.site_visit_count !== null) {
                        setStatValue(
                            ['[data-stat="visits"]', '[data-stat="site_visit_count"]'],
                            visitStats.site_visit_count
                        );
                    }
                }
            } catch (_) {
                /* Il contatore visite resta a 0 finche' Supabase non espone il campo. */
            }
        } catch (error) {
            console.warn("Contatori Petite Mood non disponibili:", error);
        }
    };

    const newsletterForm = document.getElementById("newsletter-form");
    const newsletterStatus = document.getElementById("newsletter-status");
    let isNewsletterSubmitting = false;

    if (newsletterForm && newsletterStatus) {
        newsletterForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (isNewsletterSubmitting) return;
            newsletterStatus.className = "newsletter-status";

            if (!newsletterForm.checkValidity()) {
                newsletterForm.reportValidity();
                return;
            }

            if (!databaseReady) {
                newsletterStatus.textContent =
                    "L'iscrizione sarà disponibile a breve: stiamo completando il collegamento.";
                newsletterStatus.classList.add("is-error");
                return;
            }

            const email = newsletterForm.elements.email.value.trim().toLowerCase();
            const submitButton = newsletterForm.querySelector('button[type="submit"]');
            isNewsletterSubmitting = true;
            submitButton.disabled = true;
            submitButton.textContent = "Salvataggio...";
            let timeoutId;

            try {
                const controller = new AbortController();
                timeoutId = window.setTimeout(() => controller.abort(), 12000);
                const response = await supabaseRequest("/rest/v1/rpc/subscribe_newsletter", {
                    method: "POST",
                    signal: controller.signal,
                    body: JSON.stringify({
                        p_email: email,
                        p_source: "website_newsletter",
                    }),
                });

                if (!response.ok) throw new Error(`newsletter_${response.status}`);

                newsletterForm.reset();
                newsletterStatus.textContent =
                    "Perfetto! Ti aggiorneremo sulle novità Petite Mood 💕";
                newsletterStatus.classList.add("is-success");
                loadPublicStats();
            } catch (error) {
                console.error("Newsletter Petite Mood:", error);
                newsletterStatus.textContent =
                    "Non siamo riusciti a salvare la tua email. Riprova tra poco.";
                newsletterStatus.classList.add("is-error");
            } finally {
                if (timeoutId) window.clearTimeout(timeoutId);
                isNewsletterSubmitting = false;
                submitButton.disabled = false;
                submitButton.textContent = "Resta nel mood";
            }
        });
    }

    const trackSiteVisit = async () => {
        if (!databaseReady) return;

        const storageKey = "petiteMoodVisitTracked";

        try {
            if (sessionStorage.getItem(storageKey) === "true") return;
            sessionStorage.setItem(storageKey, "true");
        } catch (_) {
            /* Se lo storage non e' disponibile, contiamo comunque la visita. */
        }

        try {
            const response = await supabaseRequest("/rest/v1/rpc/track_site_visit", {
                method: "POST",
                body: JSON.stringify({
                    p_path: window.location.pathname || "/",
                }),
            });

            if (response.ok) loadPublicStats();
        } catch (error) {
            console.warn("Visite Petite Mood non disponibili:", error);
        }
    };

    loadPublicStats();
    trackSiteVisit();
    console.log("✅ Petite Mood 2.0 caricato");
});
