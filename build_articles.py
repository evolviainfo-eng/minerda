#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Straipsnių generatorius — be priklausomybių, statinis išėjimas Apache'ui.

  python3 build_articles.py

  content/<slug>.md  →  straipsniai/<slug>/index.html      (straipsnis)
                     →  straipsniai/index.html             (sąrašas)
                     →  index.html  <!-- ARTICLES:start/end -->  (kortelė pagrindiniame)
                     →  index.html  <!-- DUK:start/end -->       (8 klausimai + „Visi klausimai")
                     →  duk/index.html                     (visi klausimai + FAQPage JSON-LD)
                     →  sitemap.xml

Naujas straipsnis = naujas content/<slug>.md ir paleisti šį skriptą.
Nav ir footer imami iš index.html, todėl subpuslapiai visada sutampa su pagrindiniu.
Markdown: `# ` H1 (vienas), `## ` H2, `### ` H3, `- ` sąrašai, pastraipos per tuščią
eilutę. Skyrius `## Dažniausiai užduodami klausimai…` verčiamas į <details>.
Turinys neliečiamas — tik struktūra.
"""
import os, re, json, html, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = 'https://minerda.lt'
TODAY = datetime.date.today().isoformat()
STYLES_V = re.search(r'styles\.css\?v=(\w+)', open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()).group(1)
MAIN_V = re.search(r'main\.js\?v=(\w+)', open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()).group(1)

# pagrindinio DUK: 8 klausimai (tikslūs pavadinimai iš straipsnio DUK dalies)
HOME_FAQ = [
    'Kas yra meninis lyginimas?',
    'Kas yra PDR?',
    'Ar galima išlyginti durelių įlenkimą be dažymo?',
    'Ar galima išlyginti įlenkimą ant automobilio sparno?',
    'Ar galima išlyginti kapotą be dažymo?',
    'Ar galima pašalinti krušos įlenkimus be dažymo?',
    'Ar po meninio lyginimo lieka žymių?',
    'Kiek kainuoja įlenkimo lyginimas be dažymo?',
]

E = lambda s: html.escape(s, quote=True)


# ── markdown → blokai ─────────────────────────────────────────────
def parse_md(text):
    """→ dict(title, blocks=[(kind, payload)]) kind ∈ h2,h3,p,ul"""
    lines = text.split('\n')
    title, blocks, para, items = None, [], [], []

    def flush():
        nonlocal para, items
        if para:
            blocks.append(('p', ' '.join(para).strip())); para = []
        if items:
            blocks.append(('ul', items)); items = []

    for ln in lines:
        s = ln.rstrip()
        if s.startswith('# ') and title is None:
            flush(); title = s[2:].strip()
        elif s.startswith('## '):
            flush(); blocks.append(('h2', s[3:].strip()))
        elif s.startswith('### '):
            flush(); blocks.append(('h3', s[4:].strip()))
        elif s.startswith('- '):
            if para: flush()
            items.append(s[2:].strip())
        elif s == '':
            flush()
        else:
            if items: flush()
            para.append(s.strip())
    flush()
    return {'title': title, 'blocks': blocks}


def split_faq(blocks):
    """Atskiria DUK skyrių: → (blocks_before, faq=[(q, [answer paragraphs])], h2_faq_title, blocks_after)"""
    i = next((k for k, (t, v) in enumerate(blocks) if t == 'h2' and v.startswith('Dažniausiai užduodami klausimai')), None)
    if i is None:
        return blocks, [], None, []
    j = next((k for k in range(i + 1, len(blocks)) if blocks[k][0] == 'h2'), len(blocks))
    faq, q = [], None
    for t, v in blocks[i + 1:j]:
        if t == 'h3':
            q = [v, []]; faq.append(q)
        elif q is not None and t == 'p':
            q[1].append(v)
    return blocks[:i], faq, blocks[i][1], blocks[j:]


def render_blocks(blocks):
    """Straipsnio kūnas: kiekvienas H2 skyrius — atskiras .art__s.rv blokas."""
    out, cur = [], []
    def close():
        if cur:
            out.append('<div class="art__s rv">\n' + '\n'.join(cur) + '\n</div>'); cur.clear()
    for t, v in blocks:
        if t == 'h2':
            close(); cur.append(f'<h2>{E(v)}</h2>')
        elif t == 'h3':
            cur.append(f'<h3>{E(v)}</h3>')
        elif t == 'p':
            cur.append(f'<p>{E(v)}</p>')
        elif t == 'ul':
            cur.append('<ul>\n' + '\n'.join(f'  <li>{E(x)}</li>' for x in v) + '\n</ul>')
    close()
    return '\n'.join(out)


def render_faq(faq, cls='faq'):
    parts = []
    for q, answers in faq:
        body = ''.join(f'<p>{E(a)}</p>' for a in answers)
        parts.append(f'  <details>\n    <summary>{E(q)}</summary>\n    <div>{body}</div>\n  </details>')
    return f'<div class="{cls}">\n' + '\n'.join(parts) + '\n</div>'


def first_sentence(p, limit=170):
    m = re.match(r'(.+?[.!?])(\s|$)', p)
    s = m.group(1) if m else p
    return s if len(s) <= limit else s[:limit].rsplit(' ', 1)[0] + '…'


# ── nav / footer iš index.html, keliai perrašomi pagal root ──────
def chrome(root):
    idx = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    head = re.search(r'<header class="nav".*?</header>', idx, re.S).group(0)
    foot = re.search(r'<footer class="foot".*?</footer>', idx, re.S).group(0)
    bar = re.search(r'<div class="callbar".*?</div>\n', idx, re.S).group(0)
    def rel(s):
        s = s.replace('href="#', f'href="{root}#').replace('href="straipsniai/"', f'href="{root}straipsniai/"').replace('href="duk/"', f'href="{root}duk/"')
        s = s.replace('src="img/', f'src="{root}img/').replace('srcset="img/', f'srcset="{root}img/')
        return s
    return rel(head), rel(foot), rel(bar)


def page(root, title, desc, canonical, body, extra_head='', body_class='', og_type='article'):
    head, foot, bar = chrome(root)
    return f'''<!DOCTYPE html>
<html lang="lt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}">
<meta name="theme-color" content="#121010">
<link rel="canonical" href="{canonical}">
<meta property="og:type" content="{og_type}">
<meta property="og:locale" content="lt_LT">
<meta property="og:site_name" content="Minerda">
<meta property="og:title" content="{E(title)}">
<meta property="og:description" content="{E(desc)}">
<meta property="og:image" content="{SITE}/img/og.jpg">
<meta property="og:url" content="{canonical}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{root}img/icon-64.png" sizes="64x64">
<link rel="icon" href="{root}img/icon-512.png" sizes="512x512">
<link rel="apple-touch-icon" href="{root}img/icon-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style"
      href="https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500&family=IBM+Plex+Mono:wght@400;500&display=swap">
<link rel="stylesheet" media="print" onload="this.media='all'"
      href="https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500&family=IBM+Plex+Mono:wght@400;500&display=swap">
<noscript><link rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500&family=IBM+Plex+Mono:wght@400;500&display=swap"></noscript>
<link rel="stylesheet" href="{root}styles.css?v={STYLES_V}">
<script>document.documentElement.className += ' js';</script>
{extra_head}
</head>
<body class="{body_class}">
<a class="skip" href="#main">Pereiti prie turinio</a>

{head}

<main id="main">
{body}
</main>

{foot}

{bar}
<script src="{root}lenis.min.js"></script>
<script src="{root}main.js?v={MAIN_V}"></script>
</body>
</html>
'''


# ── build ─────────────────────────────────────────────────────────
def build():
    articles = []
    for fn in sorted(os.listdir(os.path.join(ROOT, 'content'))):
        if not fn.endswith('.md'): continue
        slug = fn[:-3]
        md = open(os.path.join(ROOT, 'content', fn), encoding='utf-8').read()
        doc = parse_md(md)
        before, faq, faq_title, after = split_faq(doc['blocks'])
        lead = next(v for t, v in before if t == 'p')
        desc = first_sentence(lead)
        url = f'{SITE}/straipsniai/{slug}/'
        articles.append({'slug': slug, 'title': doc['title'], 'desc': desc, 'url': url,
                         'blocks': before, 'faq': faq, 'faq_title': faq_title, 'after': after})

    # ── straipsnis ──
    for a in articles:
        root = '../../'
        ld = [
            {"@context": "https://schema.org", "@type": "Article", "headline": a['title'],
             "description": a['desc'], "inLanguage": "lt", "datePublished": TODAY, "dateModified": TODAY,
             "image": f"{SITE}/img/og.jpg", "mainEntityOfPage": a['url'],
             "author": {"@type": "Organization", "name": "Minerda", "url": SITE + '/'},
             "publisher": {"@type": "Organization", "name": "Minerda", "url": SITE + '/',
                           "logo": {"@type": "ImageObject", "url": f"{SITE}/img/minerda-logo.png"}}},
            {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Pradžia", "item": SITE + '/'},
                {"@type": "ListItem", "position": 2, "name": "Straipsniai", "item": f"{SITE}/straipsniai/"},
                {"@type": "ListItem", "position": 3, "name": a['title'], "item": a['url']}]},
        ]
        extra = '\n'.join('<script type="application/ld+json">' + json.dumps(x, ensure_ascii=False) + '</script>' for x in ld)
        intro = [b for b in a['blocks'] if b[0] != 'h2' and a['blocks'].index(b) < next(k for k, b2 in enumerate(a['blocks']) if b2[0] == 'h2')]
        rest = a['blocks'][len(intro):]
        body = f'''
<article class="sec sec--art">
  <div class="wrap">
    <nav class="crumbs rv" aria-label="Kelias"><a href="{root}">Pradžia</a><span>·</span><a href="{root}straipsniai/">Straipsniai</a></nav>
    <div class="art">
      <div class="art__s art__lead rv">
        <h1>{E(a['title'])}</h1>
{render_blocks(intro).replace('<div class="art__s rv">', '').replace('</div>', '')}
      </div>
{render_blocks(rest)}
      <div class="art__s rv">
        <h2>{E(a['faq_title'])}</h2>
{render_faq(a['faq'])}
      </div>
{render_blocks(a['after'])}
      <div class="cta rv">
        <p class="cta__t">Atsiųskite įlenkimo nuotrauką, įvertinsime ir atsakysime telefonu arba el. paštu.</p>
        <a class="btn" href="{root}#uzklausa">Įvertinti pagal nuotrauką</a>
      </div>
    </div>
  </div>
</article>
'''
        out = page(root, a['title'], a['desc'], a['url'], body, extra)
        d = os.path.join(ROOT, 'straipsniai', a['slug']); os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(out)
        print('straipsnis:', a['slug'])

    # ── kortelės (sąrašui ir pagrindiniam) ──
    def cards(root):
        return '\n'.join(
            f'      <li class="card rv">\n        <h3><a href="{root}straipsniai/{a["slug"]}/">{E(a["title"])}</a></h3>\n'
            f'        <p>{E(a["desc"])}</p>\n        <a class="card__more" href="{root}straipsniai/{a["slug"]}/">Skaityti</a>\n      </li>'
            for a in articles)

    # ── sąrašas ──
    root = '../'
    ld = json.dumps({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Pradžia", "item": SITE + '/'},
        {"@type": "ListItem", "position": 2, "name": "Straipsniai", "item": f"{SITE}/straipsniai/"}]}, ensure_ascii=False)
    body = f'''
<section class="sec sec--list">
  <div class="wrap">
    <nav class="crumbs rv" aria-label="Kelias"><a href="{root}">Pradžia</a><span>·</span><span>Straipsniai</span></nav>
    <div class="head rv">
      <h1>Straipsniai</h1>
      <p class="lead">Apie meninį lyginimą, poliravimą ir kėbulo priežiūrą.</p>
    </div>
    <ul class="cards">
{cards(root)}
    </ul>
  </div>
</section>
'''
    out = page(root, 'Straipsniai | Minerda', 'Straipsniai apie meninį lyginimą, įlenkimų šalinimą be dažymo, poliravimą ir kėbulo priežiūrą. Minerda, Kaunas.',
               f'{SITE}/straipsniai/', body, '<script type="application/ld+json">' + ld + '</script>', og_type='website')
    os.makedirs(os.path.join(ROOT, 'straipsniai'), exist_ok=True)
    open(os.path.join(ROOT, 'straipsniai', 'index.html'), 'w', encoding='utf-8').write(out)
    print('sąrašas: straipsniai/index.html')

    # ── pagrindinis: kortelė + DUK + FAQPage JSON-LD ──
    ip = os.path.join(ROOT, 'index.html'); idx = open(ip, encoding='utf-8').read()
    idx = re.sub(r'(<!-- ARTICLES:start -->).*?(<!-- ARTICLES:end -->)', lambda m: m.group(1) + '\n' + cards('') + '\n      ' + m.group(2), idx, flags=re.S)
    faq_all = {q: ans for a in articles for q, ans in a['faq']}
    missing = [q for q in HOME_FAQ if q not in faq_all]
    assert not missing, f'DUK klausimai nerasti straipsnyje: {missing}'
    home_faq = [(q, faq_all[q]) for q in HOME_FAQ]
    idx = re.sub(r'(<!-- DUK:start -->).*?(<!-- DUK:end -->)', lambda m: m.group(1) + '\n' + render_faq(home_faq, 'faq rv')
                 + '\n    <p class="cards__all rv"><a href="duk/">Visi klausimai</a></p>\n    ' + m.group(2), idx, flags=re.S)
    # FAQPage JSON-LD gyvena tik /duk/ — pagrindiniame jo neturi būti (dubliavimasis)
    idx = re.sub(r'\n?<script type="application/ld\+json" id="faq-ld">.*?</script>', '', idx, flags=re.S)
    open(ip, 'w', encoding='utf-8').write(idx)
    print('pagrindinis: kortelė + DUK (%d kl.) + „Visi klausimai"' % len(home_faq))

    # ── /duk/: visi klausimai, FAQPage JSON-LD su visais ──
    all_faq = list(faq_all.items())
    root = '../'
    duk_url = f'{SITE}/duk/'
    duk_title = 'Dažniausiai užduodami klausimai'
    duk_desc = 'Atsakymai apie meninį lyginimą ir PDR: durelių, sparno, kapoto ir krušos įlenkimų lyginimas be dažymo, žymės, terminai ir kaina. Minerda, Kaunas.'
    ld = [
        {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": ' '.join(ans)}} for q, ans in all_faq]},
        {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Pradžia", "item": SITE + '/'},
            {"@type": "ListItem", "position": 2, "name": duk_title, "item": duk_url}]},
    ]
    extra = '\n'.join('<script type="application/ld+json">' + json.dumps(x, ensure_ascii=False) + '</script>' for x in ld)
    body = f'''
<section class="sec sec--list sec--dukpage">
  <div class="wrap">
    <nav class="crumbs rv" aria-label="Kelias"><a href="{root}">Pradžia</a><span>·</span><span>DUK</span></nav>
    <div class="head rv">
      <h1>{E(duk_title)}</h1>
    </div>
    <div class="art">
{render_faq(all_faq, 'faq rv')}
      <div class="cta rv">
        <p class="cta__t">Atsiųskite įlenkimo nuotrauką, įvertinsime ir atsakysime telefonu arba el. paštu.</p>
        <a class="btn" href="{root}#uzklausa">Įvertinti pagal nuotrauką</a>
      </div>
    </div>
  </div>
</section>
'''
    out = page(root, duk_title + ' | Minerda', duk_desc, duk_url, body, extra, og_type='website')
    os.makedirs(os.path.join(ROOT, 'duk'), exist_ok=True)
    open(os.path.join(ROOT, 'duk', 'index.html'), 'w', encoding='utf-8').write(out)
    print('duk: duk/index.html (%d kl.) + FAQPage' % len(all_faq))

    # ── sitemap ──
    urls = [(SITE + '/', '1.0'), (f'{SITE}/straipsniai/', '0.6'), (f'{SITE}/duk/', '0.7')] + [(a['url'], '0.8') for a in articles]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(
        f'  <url>\n    <loc>{u}</loc>\n    <lastmod>{TODAY}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>{p}</priority>\n  </url>\n' for u, p in urls) + '</urlset>\n'
    open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8').write(sm)
    print('sitemap: %d URL' % len(urls))


if __name__ == '__main__':
    build()
