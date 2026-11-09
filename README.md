# Esercitazione – Sito Autocarrozzeria Badanai

Landing page responsive per l'Autocarrozzeria Badanai (autoriparazioni dal 1981).

## Contenuto
- `index.html` – pagina unica con HTML, CSS e JavaScript inclusi
- `privacy.html` – informativa privacy (GDPR)
- `cookie.html` – cookie policy
- `note-legali.html` – note legali e dati societari
- `legal.css` – stile condiviso delle pagine legali
- `consent.js`, `consent.css` – banner cookie con blocco preventivo (nessuna dipendenza esterna)
- `fonts/` – font Inter in locale (licenza OFL), nessuna chiamata a Google Fonts
- `logo-badanai.png` – logo (1200×280, sfondo trasparente)

## Caratteristiche
- Tema scuro con accenti arancioni e card in stile glassmorphism
- Preloader con auto animata (5 secondi)
- Menu hamburger animato su mobile e barra contatti rapidi sempre visibile
- Servizi principali in evidenza e altri servizi in griglia
- Sezione FAQ con accordion
- Orari di apertura con indicatore "Aperto ora / Chiuso ora" (fuso Europe/Rome)
- Modulo preventivo con validazione (apre il client di posta: per l'invio diretto serve un backend)

## Come usarlo
Apri `index.html` in un browser, tenendo `logo-badanai.png` nella stessa cartella.

## Conformità: da completare prima della pubblicazione
I dati societari mancanti sono segnati in giallo come `[...]` (classe `todo`). Per trovarli tutti:

    grep -n 'class="todo"' *.html

Non pubblicare finché il comando non restituisce nulla.

## Come bloccare un cookie non tecnico
    <script type="text/plain" data-consent="statistiche" data-src="https://esempio.it/stats.js"></script>
    <iframe data-consent="contenuti_esterni" data-src="https://www.google.com/maps/embed?..." title="Mappa"></iframe>

Categorie: `statistiche`, `contenuti_esterni`, `marketing`. Parte solo dopo il consenso.
