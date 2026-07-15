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
    const isEnglish = document.documentElement.lang.toLowerCase().startsWith("en");

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
        /* Icona unica su tutte le pagine, indipendente dalla codifica HTML. */
        menuToggle.innerHTML = '<span class="menu-toggle-icon" aria-hidden="true"><span></span><span></span><span></span></span>';
        menuToggle.setAttribute("role", "button");
        menuToggle.setAttribute("tabindex", "0");
        menuToggle.setAttribute(
            "aria-label",
            isEnglish ? "Open or close menu" : "Apri o chiudi il menu"
        );
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

    const petiteConfig = window.PETITE_MOOD_CONFIG || {};
    const supabaseUrl = String(petiteConfig.supabaseUrl || "").replace(/\/+$/, "");
    const supabaseKey = String(petiteConfig.supabasePublishableKey || "");
    const databaseReady = supabaseUrl.startsWith("https://") && supabaseKey.length > 20;
    const emailFunctionUrl = `${supabaseUrl}/functions/v1/send-confirmation-email`;

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

    const loadPublicStats = async () => {
        if (!databaseReady) return;

        try {
            const response = await supabaseRequest(
                "/rest/v1/site_stats?select=instagram_followers,tiktok_followers,questionnaire_count,members_count&id=eq.1"
            );

            if (!response.ok) return;
            const [stats = {}] = await response.json();

            const statFields = {
                instagram: "instagram_followers",
                tiktok: "tiktok_followers",
                questionnaires: "questionnaire_count",
                members: "members_count",
            };

            Object.entries(statFields).forEach(([name, field]) => {
                const element = document.querySelector(`[data-stat="${name}"]`);
                const value = Number(stats[field]);
                if (element && Number.isFinite(value)) {
                    element.textContent = name === "instagram" || name === "tiktok"
                        ? `${value}+`
                        : String(value);
                }
            });
        } catch (error) {
            console.warn("Contatori Petite Mood non disponibili:", error);
        }
    };

    const newsletterForm = document.getElementById("newsletter-form");
    const newsletterStatus = document.getElementById("newsletter-status");

    if (newsletterForm && newsletterStatus) {
        newsletterForm.addEventListener("submit", async (event) => {
            event.preventDefault();
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
            submitButton.disabled = true;
            submitButton.textContent = "Iscrizione…";

            try {
                const response = await supabaseRequest("/rest/v1/rpc/subscribe_newsletter", {
                    method: "POST",
                    body: JSON.stringify({
                        p_email: email,
                        p_source: "website_newsletter",
                    }),
                });

                if (!response.ok) throw new Error(`newsletter_${response.status}`);

                const emailResponse = await fetch(emailFunctionUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": supabaseKey,
                        "Authorization": `Bearer ${supabaseKey}`,
                    },
                    body: JSON.stringify({
                        kind: "newsletter",
                        email,
                    }),
                });

                if (!emailResponse.ok) {
                    console.warn("Petite Mood newsletter: email di benvenuto non disponibile.");
                }

                newsletterForm.reset();
                newsletterStatus.textContent =
                    "Benvenuta nel Petite Club! Iscrizione completata 💖";
                newsletterStatus.classList.add("is-success");
                if (typeof window.gtag === "function") {
                    window.gtag("event", "newsletter_signup");
                }
                loadPublicStats();
            } catch (error) {
                console.error("Newsletter Petite Mood:", error);
                newsletterStatus.textContent =
                    "Non siamo riusciti a completare l'iscrizione. Riprova tra poco.";
                newsletterStatus.classList.add("is-error");
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = "Iscriviti";
            }
        });
    }

    loadPublicStats();

    /* Eventi GA4: attivi soltanto dopo consenso e configurazione. */
    document.addEventListener("click", (event) => {
        const link = event.target.closest("a,button");
        if (!link || typeof window.gtag !== "function") return;
        const href = String(link.getAttribute("href") || "");
        let eventName = link.dataset.track || "";
        let socialPlatform = "";
        if (href.includes("instagram.com")) socialPlatform = "instagram";
        if (href.includes("tiktok.com")) socialPlatform = "tiktok";
        if (href.includes("facebook.com")) socialPlatform = "facebook";
        if (eventName === "weekly_poll_click" || eventName === "weekly_poll_en_click") {
            eventName = "weekly_poll_open";
        }
        if (!eventName && href.includes("questionario")) eventName = "questionnaire_start_click";
        if (!eventName && socialPlatform) eventName = "social_follow_click";
        if (!eventName && href.endsWith(".pdf")) eventName = "free_guide_download";
        if (!eventName) return;

        const linkLocation = link.closest("header")
            ? "header"
            : link.closest("footer")
              ? "footer"
              : link.closest(".article-body")
                ? "guide"
                : "content";
        const parameters = {
            link_url: href,
            link_text: String(link.textContent || "").trim().slice(0, 100),
            link_location: linkLocation,
        };
        if (socialPlatform) parameters.social_platform = socialPlatform;

        if (window.PetiteMoodAnalytics?.track) {
            window.PetiteMoodAnalytics.track(eventName, parameters);
        } else {
            window.gtag("event", eventName, parameters);
        }
    });

    /* Condivisione nativa delle guide, senza profili social inventati. */
    const articleBody = document.querySelector(".article-body");
    if (articleBody && !articleBody.querySelector("[data-guide-share]")) {
        const isEnglish = document.documentElement.lang.toLowerCase().startsWith("en");
        const canonical = document.querySelector('link[rel="canonical"]');
        const shareUrl = canonical ? canonical.href : window.location.href;
        const description = document.querySelector('meta[name="description"]');
        const shareBox = document.createElement("aside");
        shareBox.className = "guide-share-box";
        shareBox.setAttribute("data-guide-share", "");
        shareBox.innerHTML = `
            <div>
                <strong>${isEnglish ? "Was this guide useful?" : "Questa guida ti è stata utile?"}</strong>
                <p>${isEnglish ? "Share it with someone who might need it." : "Condividila con un'amica a cui potrebbe servire."}</p>
            </div>
            <button class="btn-primary" type="button">
                ${isEnglish ? "Share this guide" : "Condividi la guida"}
            </button>
            <p class="guide-share-status" role="status" aria-live="polite"></p>
        `;
        articleBody.appendChild(shareBox);

        const button = shareBox.querySelector("button");
        const status = shareBox.querySelector(".guide-share-status");
        button.addEventListener("click", async () => {
            let method = "copy";
            try {
                if (navigator.share) {
                    method = "native";
                    await navigator.share({
                        title: document.title,
                        text: description ? description.content : "",
                        url: shareUrl,
                    });
                    status.textContent = isEnglish ? "Thank you for sharing!" : "Grazie per averla condivisa!";
                } else if (navigator.clipboard) {
                    await navigator.clipboard.writeText(shareUrl);
                    status.textContent = isEnglish ? "Link copied!" : "Link copiato!";
                } else {
                    window.prompt(isEnglish ? "Copy this link" : "Copia questo link", shareUrl);
                    status.textContent = isEnglish ? "The link is ready to copy." : "Il link è pronto da copiare.";
                }
                if (window.PetiteMoodAnalytics?.track) {
                    window.PetiteMoodAnalytics.track("guide_share", {
                        share_method: method,
                        guide_slug: window.PetiteMoodAnalytics.context.pageSlug,
                    });
                } else if (typeof window.gtag === "function") {
                    window.gtag("event", "guide_share", { share_method: method });
                }
            } catch (error) {
                if (error && error.name !== "AbortError") {
                    status.textContent = isEnglish ? "Please try again." : "Riprova tra poco.";
                }
            }
        });
    }

    console.log("✅ Petite Mood 3.0 caricato");
});
