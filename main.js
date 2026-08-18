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

  /* ── before / after ──────────────────────────────────── */
  var pairs = [
    { b: 'ba1-before', a: 'ba1-after', w: 1080, meta: 'Mercedes-Benz · galinis sparnas',
      txt: 'Įlenkimas ties rato arka. Juostos susilaužo tiksliai ties pažeidimu — po lyginimo jos vėl seka arkos liniją.',
      altB: 'Galinis sparnas prieš remontą: šviesos lentos juostos ties įlenkimu susilaužo zigzagu',
      altA: 'Tas pats sparnas po lyginimo: juostos vėl tolygios' },
    { b: 'ba2-before', a: 'ba2-after', w: 1212, meta: 'Alfa Romeo · variklio dangtis',
      txt: 'Kelios įlenkimų zonos per visą dangtį. Šešiakampis lubų tinklas prieš darbą išsilieja dėmėmis, po jo — vėl taisyklingas.',
      altB: 'Variklio dangtis prieš remontą: šešiakampis šviesos tinklas išsilieja dėmėmis',
      altA: 'Tas pats dangtis po PDR: šešiakampiai vėl taisyklingi' },
    { b: 'ba3-before', a: 'ba3-after', w: 1080, meta: 'Mercedes-Benz · šoninė plokštuma',
      txt: 'Šoninė plokštuma prie degalų dangtelio. Ta pati šviesos lenta, ta pati padėtis — skiriasi tik linijos.',
      altB: 'Šoninė plokštuma prieš remontą: šviesos juostos banguoja',
      altA: 'Ta pati plokštuma po remonto: šviesos juostos tiesios' },
    { b: 'ba4-before', a: 'ba4-after', w: 1212, meta: 'Alfa Romeo · dangtis iš kampo',
      txt: 'Kampas — griežčiausias testas: jis parodo bangas, kurių žiūrint tiesiai nematyti.',
      altB: 'Dangtis iš kampo prieš remontą: atspindys banguoja',
      altA: 'Dangtis iš to paties kampo po remonto: atspindys tiesus' }
  ];

  var stage = document.getElementById('baStage');
  var imgB = document.getElementById('baB');
  var imgA = document.getElementById('baA');
  var handle = document.getElementById('baHandle');
  var after = stage.querySelector('.ba__after');
  var metaEl = document.getElementById('baMeta');
  var txtEl = document.getElementById('baTxt');
  var pct = 50;
  var dragging = false;

  var apply = function (v) {
    pct = Math.max(0, Math.min(100, v));
    after.style.clipPath = 'inset(0 0 0 ' + pct + '%)';
    handle.style.left = pct + '%';
    handle.setAttribute('aria-valuenow', String(Math.round(pct)));
    handle.setAttribute('aria-valuetext', Math.round(pct) + ' % po');
  };
  var fromEvent = function (e) {
    var box = stage.getBoundingClientRect();
    apply(((e.clientX - box.left) / box.width) * 100);
  };

  /* Above 760px the comparison is scrubbed by the pinned section; on phones
     (and under reduced motion) it stays a plain draggable slider. */
  var pinWrap = document.getElementById('pinWrap');
  var pinOn = !reduce && !qa && window.matchMedia('(min-width:761px)').matches;

  if (pinOn) {
    handle.setAttribute('aria-hidden', 'true');
    handle.setAttribute('tabindex', '-1');
    handle.removeAttribute('role');

    var cur = 0.5, raf = null, live = false;
    var progress = function () {
      var r = pinWrap.getBoundingClientRect();
      var total = r.height - window.innerHeight;
      if (total <= 0) return 0.5;
      return Math.max(0, Math.min(1, -r.top / total));
    };
    var tick = function () {
      var target = 0.15 + progress() * 0.70;
      cur += (target - cur) * 0.08;
      apply(cur * 100);
      raf = live ? requestAnimationFrame(tick) : null;
    };
    var setLive = function (on) {
      if (on === live) return;
      live = on;
      if (on && !raf) raf = requestAnimationFrame(tick);
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { setLive(e.isIntersecting); });
      }, { rootMargin: '10% 0px' }).observe(pinWrap);
    } else { setLive(true); }
  } else {
    stage.addEventListener('pointerdown', function (e) {
      dragging = true;
      stage.setPointerCapture(e.pointerId);
      fromEvent(e);
    });
    stage.addEventListener('pointermove', function (e) { if (dragging) fromEvent(e); });
    ['pointerup', 'pointercancel'].forEach(function (t) {
      stage.addEventListener(t, function () { dragging = false; });
    });
    handle.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 10 : 4;
      if (e.key === 'ArrowLeft') { apply(pct - step); e.preventDefault(); }
      if (e.key === 'ArrowRight') { apply(pct + step); e.preventDefault(); }
      if (e.key === 'Home') { apply(0); e.preventDefault(); }
      if (e.key === 'End') { apply(100); e.preventDefault(); }
    });
  }

  var setPair = function (i) {
    var p = pairs[i];
    var swap = function (img, key, alt) {
      img.src = 'img/' + p[key] + '-lg.webp';
      img.srcset = 'img/' + p[key] + '-sm.webp 700w, img/' + p[key] + '-lg.webp ' + p.w + 'w';
      img.width = p.w;
      img.height = Math.round(p.w / 1.5);
      img.alt = alt;
    };
    stage.classList.add('is-swapping');
    swap(imgB, 'b', p.altB);
    swap(imgA, 'a', p.altA);
    metaEl.textContent = p.meta;
    txtEl.textContent = p.txt;
    if (!pinOn) apply(50);
    setTimeout(function () { stage.classList.remove('is-swapping'); }, 40);
  };

  [].slice.call(document.querySelectorAll('.pairs__b')).forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.pairs__b').forEach(function (o) { o.classList.remove('is-on'); });
      b.classList.add('is-on');
      setPair(parseInt(b.dataset.p, 10));
    });
  });

  apply(50);

  /* ── lightbox ────────────────────────────────────────── */
  var shots = [
    ['g01', 'Galinio sparno arka — juostos ties įlenkimu susilaužo'],
    ['g02', 'Variklio dangtis — šviesos lenta rodo pažeidimo ribas'],
    ['g03', 'Durų plokštuma tarp dviejų šviesos lentų'],
    ['g04', 'Porsche Cayenne GTS po poliravimo'],
    ['g05', 'Tesla Model S — šešiakampiai lubų atspindžiai'],
    ['g06', 'Lamborghini Urus Minerda studijoje'],
    ['g07', 'BMW X5 po kėbulo atnaujinimo'],
    ['g08', 'BMW — tolygus atspindys per visą šoną'],
    ['g09', 'Volvo XC60 po poliravimo'],
    ['g10', 'Škoda Superb studijos apšvietime'],
    ['g11', 'BMW M3 Competition — projektas baigtas'],
    ['g12', 'Lamborghini Urus — stabdžių apkaba ir ratlankis']
  ];

  /* video: source attached only when the block approaches the viewport */
  var vid = document.getElementById('pdrVid');
  if (vid) {
    var attach = function () {
      if (vid.dataset.on) return;
      vid.dataset.on = '1';
      vid.src = 'img/pdr.mp4';
      if (!reduce) { var pr = vid.play(); if (pr && pr.catch) pr.catch(function () {}); }
    };
    if ('IntersectionObserver' in window) {
      var vio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { attach(); vio.disconnect(); } });
      }, { rootMargin: '300px' });
      vio.observe(vid);
    } else { attach(); }
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
        submit.textContent = 'Gauti kainos įvertinimą';
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
