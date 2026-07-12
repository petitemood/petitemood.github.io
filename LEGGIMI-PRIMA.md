# Petite Mood — versione completa

Questa cartella contiene il sito pronto per la pubblicazione, il nuovo
questionario e il database necessario per raccogliere le risposte.

## Cosa è già pronto

- Homepage aggiornata e ottimizzata per smartphone.
- Collegamenti Instagram e TikTok `@petitemood.it`.
- Questionario professionale in 5 passaggi.
- Salvataggio automatico della bozza durante la compilazione.
- Iscrizione Petite Member e newsletter.
- Contatori automatici di questionari e membri.
- Informativa privacy e consensi separati.
- Database Supabase protetto con Row Level Security.
- SEO di base, sitemap, robots.txt e pagina 404.
- Accessibilità, validazione dei campi e messaggi di errore.

## Unico collegamento da fare prima della pubblicazione

Il sito non può salvare email e risposte finché non viene creato il database
Supabase. Servono circa 10 minuti.

### 1. Crea il progetto Supabase

1. Vai su `https://supabase.com` e accedi.
2. Crea un nuovo progetto chiamato `petite-mood`.
3. Scegli la regione europea **Central EU (Frankfurt)**.
4. Crea e conserva una password del database sicura.
5. Attendi che il progetto risulti attivo.

### 2. Crea le tabelle

1. Nel menu di Supabase apri **SQL Editor**.
2. Apri il file `supabase/setup.sql` di questa cartella.
3. Copia tutto il contenuto nel SQL Editor.
4. Premi **Run** una sola volta.
5. In fondo deve apparire `Petite Mood database configurato`.
6. Apri poi `supabase/dashboard.sql`, copialo nello stesso SQL Editor e
   premi **Run**: crea la prima dashboard privata con domanda prodotti,
   problemi di vestibilità e altezza media.

### 3. Collega il sito

Nel pannello Supabase recupera:

- **Project URL**;
- **Publishable key** (nei progetti meno recenti può chiamarsi `anon key`).

Apri `js/config.js` e inserisci i due valori tra le virgolette:

```js
window.PETITE_MOOD_CONFIG = {
    supabaseUrl: "INCOLLA_QUI_PROJECT_URL",
    supabasePublishableKey: "INCOLLA_QUI_PUBLISHABLE_KEY",
    googleAnalyticsId: "",
};
```

La Publishable key è pensata per il sito pubblico ed è protetta dalle regole
RLS già presenti nel database.

**Non inserire mai** nel sito la `secret key` o la `service_role key`.

## Pubblicazione su GitHub

Carica nel repository il contenuto di questa cartella mantenendo esattamente
la struttura:

```text
index.html
questionario.html
privacy.html
404.html
CNAME
robots.txt
sitemap.xml
css/
js/
images/
```

La cartella `supabase/` è una copia di sicurezza tecnica: non è necessaria per
il funzionamento del sito e può anche non essere caricata pubblicamente.

Attendi 2–5 minuti dopo il commit, poi prova:

1. `https://petitemood.it/`
2. `https://petitemood.it/questionario.html`
3. un'iscrizione newsletter con una tua email;
4. un questionario di prova;
5. in Supabase, le tabelle `newsletter_subscribers` e
   `questionnaire_responses`.

## Cosa fanno newsletter e Petite Member

Il sito raccoglie e organizza gli indirizzi nel database. Per inviare
automaticamente vere campagne email servirà in seguito un servizio dedicato
(per esempio Brevo o Mailchimp) collegato alla tabella. Non è stato attivato
nessun invio commerciale senza la vostra scelta.

## Privacy: controllo prima del lancio

La pagina `privacy.html` è una base operativa completa, ma prima di raccogliere
dati reali verificate:

- i dati identificativi del titolare;
- che `info@petitemood.com` riceva correttamente le richieste;
- la regione europea scelta su Supabase;
- l'accordo sul trattamento dati disponibile nell'account Supabase;
- la procedura con cui gestirete cancellazioni e disiscrizioni.

Per un lancio commerciale è consigliata la verifica di un professionista.

## HTTPS

In **GitHub → Settings → Pages** controlla che il dominio sia
`petitemood.it`. Quando il certificato è pronto, attiva **Enforce HTTPS**.
Google Analytics e Search Console vanno configurati soltanto dopo che HTTPS
funziona correttamente.

### Google Analytics (facoltativo)

Il sito contiene già il banner con scelta **Accetta/Rifiuta** e non carica
Analytics prima del consenso. Dopo aver creato una proprietà GA4, inserisci
il Measurement ID nel file `js/config.js`:

```js
googleAnalyticsId: "G-XXXXXXXXXX",
```

Lascia il valore vuoto se non vuoi attivare Analytics.

### Google Search Console

1. Aggiungi la proprietà dominio `petitemood.it`.
2. Completa la verifica DNS seguendo il valore mostrato da Google.
3. Quando il sito è verificato, invia:
   `https://petitemood.it/sitemap.xml`.

## Roadmap successiva

1. Collegare un servizio per l'invio delle newsletter.
2. Attivare Search Console e inviare `sitemap.xml`.
3. Valutare periodicamente la dashboard privata creata in Supabase.
4. Progettare lo shop dopo aver definito prodotti, taglie, prezzi, pagamenti,
   spedizioni e resi.
