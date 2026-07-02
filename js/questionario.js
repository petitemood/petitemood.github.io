/* PETITE MOOD - QUESTIONARIO 1.0 */

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("petite-survey");
    if (!form) return;

    const steps = Array.from(form.querySelectorAll(".form-step"));
    const previousButton = document.getElementById("previous-step");
    const nextButton = document.getElementById("next-step");
    const submitButton = document.getElementById("submit-survey");
    const progressBar = document.getElementById("progress-bar");
    const progressPercent = document.getElementById("progress-percent");
    const stepLabel = document.getElementById("step-label");
    const formAlert = document.getElementById("form-alert");
    const successPanel = document.getElementById("success-panel");
    const feedback = document.getElementById("feedback");
    const feedbackCount = document.getElementById("feedback-count");
    const storageKey = "petiteMoodSurveyDraftV1";
    let currentStep = 0;

    const config = window.PETITE_MOOD_CONFIG || {};
    const cleanUrl = String(config.supabaseUrl || "").replace(/\/+$/, "");
    const apiKey = String(config.supabasePublishableKey || "");
    const isConfigured = cleanUrl.startsWith("https://") && apiKey.length > 20;

    const showAlert = (message, type = "error") => {
        formAlert.textContent = message;
        formAlert.classList.toggle("is-info", type === "info");
        formAlert.hidden = false;
        formAlert.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

    const hideAlert = () => {
        formAlert.hidden = true;
        formAlert.textContent = "";
        formAlert.classList.remove("is-info");
    };

    const checkedValues = (name) =>
        Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map((input) => input.value);

    const getValue = (name) => {
        const field = form.elements.namedItem(name);
        if (!field) return "";
        if (field instanceof RadioNodeList) return field.value;
        return String(field.value || "").trim();
    };

    const collectPayload = () => ({
        height_cm: Number(getValue("height_cm")),
        age_range: getValue("age_range"),
        region: getValue("region") || null,
        body_proportion: getValue("body_proportion") || null,
        top_size: getValue("top_size") || null,
        bottom_size: getValue("bottom_size") || null,
        shopping_difficulty: Number(getValue("shopping_difficulty")),
        problem_areas: checkedValues("problem_areas"),
        difficult_products: checkedValues("difficult_products"),
        alterations_frequency: getValue("alterations_frequency") || null,
        alterations_cost: getValue("alterations_cost") || null,
        preferred_fits: checkedValues("preferred_fits"),
        desired_products: checkedValues("desired_products"),
        style_preferences: checkedValues("style_preferences"),
        preferred_colors: getValue("preferred_colors") || null,
        budget_trousers: getValue("budget_trousers") || null,
        purchase_intent: Number(getValue("purchase_intent")),
        discovery_channels: checkedValues("discovery_channels"),
        feedback: getValue("feedback") || null,
        first_name: getValue("first_name") || null,
        email: getValue("email").toLowerCase() || null,
        join_members: checkedValues("join_members").includes("true"),
        newsletter_consent: checkedValues("newsletter_consent").includes("true"),
        privacy_consent: checkedValues("privacy_consent").includes("true"),
        source: "website_questionnaire",
    });

    const saveDraft = () => {
        try {
            const draft = {};
            new FormData(form).forEach((value, key) => {
                if (key === "website" || key === "privacy_consent") return;
                if (draft[key]) {
                    draft[key] = Array.isArray(draft[key]) ? [...draft[key], value] : [draft[key], value];
                } else {
                    draft[key] = value;
                }
            });
            sessionStorage.setItem(storageKey, JSON.stringify(draft));
        } catch (_) {
            /* Il questionario funziona anche quando lo storage è disattivato. */
        }
    };

    const restoreDraft = () => {
        try {
            const draft = JSON.parse(sessionStorage.getItem(storageKey) || "null");
            if (!draft) return;
            Object.entries(draft).forEach(([name, rawValue]) => {
                const values = Array.isArray(rawValue) ? rawValue : [rawValue];
                const fields = Array.from(form.querySelectorAll(`[name="${name}"]`));
                fields.forEach((field) => {
                    if (field.type === "checkbox" || field.type === "radio") {
                        field.checked = values.includes(field.value);
                    } else if (values[0] !== undefined) {
                        field.value = values[0];
                    }
                });
            });
        } catch (_) {
            sessionStorage.removeItem(storageKey);
        }
    };

    const updateFeedbackCount = () => {
        if (feedback && feedbackCount) feedbackCount.textContent = String(feedback.value.length);
    };

    const renderStep = () => {
        steps.forEach((step, index) => {
            const active = index === currentStep;
            step.hidden = !active;
            step.classList.toggle("is-active", active);
        });

        const percent = Math.round(((currentStep + 1) / steps.length) * 100);
        progressBar.style.width = `${percent}%`;
        progressPercent.textContent = `${percent}%`;
        stepLabel.textContent = `Passaggio ${currentStep + 1} di ${steps.length}`;
        previousButton.hidden = currentStep === 0;
        nextButton.hidden = currentStep === steps.length - 1;
        submitButton.hidden = currentStep !== steps.length - 1;
        hideAlert();

        const activeLegend = steps[currentStep].querySelector("legend");
        if (activeLegend && currentStep > 0) {
            activeLegend.setAttribute("tabindex", "-1");
            activeLegend.focus({ preventScroll: true });
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const validateStep = (step) => {
        hideAlert();
        step.querySelectorAll(".is-invalid").forEach((element) => element.classList.remove("is-invalid"));

        const invalidField = Array.from(step.querySelectorAll("input, select, textarea"))
            .find((field) => !field.checkValidity());

        const invalidGroup = Array.from(step.querySelectorAll("[data-required-group]"))
            .find((group) => !group.querySelector("input:checked"));

        if (invalidGroup) {
            invalidGroup.classList.add("is-invalid");
            showAlert("Seleziona almeno una risposta nella domanda evidenziata.");
            invalidGroup.scrollIntoView({ behavior: "smooth", block: "center" });
            return false;
        }

        if (invalidField) {
            invalidField.classList.add("is-invalid");
            showAlert("Controlla il campo evidenziato prima di continuare.");
            invalidField.focus();
            return false;
        }

        if (step.dataset.step === "5") {
            const wantsContact =
                form.elements.join_members.checked ||
                form.elements.newsletter_consent.checked;
            const emailField = form.elements.email;

            if (wantsContact && !emailField.value.trim()) {
                emailField.classList.add("is-invalid");
                showAlert("Inserisci l'email per diventare Petite Member o ricevere le novità.");
                emailField.focus();
                return false;
            }
        }

        return true;
    };

    nextButton.addEventListener("click", () => {
        if (!validateStep(steps[currentStep])) return;
        saveDraft();
        currentStep += 1;
        renderStep();
    });

    previousButton.addEventListener("click", () => {
        saveDraft();
        currentStep = Math.max(0, currentStep - 1);
        renderStep();
    });

    form.addEventListener("input", (event) => {
        event.target.classList.remove("is-invalid");
        const group = event.target.closest("[data-required-group]");
        if (group) group.classList.remove("is-invalid");
        saveDraft();
        updateFeedbackCount();
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!validateStep(steps[currentStep])) return;

        if (getValue("website")) return;

        if (!isConfigured) {
            showAlert(
                "Il questionario è pronto, ma il collegamento al database non è ancora stato configurato. Inserisci Project URL e Publishable key nel file js/config.js.",
                "info"
            );
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Invio in corso…";
        hideAlert();

        try {
            const response = await fetch(`${cleanUrl}/rest/v1/questionario`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": apiKey,
                    "Authorization": `Bearer ${apiKey}`,
                    "Prefer": "return=minimal",
                },
                body: JSON.stringify(collectPayload()),
            });

            if (!response.ok) throw new Error(`Invio non riuscito (${response.status})`);

            sessionStorage.removeItem(storageKey);
            form.hidden = true;
            document.querySelector(".progress-wrap").hidden = true;
            successPanel.hidden = false;
            successPanel.focus();
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (error) {
            console.error("Petite Mood survey:", error);
            showAlert(
                "Non siamo riusciti a inviare le risposte. Controlla la connessione e riprova tra poco."
            );
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Invia il questionario";
        }
    });

    restoreDraft();
    updateFeedbackCount();
    renderStep();
});
