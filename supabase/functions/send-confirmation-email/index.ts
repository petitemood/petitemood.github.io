type EmailKind = "questionnaire" | "newsletter";

type EmailPayload = {
  kind?: EmailKind;
  email?: string;
  firstName?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
const emailFrom = Deno.env.get("EMAIL_FROM") || "Petite Mood <info@petitemood.com>";
const internalNotificationEmail = Deno.env.get("INTERNAL_NOTIFICATION_EMAIL") || "";
const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "https://petitemood.it,https://www.petitemood.it")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const jsonResponse = (body: Record<string, unknown>, status = 200, origin = "") =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      ...corsHeaders,
    },
  });

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const plainToHtml = (text: string) =>
  text
    .split("\n\n")
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
    .join("");

const buildUserEmail = (kind: EmailKind, firstName = "") => {
  const greeting = firstName ? `Ciao ${firstName},` : "Ciao,";

  if (kind === "questionnaire") {
    const text = `${greeting}

grazie per aver compilato il questionario di Petite Mood! ✨

Il tuo contributo è davvero prezioso: ogni risposta ci aiuta a comprendere meglio i bisogni reali delle ragazze petite e ci avvicina al nostro obiettivo più importante — creare qualcosa di pensato davvero per chi è sotto i 160 cm.

💌 Una community autentica
Stiamo costruendo uno spazio fatto di ascolto, idee, consigli e confronto reale.

👗 Un futuro brand costruito insieme
Le tue risposte ci aiuteranno a capire quali capi creare e quali problemi di vestibilità risolvere davvero.

🌷 La tua voce conta
Non vogliamo decidere tutto da soli. Vogliamo che Petite Mood cresca insieme alle persone che lo vivranno.

Hai una proposta, un suggerimento o qualcosa che vorresti trovare in Petite Mood? Scrivici quando vuoi a info@petitemood.com. Leggiamo con attenzione ogni messaggio: le tue idee sono sempre benvenute. 💖

Se hai scelto di entrare nella community, da oggi sei ufficialmente una delle prime Petite Members del progetto. Che bello averti con noi!

A presto,

Antonio Pio e Federica
Petite Mood
La community italiana dedicata alle ragazze sotto i 160 cm

Instagram: https://instagram.com/petitemood.it
TikTok: https://www.tiktok.com/@petitemood.it
Email: info@petitemood.com`;

    return {
      subject: "Grazie per aver condiviso la tua esperienza 💖",
      text,
      html: plainToHtml(text),
    };
  }

  const text = `Ciao,

grazie per esserti iscritta alla newsletter di Petite Mood! 🌷

Questo non è soltanto un aggiornamento in più nella tua casella email: è l’inizio di un progetto che vogliamo costruire mettendo al centro te, le tue proporzioni, le tue difficoltà e il tuo modo di vivere la moda.

Da oggi riceverai:

✨ consigli pratici pensati per valorizzare le proporzioni petite;

👗 guide su taglie, vestibilità e lunghezze;

💌 novità e progressi del progetto Petite Mood;

🌸 anteprime, sondaggi e occasioni per far sentire la tua voce;

🧵 aggiornamenti sul percorso verso la nostra prima collezione.

Ti scriveremo soltanto quando avremo qualcosa di interessante e utile da condividere. Niente rumore e niente email inutili.

Anche la tua opinione può aiutarci a costruire Petite Mood. Se hai una proposta, un suggerimento, un problema di vestibilità da raccontarci o un contenuto che vorresti ricevere, scrivici a info@petitemood.com. Ogni idea è benvenuta e sarà letta con attenzione. 💖

Siamo davvero felici di averti nella community. Petite Mood nasce per ascoltare ragazze come te e creare, passo dopo passo, qualcosa che finora è mancato.

A presto,

Antonio Pio e Federica
Petite Mood
La community italiana dedicata alle ragazze sotto i 160 cm

Instagram: https://instagram.com/petitemood.it
TikTok: https://www.tiktok.com/@petitemood.it
Email: info@petitemood.com`;

  return {
    subject: "Benvenuta in Petite Mood",
    text,
    html: plainToHtml(text),
  };
};

const sendEmail = async (message: {
  to: string[];
  subject: string;
  text: string;
  html: string;
}) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: emailFrom,
      ...message,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`resend_${response.status}:${details.slice(0, 300)}`);
  }
};

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin") || "";
  const isAllowedOrigin = allowedOrigins.includes(origin) || (!origin && allowedOrigins.length > 0);
  const responseOrigin = isAllowedOrigin ? origin : allowedOrigins[0] || "*";

  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": responseOrigin,
        ...corsHeaders,
      },
    });
  }

  if (!isAllowedOrigin) {
    return jsonResponse({ ok: false, error: "origin_not_allowed" }, 403, responseOrigin);
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, 405, responseOrigin);
  }

  if (!resendApiKey) {
    console.error("Petite Mood email: RESEND_API_KEY missing");
    return jsonResponse({ ok: false, error: "email_service_not_configured" }, 500, responseOrigin);
  }

  try {
    const payload = (await request.json()) as EmailPayload;
    const kind = payload.kind;
    const email = String(payload.email || "").trim().toLowerCase();
    const firstName = String(payload.firstName || "").trim().slice(0, 80);

    if (kind !== "questionnaire" && kind !== "newsletter") {
      return jsonResponse({ ok: false, error: "invalid_kind" }, 400, responseOrigin);
    }

    if (!emailPattern.test(email)) {
      return jsonResponse({ ok: false, error: "invalid_email" }, 400, responseOrigin);
    }

    const userEmail = buildUserEmail(kind, firstName);
    await sendEmail({
      to: [email],
      subject: userEmail.subject,
      text: userEmail.text,
      html: userEmail.html,
    });

    // Optional internal notification: useful for questionnaire submissions.
    if (kind === "questionnaire" && emailPattern.test(internalNotificationEmail)) {
      const internalText = `Ciao,

e stato appena compilato un nuovo questionario su Petite Mood.

Email utente: ${email}
Nome: ${firstName || "non indicato"}

Controlla Supabase per vedere tutte le risposte.`;

      await sendEmail({
        to: [internalNotificationEmail],
        subject: "Nuovo questionario compilato su Petite Mood",
        text: internalText,
        html: plainToHtml(internalText),
      });
    }

    console.log(`Petite Mood email sent: ${kind}`);
    return jsonResponse({ ok: true }, 200, responseOrigin);
  } catch (error) {
    console.error("Petite Mood email error:", error instanceof Error ? error.message : error);
    return jsonResponse({ ok: false, error: "email_send_failed" }, 500, responseOrigin);
  }
});
