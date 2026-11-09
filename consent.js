/*
 * Gestione consenso cookie – Autocarrozzeria Badanai
 * Nessuna dipendenza esterna, nessun cookie proprio.
 *
 * Come funziona
 * - Le scelte dell'utente sono salvate in localStorage (chiave "badanai_consent"),
 *   con data e versione. Dopo 180 giorni il banner viene riproposto.
 * - Ogni script o iframe NON tecnico va scritto in forma "bloccata" e parte solo
 *   dopo il consenso alla sua categoria. Categorie: statistiche,
 *   contenuti_esterni, marketing.
 *
 *   <script type="text/plain" data-consent="statistiche" data-src="https://esempio.it/stats.js"></script>
 *   <script type="text/plain" data-consent="marketing">/* codice inline *\/</script>
 *   <iframe data-consent="contenuti_esterni" data-src="https://www.google.com/maps/embed?..."
 *           title="Mappa" width="100%" height="320"></iframe>
 *   <div data-consent-placeholder="contenuti_esterni">Accetta i contenuti di terze parti per vedere la mappa.
 *     <button type="button" data-cookie-settings>Gestisci cookie</button></div>
 *
 * - Qualsiasi elemento con l'attributo data-cookie-settings riapre le preferenze.
 * - Evento "badanai:consent" sul document a ogni scelta; window.BadanaiConsent.has('statistiche').
 * - Opzione: <script src="consent.js" data-only-if-needed="true" defer></script>
 *   mostra il banner solo se la pagina contiene elementi [data-consent].
 */
(function () {
  'use strict';

  var STORE_KEY = 'badanai_consent';
  var VERSION = 1;
  var MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000; // 6 mesi, come indicato dalle linee guida del Garante
  var COOKIE_URL = 'cookie.html';
  var PRIVACY_URL = 'privacy.html';

  var CATEGORIES = [
    {
      id: 'statistiche',
      label: 'Statistiche',
      desc: 'Misurano come viene usato il sito per migliorarlo (visite, pagine più viste).'
    },
    {
      id: 'contenuti_esterni',
      label: 'Contenuti di terze parti',
      desc: 'Mappe, video e altri contenuti incorporati da servizi esterni, che possono impostare propri cookie.'
    },
    {
      id: 'marketing',
      label: 'Marketing e profilazione',
      desc: 'Mostrano pubblicità o contenuti personalizzati in base alla navigazione.'
    }
  ];

  var thisScript = document.currentScript;
  var onlyIfNeeded = !!(thisScript && thisScript.getAttribute('data-only-if-needed') === 'true');

  /* ---------- Archiviazione ---------- */
  var memory = null;

  function read() {
    var raw = null;
    try { raw = window.localStorage.getItem(STORE_KEY); } catch (e) { return memory; }
    if (!raw) return memory;
    try {
      var d = JSON.parse(raw);
      var fresh = d && d.v === VERSION && typeof d.ts === 'number' && d.c && typeof d.c === 'object' &&
                  (Date.now() - d.ts) < MAX_AGE_MS;
      if (fresh) return d;
      window.localStorage.removeItem(STORE_KEY);
    } catch (e) { /* dato corrotto: si riparte da zero */ }
    return null;
  }

  function write(choices) {
    var rec = { v: VERSION, ts: Date.now(), c: choices };
    memory = rec;
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(rec)); } catch (e) { /* storage bloccato: vale per la sessione */ }
    return rec;
  }

  var current = read();

  function has(cat) { return !!(current && current.c && current.c[cat] === true); }

  /* ---------- Sblocco dei contenuti ---------- */
  function activate() {
    var scripts = document.querySelectorAll('script[type="text/plain"][data-consent]');
    Array.prototype.forEach.call(scripts, function (old) {
      if (old.getAttribute('data-activated') || !has(old.getAttribute('data-consent'))) return;
      old.setAttribute('data-activated', '1');
      var s = document.createElement('script');
      Array.prototype.forEach.call(old.attributes, function (a) {
        if (['type', 'data-consent', 'data-src', 'data-activated'].indexOf(a.name) === -1) s.setAttribute(a.name, a.value);
      });
      if (old.getAttribute('data-src')) s.src = old.getAttribute('data-src');
      else s.text = old.text;
      old.parentNode.insertBefore(s, old);
    });

    var frames = document.querySelectorAll('iframe[data-consent][data-src]');
    Array.prototype.forEach.call(frames, function (f) {
      if (!has(f.getAttribute('data-consent'))) return;
      f.setAttribute('src', f.getAttribute('data-src'));
      f.removeAttribute('data-src');
    });

    var holders = document.querySelectorAll('[data-consent-placeholder]');
    Array.prototype.forEach.call(holders, function (p) {
      p.hidden = has(p.getAttribute('data-consent-placeholder'));
    });
  }

  /* ---------- Interfaccia ---------- */
  var banner, overlay, modal, lastFocus = null;

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }

  function links() {
    var p = el('span', { 'class': 'cc-links' });
    p.appendChild(el('a', { href: COOKIE_URL, text: 'Cookie Policy' }));
    p.appendChild(document.createTextNode(' · '));
    p.appendChild(el('a', { href: PRIVACY_URL, text: 'Privacy Policy' }));
    return p;
  }

  function button(label, action, kind) {
    return el('button', { type: 'button', 'class': 'cc-btn cc-' + kind, 'data-cc': action, text: label });
  }

  function build() {
    banner = el('div', { 'class': 'cc-banner', role: 'region', 'aria-label': 'Preferenze sui cookie', hidden: '' }, [
      el('button', { type: 'button', 'class': 'cc-x', 'data-cc': 'reject', 'aria-label': 'Chiudi e continua senza accettare i cookie facoltativi', text: '×' }),
      el('h2', { 'class': 'cc-title', text: 'Cookie e privacy' }),
      el('p', { 'class': 'cc-text' }, [
        'Questo sito usa solo strumenti tecnici necessari al suo funzionamento. Con il tuo consenso possiamo attivare anche strumenti facoltativi (statistiche, contenuti di terze parti, marketing). Puoi chiudere questo avviso con la ',
        el('strong', { text: '×' }),
        ' per continuare senza accettare, e cambiare scelta in qualsiasi momento. ',
        links()
      ]),
      el('div', { 'class': 'cc-actions' }, [
        button('Rifiuta', 'reject', 'main'),
        button('Personalizza', 'custom', 'ghost'),
        button('Accetta tutti', 'accept', 'main')
      ])
    ]);

    var list = el('ul', { 'class': 'cc-cats' });
    list.appendChild(el('li', { 'class': 'cc-cat' }, [
      el('div', { 'class': 'cc-cat-head' }, [
        el('label', { 'for': 'cc-cat-necessari', text: 'Necessari' }),
        el('input', { type: 'checkbox', id: 'cc-cat-necessari', 'class': 'cc-sw', checked: '', disabled: '' })
      ]),
      el('p', { text: 'Servono al funzionamento del sito e a ricordare le tue scelte su questo avviso. Non richiedono consenso e non possono essere disattivati.' })
    ]));
    CATEGORIES.forEach(function (c) {
      list.appendChild(el('li', { 'class': 'cc-cat' }, [
        el('div', { 'class': 'cc-cat-head' }, [
          el('label', { 'for': 'cc-cat-' + c.id, text: c.label }),
          el('input', { type: 'checkbox', id: 'cc-cat-' + c.id, 'class': 'cc-sw', 'data-cat': c.id })
        ]),
        el('p', { text: c.desc })
      ]));
    });

    modal = el('div', { 'class': 'cc-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'cc-m-title' }, [
      el('button', { type: 'button', 'class': 'cc-x', 'data-cc': 'close', 'aria-label': 'Chiudi le preferenze', text: '×' }),
      el('h2', { id: 'cc-m-title', 'class': 'cc-title', text: 'Preferenze sui cookie' }),
      el('p', { 'class': 'cc-text' }, [
        'Scegli quali categorie attivare. Quelle facoltative restano disattivate finché non le abiliti e puoi modificarle quando vuoi dal link «Gestisci cookie» in fondo alla pagina. ',
        links()
      ]),
      list,
      el('div', { 'class': 'cc-actions' }, [
        button('Rifiuta tutti', 'reject', 'main'),
        button('Salva preferenze', 'save', 'ghost'),
        button('Accetta tutti', 'accept', 'main')
      ])
    ]);
    overlay = el('div', { 'class': 'cc-overlay', hidden: '' }, [modal]);

    document.body.appendChild(banner);
    document.body.appendChild(overlay);

    document.addEventListener('click', onClick);
    overlay.addEventListener('keydown', onModalKey);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) closeModal(); });
  }

  function choices(all) {
    var out = {};
    CATEGORIES.forEach(function (c) { out[c.id] = all; });
    return out;
  }

  function fromToggles() {
    var out = {};
    CATEGORIES.forEach(function (c) {
      out[c.id] = !!overlay.querySelector('[data-cat="' + c.id + '"]').checked;
    });
    return out;
  }

  function onClick(e) {
    var opener = e.target.closest && e.target.closest('[data-cookie-settings]');
    if (opener) { e.preventDefault(); openModal(opener); return; }
    var b = e.target.closest && e.target.closest('[data-cc]');
    if (!b || !(banner.contains(b) || overlay.contains(b))) return;
    var a = b.getAttribute('data-cc');
    if (a === 'accept') decide(choices(true));
    else if (a === 'reject') decide(choices(false));
    else if (a === 'save') decide(fromToggles());
    else if (a === 'custom') openModal(b);
    else if (a === 'close') closeModal();
  }

  function openModal(from) {
    lastFocus = from || document.activeElement;
    CATEGORIES.forEach(function (c) {
      overlay.querySelector('[data-cat="' + c.id + '"]').checked = has(c.id);
    });
    overlay.hidden = false;
    document.documentElement.classList.add('cc-lock');
    var first = overlay.querySelector('.cc-cat .cc-sw:not([disabled])') || modal;
    first.focus();
  }

  function closeModal() {
    overlay.hidden = true;
    document.documentElement.classList.remove('cc-lock');
    if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus();
  }

  function onModalKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); closeModal(); return; }
    if (e.key !== 'Tab') return;
    var f = overlay.querySelectorAll('button, input:not([disabled]), a[href]');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function decide(c) {
    var before = current;
    current = write(c);
    banner.hidden = true;
    closeModal();
    var revoked = !!before && CATEGORIES.some(function (k) { return before.c[k.id] && !c[k.id]; });
    if (revoked) { window.location.reload(); return; } // gli script già avviati non si possono scaricare
    activate();
    try { document.dispatchEvent(new CustomEvent('badanai:consent', { detail: { choices: c } })); } catch (e) { /* vecchi browser */ }
  }

  function whenPageVisible(cb) {
    var root = document.documentElement, fired = false;
    function go() { if (!fired) { fired = true; cb(); } }
    if (!root.classList.contains('loading')) { go(); return; }
    var mo = new MutationObserver(function () {
      if (!root.classList.contains('loading')) { mo.disconnect(); go(); }
    });
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
    setTimeout(go, 12000);
  }

  function init() {
    build();
    activate();
    if (current) return;
    if (onlyIfNeeded && !document.querySelector('[data-consent]')) return;
    whenPageVisible(function () { if (!current) banner.hidden = false; });
  }

  window.BadanaiConsent = {
    has: has,
    get: function () { return current ? JSON.parse(JSON.stringify(current.c)) : null; },
    open: function () { openModal(document.activeElement); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
