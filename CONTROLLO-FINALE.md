# Controllo finale — Petite Mood

## File modificati

- `index.html`: nuova hero, CTA, menu, Petite Members, newsletter e metadati social.
- `css/style.css`: componenti responsive per guide, articoli, tabelle, FAQ e Diario.
- `js/script.js`: eventi GA4 e conferma iscrizione newsletter, senza modificare le chiamate Supabase.
- `js/config.js`: commento per inserire il vero ID GA4.
- `questionario.html`, `privacy.html`, `grazie.html`, `404.html`: metadati SEO/social coerenti.
- `sitemap.xml`: elenco completo delle pagine pubbliche.

## File creati

- `guide.html`
- `cosa-significa-taglia-petite.html`
- `come-vestirsi-sotto-160-cm.html`
- `differenza-xs-taglia-petite.html`
- `dove-trovare-jeans-petite.html`
- `lunghezza-pantaloni-petite.html`
- `pantaloni-palazzo-ragazze-basse.html`
- `abiti-lunghi-donne-petite.html`
- `migliori-brand-petite.html`
- `tabella-misure-petite.html`
- `petite-club.html`
- `faq.html`
- `diario.html`

## Controlli eseguiti

- sintassi dei file JavaScript;
- un solo H1 in ogni pagina;
- title e meta description unici sulle pagine pubbliche;
- canonical, Open Graph e Twitter Card;
- immagini con testo alternativo;
- esistenza delle destinazioni di link e risorse locali;
- presenza delle nuove URL nella sitemap;
- media query per desktop, tablet e smartphone;
- tabella con scorrimento orizzontale su schermi stretti;
- FAQ con elementi HTML `details/summary`, accessibili anche da tastiera;
- nessuna modifica a `questionario.js`, credenziali/configurazione Supabase, SQL o RPC.

## Passaggi manuali per Antonio

1. Pubblicare l'intero contenuto della cartella mantenendo la struttura.
2. Inserire il vero ID GA4 in `js/config.js` solo dopo aver creato la proprietà.
3. Inserire il meta tag Search Console nei punti commentati oppure verificare il dominio via DNS.
4. Inviare `https://petitemood.it/sitemap.xml` in Search Console.
5. Fornire l'URL ufficiale Facebook prima di aggiungerlo a footer e Organization JSON-LD: non è stato inventato.
6. Dopo la pubblicazione, provare una newsletter e un questionario reali e controllare le righe in Supabase.
7. Sostituire le immagini riutilizzate nelle guide con fotografie dedicate quando disponibili.

## Nota sulla verifica visiva

La struttura è responsive per codice e non presenta risorse locali mancanti. Il browser di prova dell'ambiente ha bloccato l'apertura del server locale: è quindi raccomandato un ultimo controllo visivo sul sito pubblicato, soprattutto alle larghezze 360 px, 768 px e desktop.
