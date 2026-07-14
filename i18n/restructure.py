# -*- coding: utf-8 -*-
"""Restructure EN(root)+KO(/ko/) for all 6 page types, minimal targeted path fixes."""
import os, re, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def R(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()
def W(p, s):
    full = os.path.join(ROOT, p)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, 'w', encoding='utf-8').write(s)
    print('wrote', p, len(s), 'bytes')

def sub1(s, old, new, path, n=1):
    c = s.count(old)
    assert c >= n, f"{path}: expected >={n} of {old!r}, found {c}"
    return s.replace(old, new, c)  # replace ALL occurrences of this exact old string

LANGS10 = ['en','ko','zh','ja','es','vi','ru','id','pt','tr']
def hreflang_block(depth, ptype, indent='<link rel="alternate" hreflang="'):
    # returns list of hreflang link lines for canonical section (built later in head-fix step)
    pass

# ============================================================= HOME =============================================================
old_ko_home = R('index.html')       # depth0 KO -> becomes template basis for path-correct EN? NO (per analysis) we transform OLD EN -> NEW EN, OLD KO -> NEW KO. Kept for reference only.
old_en_home = R('en/index.html')    # depth1 EN

# NEW EN root home: strip one '../' level from asset/nav paths in old_en_home
s = old_en_home
s = s.replace('<html lang="en">', '<html lang="en">')  # no-op, keep
s = sub1(s, 'href="../images/funs-nugi.png"', 'href="images/funs-nugi.png"', 'en-home', 1)
s = sub1(s, 'src="../images/funs-nugi.png"', 'src="images/funs-nugi.png"', 'en-home', 1)  # will replace ALL (multiple)
s = sub1(s, 'src="../images/coins/', 'src="images/coins/', 'en-home', 1)
s = sub1(s, 'src="../images/badges/', 'src="images/badges/', 'en-home', 1)
s = sub1(s, 'href="../talk/en.html"', 'href="talk/"', 'en-home', 1)
s = sub1(s, 'href="../talk/privacy.html"', 'href="talk/privacy.html"', 'en-home', 1)
s = sub1(s, 'href="../talk/terms.html"', 'href="talk/terms.html"', 'en-home', 1)
# href="wallet/", href="download-app/", href="#download", href="./" , href="../" (old lang link, will be replaced in nav rebuild) -- leave; nav+lang block fully rebuilt below
NEW_EN_HOME = s

# NEW KO home (/ko/): add one '../' level to old_ko_home's asset/nav paths
s = old_ko_home
s = s.replace('<html lang="ko">', '<html lang="ko">')
s = sub1(s, 'href="images/funs-nugi.png"', 'href="../images/funs-nugi.png"', 'ko-home', 1)
s = sub1(s, 'src="images/funs-nugi.png"', 'src="../images/funs-nugi.png"', 'ko-home', 1)
s = sub1(s, 'src="images/coins/', 'src="../images/coins/', 'ko-home', 1)
s = sub1(s, 'src="images/badges/', 'src="../images/badges/', 'ko-home', 1)
s = sub1(s, 'href="talk/privacy.html"', 'href="../talk/privacy.html"', 'ko-home', 1)
s = sub1(s, 'href="talk/terms.html"', 'href="../talk/terms.html"', 'ko-home', 1)
# href="talk/" stays "talk/" -> WRONG: from /ko/ need "talk/" to reach /ko/talk/ -- actually correct! /ko/ + "talk/" = /ko/talk/ which IS ko-talk target. no change needed.
# href="wallet/" stays -> /ko/wallet/ correct, no change
# href="download-app/" stays -> /ko/download-app/ correct, no change
NEW_KO_HOME = s

print('HOME transforms applied (pending nav/lang/meta rebuild)')

import sys
sys.path.insert(0, os.path.join(ROOT, 'i18n'))
import build as B

def rebuild_nav_home(content, lang):
    logo_href = B.nav_logo_href(lang, 'home')
    talk_href = B.href_to(lang, 'home', lang, 'talk')
    wallet_href = B.href_to(lang, 'home', lang, 'wallet')
    dd = B.build_lang_dropdown(lang, 'home')
    cta = B.CTA_LABEL[lang]
    logo_img = B.asset(lang, 'home', 'images/funs-nugi.png')
    new_nav = f'''<!-- Nav -->
<div class="nav-wrap">
  <nav class="nav glass" aria-label="Main menu">
    <a class="nav-logo" href="{logo_href}"><img src="{logo_img}" alt="FunS logo"><span>FunS</span></a>
    <div class="nav-links">
      <a class="on" href="{logo_href}">Home</a>
      <a href="{talk_href}">Talk</a>
      <a href="{wallet_href}">Wallet</a>
    </div>
    {dd}
    <a class="btn btn-accent" href="#download">{cta}</a>
  </nav>
</div>'''
    return new_nav

def replace_nav_block(content, new_nav):
    pattern = re.compile(r'<!-- Nav -->.*?</div>\s*(?=<!-- Ticker -->|<!-- Hero -->)', re.S)
    new_content, n = pattern.subn(new_nav + '\n\n', content, count=1)
    assert n == 1, "nav block not found/replaced"
    return new_content

def replace_meta(content, lang, ptype, title, desc):
    # title
    content = re.sub(r'<title>.*?</title>', f'<title>{title}</title>', content, count=1)
    content = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{desc}">', content, count=1)
    # canonical + hreflang block: remove old lines, insert new
    content = re.sub(r'<link rel="canonical"[^>]*>\n(<link rel="alternate"[^>]*>\n?)+', B.meta_block(lang, ptype, title, desc, 0) + '\n', content, count=1)
    return content

def add_lang_dd_css(content):
    return content.replace('</style>', B.LANG_DD_CSS + '\n</style>', 1)

def add_lang_dd_js(content):
    return content.replace('</body>', f'<script>{B.LANG_DD_JS}</script>\n</body>', 1)

def fix_html_lang_attr(content, lang):
    return re.sub(r'<html lang="[a-z]+">', f'<html lang="{lang}">', content, count=1)

# ---- Assemble EN root home ----
en_home = NEW_EN_HOME
en_home = replace_nav_block(en_home, rebuild_nav_home(en_home, 'en'))
en_home = replace_meta(en_home, 'en', 'home',
    'FunS — Web3 Super Messenger. Talk, Pay, Own.',
    'FunS Talk, an end-to-end encrypted messenger, and FunS Wallet, a multi-chain wallet. One ecosystem connecting your conversations to your assets.')
en_home = add_lang_dd_css(en_home)
en_home = add_lang_dd_js(en_home)
en_home = fix_html_lang_attr(en_home, 'en')

# ---- Assemble KO home ----
ko_home = NEW_KO_HOME
ko_home = replace_nav_block(ko_home, rebuild_nav_home(ko_home, 'ko'))
ko_home = replace_meta(ko_home, 'ko', 'home',
    'FunS — 종단간 암호화 메신저와 멀티체인 지갑',
    '종단간 암호화 메신저 FunS Talk와 멀티체인 지갑 FunS Wallet. 대화에서 자산까지, 하나의 생태계로 연결됩니다.')
ko_home = add_lang_dd_css(ko_home)
ko_home = add_lang_dd_js(ko_home)
ko_home = fix_html_lang_attr(ko_home, 'ko')

W('index.html.new', en_home)
W('ko/index.html', ko_home)
print("HOME assembled: index.html.new + ko/index.html")
