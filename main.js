/* MINERDA — interaction layer.
   Fails to visible: every reveal is un-hidden by CSS class, a safety timer,
   a load sweep and a reduced-motion branch. No JS → full content. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* ?qa=1 — static capture mode used for screenshot QA; no effect in normal use. */
  var qa = /[?&]qa=1/.test(location.search);
  if (qa) document.documentElement.classList.add('qa');

  /* Where the enquiry form posts. FormSubmit needs one activation click in the
     inbox below before the first message is delivered. */
  var FORM_ENDPOINT = 'https://formsubmit.co/bfr082@gmail.com';

  /* ── nav ─────────────────────────────────────────────── */
  var nav = document.getElementById('nav');
  var toggle = document.getElementById('navToggle');
  var panel = document.getElementById('navPanel');

  var onScroll = function () {
    nav.classList.toggle('is-stuck', window.scrollY > 24);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  /* embedded webviews can swallow scroll events — a sentinel observer
     drives the same class from layout position instead */
  if ('IntersectionObserver' in window) {
    var sentinel = document.createElement('div');
    sentinel.style.cssText = 'position:absolute;top:24px;left:0;width:1px;height:1px;pointer-events:none';
    document.body.prepend(sentinel);
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        nav.classList.toggle('is-stuck', !e.isIntersecting && e.boundingClientRect.top < 0);
      });
    }).observe(sentinel);
  }

  var setMenu = function (open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Uždaryti meniu' : 'Atidaryti meniu');
    panel.hidden = !open;
  };
  toggle.addEventListener('click', function () {
    setMenu(toggle.getAttribute('aria-expanded') !== 'true');
  });
  panel.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') setMenu(false);
  });

  /* ── reveal ──────────────────────────────────────────── */
  var revealables = [].slice.call(document.querySelectorAll('.rv'));
  /* 70ms stagger, restarted per section, capped at six steps */
  [].slice.call(document.querySelectorAll('section, footer')).forEach(function (sec) {
    [].slice.call(sec.querySelectorAll('.rv')).forEach(function (el, i) {
      el.style.setProperty('--rd', Math.min(i, 5) * 70 + 'ms');
    });
  });
  var showAll = function () {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  };

  if (reduce || qa || !('IntersectionObserver' in window)) {
    showAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    revealables.forEach(function (el) { io.observe(el); });
    setTimeout(showAll, 2500);
    window.addEventListener('load', function () {
      revealables.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight) el.classList.add('is-in');
      });
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) setTimeout(showAll, 1200);
    });
  }

  /* ── lightbox ────────────────────────────────────────── */
  var shots = [
    ['g01', 'Galinio sparno arka — juostos ties įlenkimu susilaužo'],
    ['g02', 'Variklio dangtis — šviesos lenta rodo pažeidimo ribas'],
    ['g03', 'Durų plokštuma tarp dviejų šviesos lentų'],
    ['g04', 'Porsche Cayenne GTS po poliravimo'],
    ['g05', 'Tesla Model S — šešiakampiai lubų atspindžiai'],
    ['g07', 'BMW X5 po kėbulo atnaujinimo'],
    ['g08', 'BMW — tolygus atspindys per visą šoną'],
    ['g10', 'Škoda Superb studijos apšvietime']
  ];

  /* video: plays while its block is in view, pauses when it leaves */
  var vid = document.getElementById('pdrVid');
  if (vid && !reduce && !qa) {
    var playVid = function () {
      var pr = vid.play();
      if (pr && pr.catch) pr.catch(function () {});
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) playVid(); else vid.pause();
        });
      }, { rootMargin: '120px' }).observe(vid);
    } else { playVid(); }
  }

  var lb = document.getElementById('lb');
  var lbImg = document.getElementById('lbImg');
  var lbCap = document.getElementById('lbCap');
  var idx = 0;
  var lastFocus = null;

  var render = function () {
    var s = shots[idx];
    lbImg.src = 'img/' + s[0] + '-lg.webp';
    lbImg.alt = s[1];
    lbCap.textContent = s[1];
  };
  var open = function (i) {
    idx = i; lastFocus = document.activeElement;
    render(); lb.hidden = false;
    document.body.style.overflow = 'hidden';
    document.getElementById('lbX').focus();
  };
  var close = function () {
    lb.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  };
  var step = function (d) {
    idx = (idx + d + shots.length) % shots.length;
    render();
  };

  [].slice.call(document.querySelectorAll('.gal__i')).forEach(function (b) {
    b.addEventListener('click', function () { open(parseInt(b.dataset.i, 10)); });
  });
  document.getElementById('lbX').addEventListener('click', close);
  document.getElementById('lbP').addEventListener('click', function () { step(-1); });
  document.getElementById('lbN').addEventListener('click', function () { step(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });

  /* ── form ────────────────────────────────────────────── */
  var form = document.getElementById('form');
  var status = document.getElementById('status');
  var submit = document.getElementById('submit');
  var fileIn = document.getElementById('f-file');
  var fileNote = document.getElementById('fileNote');
  var MAX = 8 * 1024 * 1024;

  var setErr = function (id, msg) {
    var field = document.getElementById(id).closest('.field');
    field.classList.toggle('is-bad', !!msg);
    field.querySelector('[data-err-for="' + id + '"]').textContent = msg || '';
    return !msg;
  };

  fileIn.addEventListener('change', function () {
    var f = fileIn.files[0];
    if (!f) { fileNote.hidden = true; setErr('f-file', ''); return; }
    if (f.size > MAX) {
      fileNote.hidden = true;
      setErr('f-file', 'Nuotrauka per didelė (' + Math.round(f.size / 1048576) + ' MB). Riba — 8 MB.');
      return;
    }
    setErr('f-file', '');
    fileNote.hidden = false;
    fileNote.textContent = f.name + ' · ' + Math.max(1, Math.round(f.size / 1024)) + ' KB';
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = document.getElementById('f-name');
    var tel = document.getElementById('f-tel');
    var ok = true;

    ok = setErr('f-name', name.value.trim().length < 2 ? 'Įrašykite vardą.' : '') && ok;
    var digits = tel.value.replace(/\D/g, '');
    ok = setErr('f-tel', digits.length < 8 ? 'Įrašykite telefono numerį, kad galėtume atsakyti.' : '') && ok;
    var f = fileIn.files[0];
    if (f && f.size > MAX) ok = setErr('f-file', 'Nuotrauka per didelė. Riba — 8 MB.') && ok;

    if (!ok) {
      status.className = 'form__status is-bad';
      status.textContent = 'Patikrinkite pažymėtus laukus.';
      form.querySelector('.is-bad input, .is-bad textarea').focus();
      return;
    }

    var data = new FormData(form);
    data.append('_subject', 'Minerda — užklausa iš svetainės');
    data.append('_captcha', 'false');
    data.append('_template', 'table');

    submit.disabled = true;
    submit.textContent = 'Siunčiama…';
    status.className = 'form__status';
    status.textContent = '';

    fetch(FORM_ENDPOINT, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        form.reset();
        fileNote.hidden = true;
        status.className = 'form__status is-ok';
        status.textContent = 'Užklausa išsiųsta. Susisieksime telefonu artimiausiu metu.';
        submit.textContent = 'Išsiųsta';
      })
      .catch(function () {
        status.className = 'form__status is-bad';
        status.innerHTML = 'Nepavyko išsiųsti. Paskambinkite <a href="tel:+37063333969">+370 633 33969</a> arba parašykite per Messenger.';
        submit.disabled = false;
        submit.textContent = 'Įvertinti pagal nuotrauką';
      });
  });

  /* ?qa=1&y=N — park the page at a fixed offset for screenshot QA. */
  if (qa) {
    var yq = /[?&]y=(\d+)/.exec(location.search);
    if (yq) {
      var jump = function () { window.scrollTo(0, parseInt(yq[1], 10)); };
      jump(); window.addEventListener('load', jump); setTimeout(jump, 300);
    }
  }

  /* ── year ────────────────────────────────────────────── */
  document.getElementById('yr').textContent = new Date().getFullYear();
})();
