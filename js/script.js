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

    console.log("✅ Petite Mood 2.0 caricato");
});
