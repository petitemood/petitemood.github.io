document.addEventListener("DOMContentLoaded", () => {
    const poll = document.querySelector("[data-diary-poll]");
    if (!poll) return;

    const storageKey = "petiteMoodDiaryPollV1";
    const buttons = Array.from(poll.querySelectorAll("[data-poll-choice]"));
    const message = poll.querySelector("[data-poll-message]");

    const showVote = (choice) => {
        buttons.forEach((button) => {
            const selected = button.dataset.pollChoice === choice;
            button.disabled = true;
            button.classList.toggle("is-selected", selected);
            button.setAttribute("aria-pressed", selected ? "true" : "false");
        });
        message.hidden = false;
    };

    let savedVote = "";
    try {
        savedVote = localStorage.getItem(storageKey) || "";
    } catch (_) {
        /* Il sondaggio resta utilizzabile anche senza memoria locale. */
    }

    if (savedVote && buttons.some((button) => button.dataset.pollChoice === savedVote)) {
        showVote(savedVote);
    }

    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            if (savedVote) return;

            const choice = button.dataset.pollChoice;
            savedVote = choice;
            try {
                localStorage.setItem(storageKey, choice);
            } catch (_) {
                /* Il voto resta valido per la sessione corrente. */
            }

            showVote(choice);
            if (typeof window.gtag === "function") {
                window.gtag("event", `diary_poll_${choice}`);
            }
        });
    });
});
