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

  /* ── smooth scroll: Lenis, lerp only ─────────────────────
     rAF loop is self-stopping: it runs while the user scrolls and dies a
     few hundred ms after the last input, so an idle page schedules no
     frames (the client's document_idle requirement). */
  var lenis = null;
  if (!reduce && !qa && window.Lenis && window.matchMedia('(min-width:761px)').matches) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false, autoRaf: false });
    var rafId = null, lastHit = 0;
    var tick = function (t) {
      lenis.raf(t);
      if (lenis.isScrolling || performance.now() - lastHit < 400) {
        rafId = requestAnimationFrame(tick);
      } else { rafId = null; }
    };
    var wake = function () {
      lastHit = performance.now();
      if (rafId === null) rafId = requestAnimationFrame(tick);
    };
    ['wheel', 'touchstart', 'keydown'].forEach(function (ev) {
      window.addEventListener(ev, wake, { passive: true });
    });
    /* in-page anchors go through Lenis so they glide instead of jumping */
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute('href').length < 2) return;
      var target = document.getElementById(a.getAttribute('href').slice(1));
      if (!target) return;
      e.preventDefault();
      wake();
      lenis.scrollTo(target, { offset: -96 });
    });
  }

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

  /* ── before/after index: current pair follows the scroll ── */
  var baIndex = document.getElementById('baIndex');
  if (baIndex && 'IntersectionObserver' in window) {
    var items = [].slice.call(baIndex.querySelectorAll('a'));
    var mark = function (id) {
      items.forEach(function (a) {
        a.parentNode.classList.toggle('is-cur', a.getAttribute('href') === '#' + id);
      });
    };
    var pairIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) mark(e.target.id);
      });
    }, { rootMargin: '-35% 0px -45% 0px' });
    ['p-bortelis', 'p-arka', 'p-briauna', 'p-sparnas'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) pairIO.observe(el);
    });
    mark('p-bortelis');
  }

  /* ── lightbox ────────────────────────────────────────── */
  var shots = [
    ['gal-m4', 'BMW M4 · matinis žalias kėbulas'],
    ['gal-i5-front', 'BMW i5 · šešiakampis atspindys kapote'],
    ['gal-i5-rear', 'BMW i5 · galas studijos šviesoje']
  ];

  /* video: plays only while its block is in view AND the tab is visible —
     a looping video left decoding in a hidden tab never lets the page idle */
  var vid = document.getElementById('pdrVid');
  /* self!==top: QA/fit harnesses load the page in an iframe — a looping video
     there deadlocks virtual-time measurement */
  if (vid && !reduce && !qa && window.self === window.top) {
    var vidInView = false;
    var playVid = function () {
      if (document.hidden || !vidInView) return;
      var pr = vid.play();
      if (pr && pr.catch) pr.catch(function () {});
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          vidInView = e.isIntersecting;
          if (vidInView) playVid(); else vid.pause();
        });
      }, { rootMargin: '120px' }).observe(vid);
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) vid.pause(); else playVid();
      });
    }
  }

  var lb = document.getElementById('lb');
  var lbImg = document.getElementById('lbImg');
  var lbCap = document.getElementById('lbCap');
  var idx = 0;
  var lastFocus = null;

  var render = function () {
    var s = shots[idx];
    lbImg.src = 'img/' + s[0] + '.webp';
    lbImg.alt = s[1];
    lbCap.textContent = s[1];
  };
  /* iOS Safari ignoruoja body overflow:hidden — fonas rakinama per position:fixed */
  var lockY = 0;
  var open = function (i) {
    idx = i; lastFocus = document.activeElement;
    render(); lb.hidden = false;
    lockY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = -lockY + 'px';
    document.body.style.width = '100%';
    if (lenis) lenis.stop();
    document.getElementById('lbX').focus();
  };
  var close = function () {
    lb.hidden = true;
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, lockY);
    if (lenis) lenis.start();
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
      setErr('f-file', 'Nuotrauka per didelė (' + Math.round(f.size / 1048576) + ' MB). Riba yra 8 MB.');
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
    if (f && f.size > MAX) ok = setErr('f-file', 'Nuotrauka per didelė. Riba yra 8 MB.') && ok;

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
