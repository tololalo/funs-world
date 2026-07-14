# -*- coding: utf-8 -*-
import os, re

ROOT = '/Users/maesterong/FUNS/Funshome'

LANGS = [
    ('en', 'English',           '🇺🇸'),
    ('ko', '한국어',             '🇰🇷'),
    ('zh', '中文',               '🇨🇳'),
    ('ja', '日本語',             '🇯🇵'),
    ('es', 'Español',           '🇪🇸'),
    ('vi', 'Tiếng Việt',        '🇻🇳'),
    ('ru', 'Русский',           '🇷🇺'),
    ('id', 'Bahasa Indonesia',  '🇮🇩'),
    ('pt', 'Português',         '🇧🇷'),
    ('tr', 'Türkçe',            '🇹🇷'),
]
LANG_MAP = {c: (n, f) for c, n, f in LANGS}

TYPE_DEPTH = {
    'home': 0, 'talk': 1, 'wallet': 1,
    'talk-download': 2, 'wallet-download': 2, 'download-app': 1,
}
TYPE_PATH = {
    'home': '', 'talk': 'talk/', 'wallet': 'wallet/',
    'talk-download': 'talk/download/', 'wallet-download': 'wallet/download/',
    'download-app': 'download-app/',
}

def lang_prefix(lang):
    return '' if lang == 'en' else lang + '/'

def total_depth(lang, ptype):
    return (0 if lang == 'en' else 1) + TYPE_DEPTH[ptype]

def up(n):
    return '../' * n

def href_to(lang, ptype, to_lang, to_ptype):
    d = total_depth(lang, ptype)
    h = up(d) + lang_prefix(to_lang) + TYPE_PATH[to_ptype]
    return h if h else './'

def asset(lang, ptype, relpath):
    d = total_depth(lang, ptype)
    return up(d) + relpath

def file_path(lang, ptype):
    d0 = ROOT
    if lang != 'en':
        d0 = os.path.join(d0, lang)
    sub = TYPE_PATH[ptype]
    d0 = os.path.join(d0, sub) if sub else d0
    return os.path.join(d0, 'index.html')

print("build.py helpers loaded OK")
if __name__ == '__main__':
    # sanity checks
    assert href_to('en','home','en','talk') == 'talk/'
    assert href_to('en','home','ko','home') == 'ko/'
    assert href_to('en','talk','ko','talk') == '../ko/talk/'
    assert href_to('ko','home','en','home') == '../'
    assert href_to('ko','talk','en','talk') == '../../talk/'
    assert href_to('ko','talk','zh','talk') == '../../zh/talk/'
    assert href_to('ko','talk-download','en','talk-download') == '../../../talk/download/'
    assert asset('en','talk','images/funs-nugi.png') == '../images/funs-nugi.png'
    assert asset('ko','talk-download','images/funs-nugi.png') == '../../../images/funs-nugi.png'
    assert file_path('en','home').endswith('Funshome/index.html')
    assert file_path('ko','talk').endswith('Funshome/ko/talk/index.html')
    print("ALL SANITY CHECKS PASSED")

CTA_LABEL = {
    'en': 'Get the App', 'ko': '앱 다운로드', 'zh': '获取应用', 'ja': 'アプリを入手',
    'es': 'Obtener la App', 'vi': 'Tải ứng dụng', 'ru': 'Получить приложение',
    'id': 'Dapatkan Aplikasi', 'pt': 'Baixar o App', 'tr': 'Uygulamayı İndir',
}
CTA_LABEL_TALK = {
    'en': 'Download App', 'ko': '앱 다운로드', 'zh': '获取应用', 'ja': 'アプリを入手',
    'es': 'Obtener la App', 'vi': 'Tải ứng dụng', 'ru': 'Получить приложение',
    'id': 'Dapatkan Aplikasi', 'pt': 'Baixar o App', 'tr': 'Uygulamayı İndir',
}

def nav_logo_href(lang, ptype):
    return href_to(lang, ptype, lang, 'home')

def build_lang_dropdown(lang, ptype, aria_label='Language'):
    cur_name, cur_flag = LANG_MAP[lang]
    items = []
    for code, name, flag in LANGS:
        href = href_to(lang, ptype, code, ptype)
        cls = ' class="on"' if code == lang else ''
        cur = ' aria-current="true"' if code == lang else ''
        items.append(f'      <a href="{href}"{cls}{cur}><span class="flag">{flag}</span> {name}</a>')
    items_html = '\n'.join(items)
    return f'''<details class="lang-dd" aria-label="{aria_label}">
      <summary>{cur_flag} {cur_name} <span class="car">▾</span></summary>
      <div class="lang-menu">
{items_html}
      </div>
    </details>'''

LANG_DD_CSS = '''.lang-dd{position:relative}
.lang-dd summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:20px;font-size:14.5px;font-weight:700;color:var(--ink);background:rgba(34,30,26,.06);white-space:nowrap}
.lang-dd summary::-webkit-details-marker{display:none}
.lang-dd summary .car{font-size:9px;color:var(--muted);transition:transform .15s ease}
.lang-dd[open] summary .car{transform:rotate(180deg)}
.lang-menu{position:absolute;top:calc(100% + 10px);right:0;background:#fff;border:1px solid rgba(34,30,26,.08);border-radius:16px;box-shadow:var(--shadow-lg);padding:8px;min-width:200px;max-height:320px;overflow-y:auto;z-index:80}
.lang-menu a{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;font-size:13.5px;font-weight:600;color:var(--ink)}
.lang-menu a:hover{background:rgba(255,107,53,.08)}
.lang-menu a.on{background:rgba(255,107,53,.12);color:var(--accent-deep)}
.lang-menu .flag{font-size:16px}'''

LANG_DD_JS = '''document.addEventListener('click',function(e){document.querySelectorAll('.lang-dd[open]').forEach(function(d){if(!d.contains(e.target))d.removeAttribute('open')})});'''

def meta_block(lang, ptype, title, desc, og_image_prefix_depth):
    canon_path = 'https://funs.world/' + lang_prefix(lang) + TYPE_PATH[ptype]
    lines = [f'<link rel="canonical" href="{canon_path}">']
    for code, name, flag in LANGS:
        alt_path = 'https://funs.world/' + lang_prefix(code) + TYPE_PATH[ptype]
        lines.append(f'<link rel="alternate" hreflang="{code}" href="{alt_path}">')
    lines.append(f'<link rel="alternate" hreflang="x-default" href="https://funs.world/{TYPE_PATH[ptype]}">')
    return '\n'.join(lines)

print("nav/dropdown/meta generators loaded")

_orig_href_to = href_to
def href_to(lang, ptype, to_lang, to_ptype):
    if lang == to_lang and ptype == to_ptype:
        return './'
    return _orig_href_to(lang, ptype, to_lang, to_ptype)
