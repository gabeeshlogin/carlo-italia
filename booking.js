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

    // step 1: guests, date, time
    var s1 = el('div', { class: 'cb-step' });
    var sizeOut = el('output', { class: 'cb-size', text: '2' });
    var minus = el('button', { type: 'button', class: 'cb-round', 'aria-label': 'Fewer guests', text: '−', onclick: function () { setSize(state.size - 1); } });
    var plus = el('button', { type: 'button', class: 'cb-round', 'aria-label': 'More guests', text: '+', onclick: function () { setSize(state.size + 1); } });
    var bigNote = el('p', { class: 'cb-note', html: 'More than 8 of you? Call us on <a href="' + TEL + '">' + PHONE + '</a> and we will sort it.' });
    s1.appendChild(el('div', { class: 'cb-row' }, [el('span', { class: 'cb-label', text: 'Guests' }), el('div', { class: 'cb-stepper' }, [minus, sizeOut, plus])]));
    s1.appendChild(bigNote);

    s1.appendChild(el('span', { class: 'cb-label', text: 'Date' }));
    var days = el('div', { class: 'cb-days', role: 'listbox', 'aria-label': 'Choose a date' });
    var other = el('input', { type: 'date', class: 'cb-other', 'aria-label': 'Or pick another date' });
    s1.appendChild(days);
    s1.appendChild(el('label', { class: 'cb-otherwrap' }, ['Later date: ', other]));

    s1.appendChild(el('span', { class: 'cb-label', text: 'Time' }));
    var times = el('div', { class: 'cb-times', 'aria-live': 'polite' }, [el('p', { class: 'cb-hint', text: 'Pick a date to see the free times.' })]);
    s1.appendChild(times);
    wrap.appendChild(s1);

    // step 2: details
    var s2 = el('form', { class: 'cb-step cb-details', hidden: '', novalidate: '' });
    var summary = el('div', { class: 'cb-summary' });
    var change = el('button', { type: 'button', class: 'cb-link', text: 'Change', onclick: function () { show(1); } });
    s2.appendChild(el('div', { class: 'cb-sumrow' }, [summary, change]));
    function field(label, attrs) { var i = el(attrs.tag || 'input', attrs); delete attrs.tag; return el('label', { class: 'cb-field' }, [el('span', { text: label }), i]); }
    var fName = field('Your name', { name: 'name', autocomplete: 'name', required: '' });
    var fEmail = field('Email', { name: 'email', type: 'email', autocomplete: 'email', required: '' });
    var fPhone = field('Mobile', { name: 'phone', type: 'tel', autocomplete: 'tel', required: '' });
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
      var t = n === 1 ? s1 : n === 2 ? s2 : s3;
      if (n !== 1) { try { (n === 2 ? fName.querySelector('input') : s3).focus({ preventScroll: true }); } catch (e) { } }
      var r = root.getBoundingClientRect(); if (r.top < 0) root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function setSize(n) {
      state.size = Math.max(1, Math.min((state.cfg && state.cfg.maxOnline) || 8, n));
      sizeOut.textContent = state.size;
      minus.disabled = state.size <= 1; plus.disabled = state.size >= ((state.cfg && state.cfg.maxOnline) || 8);
      bigNote.classList.toggle('on', state.size >= ((state.cfg && state.cfg.maxOnline) || 8));
      if (state.date) loadTimes();
    }
    function isOpen(d) {
      var c = state.cfg; if (!c) return true;
      return c.openDays.indexOf(d.getDay()) > -1 && c.closed.indexOf(iso(d)) < 0;
    }
    function buildDays() {
      days.innerHTML = '';
      var start = state.cfg ? parse(state.cfg.today) : new Date();
      for (var i = 0; i < 21; i++) {
        var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), open = isOpen(d), v = iso(d);
        var b = el('button', { type: 'button', class: 'cb-day', role: 'option', 'data-date': v, 'aria-selected': 'false' },
          [el('small', { text: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : DAYS[d.getDay()] }), el('b', { text: String(d.getDate()) }), el('small', { text: open ? MON[d.getMonth()] : 'Closed' })]);
        if (!open) b.disabled = true;
        b.addEventListener('click', (function (v) { return function () { pickDate(v); }; })(v));
        days.appendChild(b);
      }
      other.min = iso(start);
      var max = new Date(start.getFullYear(), start.getMonth(), start.getDate() + ((state.cfg && state.cfg.maxDays) || 120));
      other.max = iso(max);
    }
    function pickDate(v) {
      state.date = v; state.time = null;
      [].forEach.call(days.children, function (b) { b.setAttribute('aria-selected', b.getAttribute('data-date') === v ? 'true' : 'false'); });
      if (!days.querySelector('[data-date="' + v + '"]')) other.value = v; else other.value = '';
      loadTimes();
    }
    other.addEventListener('change', function () { if (other.value) pickDate(other.value); });
    var reqN = 0;
    function loadTimes() {
      var my = ++reqN, d = parse(state.date);
      times.innerHTML = '';
      if (!isOpen(d)) { times.appendChild(el('p', { class: 'cb-hint', text: 'We are closed that day. Please pick another date.' })); return; }
      times.appendChild(el('div', { class: 'cb-loading' }, [el('i'), el('i'), el('i'), el('i'), el('i'), el('i')]));
      get({ a: 'slots', date: state.date, size: state.size }).then(function (r) {
        if (my !== reqN) return;
        times.innerHTML = '';
        if (!r.ok) throw new Error(r.error);
        if (!r.times.length) { times.appendChild(el('p', { class: 'cb-hint', html: 'Sorry, there is nothing free for ' + state.size + ' that day online. Try another date, or call <a href="' + TEL + '">' + PHONE + '</a>.' })); return; }
        var grid = el('div', { class: 'cb-timegrid' });
        r.times.forEach(function (t) {
          grid.appendChild(el('button', { type: 'button', class: 'cb-time', text: fmtTime(t), onclick: function () { state.time = t; toDetails(); } }));
        });
        times.appendChild(grid);
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
    buildDays();
    get({ a: 'cfg' }).then(function (c) { if (c && c.ok) { state.cfg = c; buildDays(); setSize(state.size); } }).catch(function () { });
  }

  function init() { [].forEach.call(document.querySelectorAll('[data-carlo-booking]'), mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
