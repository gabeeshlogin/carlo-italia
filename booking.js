/* Carlo Italia table booking widget. Talks to the Carlo bookings web app. */
(function () {
  'use strict';
  var API = 'https://script.google.com/macros/s/AKfycbzjqKTC0CLT7kqkpCGWdEVA_Q1rLzpZp0xr3hY4IeMJLD91gcpk8TylPjZWG1DJ5U18/exec';
  var PHONE = '01372 650293', TEL = 'tel:+441372650293';

  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function get(params) {
    var q = Object.keys(params).map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
    return fetch(API + '?' + q).then(function (r) { return r.json(); });
  }
  function post(body) {
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) }).then(function (r) { return r.json(); });
  }
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function parse(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function fmtTime(t) { var p = t.split(':'), h = +p[0], m = +p[1], ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return h + (m ? ':' + p[1] : '') + ap; }
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function mount(root) {
    var state = { size: 2, date: null, time: null, cfg: null };
    root.innerHTML = '';
    root.classList.add('cb');
    var wrap = el('div', { class: 'cb-inner' });
    root.appendChild(wrap);

    // step 1: guests, date, time (all taps, no swiping)
    var s1 = el('div', { class: 'cb-step' });
    var MAXG = 8;
    var sizes = el('div', { class: 'cb-sizes', role: 'radiogroup', 'aria-label': 'Number of guests' });
    for (var g = 1; g <= MAXG; g++) {
      sizes.appendChild(el('button', { type: 'button', class: 'cb-chip', role: 'radio', 'aria-checked': 'false', 'data-n': String(g), text: String(g),
        onclick: (function (n) { return function () { setSize(n); }; })(g) }));
    }
    var bigNote = el('p', { class: 'cb-note', html: 'More than ' + MAXG + '? Call <a href="' + TEL + '">' + PHONE + '</a> and we will sort it.' });
    s1.appendChild(el('div', { class: 'cb-block' }, [el('span', { class: 'cb-label', text: 'How many guests?' }), sizes, bigNote]));

    var monthLbl = el('span', { class: 'cb-month' });
    var prevW = el('button', { type: 'button', class: 'cb-nav', 'aria-label': 'Earlier dates', html: '&#8249;', onclick: function () { page(-1); } });
    var nextW = el('button', { type: 'button', class: 'cb-nav', 'aria-label': 'Later dates', html: '&#8250;', onclick: function () { page(1); } });
    var days = el('div', { class: 'cb-days', role: 'radiogroup', 'aria-label': 'Choose a date' });
    s1.appendChild(el('div', { class: 'cb-block' }, [
      el('div', { class: 'cb-dayhead' }, [el('span', { class: 'cb-label', text: 'Which day?' }), el('div', { class: 'cb-pager' }, [prevW, monthLbl, nextW])]),
      days]));

    var times = el('div', { class: 'cb-times', 'aria-live': 'polite' });
    s1.appendChild(el('div', { class: 'cb-block' }, [el('span', { class: 'cb-label', text: 'What time?' }), times]));
    wrap.appendChild(s1);

    // step 2: details
    var s2 = el('form', { class: 'cb-step cb-details', hidden: '', novalidate: '' });
    var summary = el('div', { class: 'cb-summary' });
    var change = el('button', { type: 'button', class: 'cb-link', text: 'Change', onclick: function () { show(1); } });
    s2.appendChild(el('div', { class: 'cb-sumrow' }, [summary, change]));
    function field(label, attrs) { var i = el(attrs.tag || 'input', attrs); delete attrs.tag; return el('label', { class: 'cb-field' }, [el('span', { text: label }), i]); }
    var fName = field('Name', { name: 'name', autocomplete: 'name', required: '' });
    var fPhone = field('Mobile', { name: 'phone', type: 'tel', autocomplete: 'tel', inputmode: 'tel', required: '' });
    var fEmail = field('Email (for your confirmation)', { name: 'email', type: 'email', autocomplete: 'email', inputmode: 'email', required: '' });
    var fNotes = field('Anything we should know? (optional)', { tag: 'textarea', name: 'notes', rows: '2', placeholder: 'Birthday, high chair, allergies…' });
    var hp = el('input', { name: 'website', tabindex: '-1', autocomplete: 'off', class: 'cb-hp', 'aria-hidden': 'true' });
    var consent = el('input', { type: 'checkbox', name: 'consent', required: '' });
    s2.appendChild(el('div', { class: 'cb-grid' }, [fName, fPhone, fEmail]));
    s2.appendChild(fNotes);
    s2.appendChild(hp);
    s2.appendChild(el('label', { class: 'cb-consent' }, [consent, el('span', { html: 'I agree to Carlo Italia using these details to manage my booking. <a href="privacy.html">Privacy</a>' })]));
    var err = el('p', { class: 'cb-error', role: 'alert' });
    var submit = el('button', { type: 'submit', class: 'button cb-submit', text: 'Confirm booking' });
    s2.appendChild(err);
    s2.appendChild(submit);
    wrap.appendChild(s2);

    // step 3: done
    var s3 = el('div', { class: 'cb-step cb-done', hidden: '', tabindex: '-1' });
    wrap.appendChild(s3);

    function show(n) {
      s1.hidden = n !== 1; s2.hidden = n !== 2; s3.hidden = n !== 3;
      if (n === 3) { try { s3.focus({ preventScroll: true }); } catch (e) { } }
      var r = root.getBoundingClientRect(); if (r.top < 0 || r.top > window.innerHeight * 0.6) root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function maxG() { return Math.min(MAXG, (state.cfg && state.cfg.maxOnline) || MAXG); }
    function setSize(n) {
      state.size = Math.max(1, Math.min(maxG(), n));
      [].forEach.call(sizes.children, function (b) { var on = +b.getAttribute('data-n') === state.size; b.setAttribute('aria-checked', on ? 'true' : 'false'); b.disabled = +b.getAttribute('data-n') > maxG(); });
      bigNote.classList.toggle('on', state.size >= maxG());
      if (state.date) loadTimes();
    }
    function isOpen(d) {
      var c = state.cfg; if (!c) return true;
      return c.openDays.indexOf(d.getDay()) > -1 && c.closed.indexOf(iso(d)) < 0;
    }
    var PER = 14, pg = 0;
    function startDay() { return state.cfg ? parse(state.cfg.today) : new Date(); }
    function lastPage() { return Math.floor((((state.cfg && state.cfg.maxDays) || 120)) / PER); }
    function page(dir) { pg = Math.max(0, Math.min(lastPage(), pg + dir)); buildDays(); }
    function buildDays() {
      days.innerHTML = '';
      var s = startDay(), first = null, months = [];
      for (var i = pg * PER; i < pg * PER + PER; i++) {
        var d = new Date(s.getFullYear(), s.getMonth(), s.getDate() + i), open = isOpen(d), v = iso(d);
        if (months.indexOf(MON[d.getMonth()]) < 0) months.push(MON[d.getMonth()]);
        var b = el('button', { type: 'button', class: 'cb-day', role: 'radio', 'data-date': v, 'aria-checked': state.date === v ? 'true' : 'false',
          'aria-label': (i === 0 ? 'Today, ' : i === 1 ? 'Tomorrow, ' : '') + DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()] + (open ? '' : ', closed') },
          [el('small', { text: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : DAYS[d.getDay()] }), el('b', { text: String(d.getDate()) })]);
        if (!open) b.disabled = true; else if (!first) first = v;
        b.addEventListener('click', (function (v) { return function () { pickDate(v); }; })(v));
        days.appendChild(b);
      }
      monthLbl.textContent = months.join(' / ');
      prevW.disabled = pg === 0; nextW.disabled = pg >= lastPage();
      return first;
    }
    function pickDate(v) {
      state.date = v; state.time = null;
      [].forEach.call(days.children, function (b) { b.setAttribute('aria-checked', b.getAttribute('data-date') === v ? 'true' : 'false'); });
      loadTimes();
    }
    var reqN = 0;
    function loadTimes() {
      var my = ++reqN, d = parse(state.date);
      times.innerHTML = '';
      if (!isOpen(d)) { times.appendChild(el('p', { class: 'cb-hint', text: 'We are closed that day. Please pick another date.' })); return; }
      times.appendChild(el('div', { class: 'cb-timegrid cb-loading' }, [el('i'), el('i'), el('i'), el('i'), el('i'), el('i'), el('i'), el('i')]));
      get({ a: 'slots', date: state.date, size: state.size }).then(function (r) {
        if (my !== reqN) return;
        times.innerHTML = '';
        if (!r.ok) throw new Error(r.error);
        if (!r.times.length) { times.appendChild(el('p', { class: 'cb-hint', html: 'Nothing free online for ' + state.size + ' that day. Try another day, or call <a href="' + TEL + '">' + PHONE + '</a>.' })); return; }
        var groups = [['Lunch', r.times.filter(function (t) { return t < '17:00'; })], ['Dinner', r.times.filter(function (t) { return t >= '17:00'; })]];
        groups.forEach(function (gp) {
          if (!gp[1].length) return;
          var grid = el('div', { class: 'cb-timegrid' });
          gp[1].forEach(function (t) {
            grid.appendChild(el('button', { type: 'button', class: 'cb-time', text: fmtTime(t), onclick: function () { state.time = t; toDetails(); } }));
          });
          times.appendChild(el('div', { class: 'cb-tgroup' }, [el('span', { class: 'cb-sub', text: gp[0] }), grid]));
        });
      }).catch(function () {
        if (my !== reqN) return;
        times.innerHTML = '';
        times.appendChild(el('p', { class: 'cb-hint', html: 'We could not load times just now. Please try again, or call <a href="' + TEL + '">' + PHONE + '</a>.' }));
      });
    }
    function niceDate(v) { var d = parse(v); return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()]; }
    function toDetails() {
      summary.innerHTML = '';
      summary.appendChild(el('b', { text: niceDate(state.date) + ', ' + fmtTime(state.time) }));
      summary.appendChild(el('span', { text: state.size + (state.size === 1 ? ' guest' : ' guests') }));
      err.textContent = '';
      show(2);
    }
    s2.addEventListener('submit', function (ev) {
      ev.preventDefault();
      err.textContent = '';
      if (!s2.reportValidity()) return;
      submit.disabled = true; submit.textContent = 'Booking…';
      var body = { a: 'book', size: state.size, date: state.date, time: state.time, name: fName.querySelector('input').value, email: fEmail.querySelector('input').value, phone: fPhone.querySelector('input').value, notes: fNotes.querySelector('textarea').value, consent: consent.checked, website: hp.value };
      // The booking is saved before the confirmation emails and alerts go out, so if the reply is slow or the
      // connection drops, sending the same details again is safe: the server spots the duplicate and returns it.
      function attempt(n) {
        return post(body).catch(function (e) {
          if (n >= 3) throw e;
          submit.textContent = 'Confirming…';
          return new Promise(function (res) { setTimeout(res, 2500 * n); }).then(function () { return attempt(n + 1); });
        });
      }
      attempt(1)
        .then(function (r) {
          if (r.ok) {
            s3.innerHTML = '';
            s3.appendChild(el('div', { class: 'cb-tick', 'aria-hidden': 'true', html: '<svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg>' }));
            s3.appendChild(el('h3', { text: 'You’re booked in' }));
            s3.appendChild(el('p', { class: 'cb-big', text: r.when }));
            s3.appendChild(el('p', { text: r.size + (+r.size === 1 ? ' guest' : ' guests') + ', reference ' + r.id }));
            s3.appendChild(el('p', { class: 'cb-hint', text: 'We have emailed your confirmation to ' + fEmail.querySelector('input').value + '. It has a link to cancel if your plans change.' }));
            show(3);
          } else {
            err.textContent = r.msg || 'Something went wrong. Please try again or call ' + PHONE + '.';
            if (r.error === 'taken') { setTimeout(function () { show(1); loadTimes(); }, 1800); }
          }
        })
        .catch(function () { err.textContent = 'We could not reach the booking system. Please try again, or call ' + PHONE + '.'; })
        .then(function () { submit.disabled = false; submit.textContent = 'Confirm booking'; });
    });

    setSize(2);
    times.appendChild(el('p', { class: 'cb-hint', text: 'Pick a day to see the free times.' }));
    buildDays();
    get({ a: 'cfg' }).then(function (c) {
      if (!c || !c.ok) return;
      state.cfg = c; setSize(state.size);
      var first = buildDays();
      if (!first) { page(1); first = days.querySelector('.cb-day:not(:disabled)'); first = first && first.getAttribute('data-date'); }
      if (first && !state.date) pickDate(first);
    }).catch(function () { });
  }

  function init() { [].forEach.call(document.querySelectorAll('[data-carlo-booking]'), mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
