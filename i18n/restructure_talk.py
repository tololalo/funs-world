# -*- coding: utf-8 -*-
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'i18n'))
import build as B

def R(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()
def W(p, s):
    full = os.path.join(ROOT, p)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, 'w', encoding='utf-8').write(s)
    print('wrote', p, len(s), 'bytes')

def sub1(s, old, new, path):
    c = s.count(old)
    assert c >= 1, f"{path}: not found: {old!r}"
    return s.replace(old, new, c)

def add_lang_dd_css(content):
    return content.replace('</style>', B.LANG_DD_CSS + '\n</style>', 1)
def add_lang_dd_js(content):
    return content.replace('</body>', f'<script>{B.LANG_DD_JS}</script>\n</body>', 1)
def fix_html_lang_attr(content, lang):
    return re.sub(r'<html lang="[a-z]+">', f'<html lang="{lang}">', content, count=1)
def replace_meta(content, lang, ptype, title, desc):
    content = re.sub(r'<title>.*?</title>', f'<title>{title}</title>', content, count=1)
    content = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{desc}">', content, count=1)
    content = re.sub(r'<link rel="canonical"[^>]*>\n(<link rel="alternate"[^>]*>\n?)+', B.meta_block(lang, ptype, title, desc, 0) + '\n', content, count=1)
    return content

def rebuild_nav_talk(lang):
    home_href = B.href_to(lang, 'talk', lang, 'home')
    talk_href = B.href_to(lang, 'talk', lang, 'talk')  # self
    wallet_href = B.href_to(lang, 'talk', lang, 'wallet')
    dl_href = B.href_to(lang, 'talk', lang, 'talk-download')
    dd = B.build_lang_dropdown(lang, 'talk')
    cta = B.CTA_LABEL_TALK[lang]
    logo_img = B.asset(lang, 'talk', 'images/funs-nugi.png')
    return f'''<!-- Nav -->
<div class="nav-wrap">
  <nav class="nav glass" aria-label="Main menu">
    <a class="nav-logo" href="{home_href}"><img src="{logo_img}" alt="FunS logo"><span>FunS</span></a>
    <div class="nav-links">
      <a href="{home_href}">Home</a>
      <a class="on" href="{talk_href}">Talk</a>
      <a href="{wallet_href}">Wallet</a>
    </div>
    {dd}
    <a class="btn btn-accent" href="{dl_href}">{cta}</a>
  </nav>
</div>'''

def replace_nav_block(content, new_nav):
    pattern = re.compile(r'<!-- Nav -->.*?</div>\s*(?=<!-- Hero -->)', re.S)
    new_content, n = pattern.subn(new_nav + '\n\n', content, count=1)
    assert n == 1, "talk nav block not found"
    return new_content

# ============================= build EN root talk =============================
old_en_talk = R('talk/en.html')
s = old_en_talk
s = sub1(s, 'href="../en/"', 'href="../"', 'en-talk')          # nav-logo + nav Home
s = sub1(s, 'href="en.html"', 'href="./"', 'en-talk')           # nav Talk self + footer Talk self
s = sub1(s, 'href="../en/wallet/"', 'href="../wallet/"', 'en-talk')  # nav Wallet + footer Wallet
s = sub1(s, 'href="download/en.html"', 'href="download/"', 'en-talk')  # cta btn-accent + hero cta + footer download + cta badge ios
# privacy.html / terms.html unchanged (already correct at /talk/)
NEW_EN_TALK = s

# ============================= build KO talk (/ko/talk/) =============================
old_ko_talk = R('talk/index.html')
s = old_ko_talk
s = sub1(s, 'src="funs-nugi.png"', 'src="../../images/funs-nugi.png"', 'ko-talk')
s = sub1(s, 'href="funs-nugi.png"', 'href="../../images/funs-nugi.png"', 'ko-talk')  # favicon (harmless if unused visually)
s = sub1(s, 'src="../images/badges/', 'src="../../images/badges/', 'ko-talk')
s = sub1(s, 'href="privacy.html"', 'href="../../talk/privacy.html"', 'ko-talk')
s = sub1(s, 'href="terms.html"', 'href="../../talk/terms.html"', 'ko-talk')
# href="../" (home) stays "../" ; href="../wallet/" stays ; href="download/" stays ; href="./" (talk self, if any) stays
NEW_KO_TALK = s

for lang, base in [('en', NEW_EN_TALK), ('ko', NEW_KO_TALK)]:
    c = base
    c = replace_nav_block(c, rebuild_nav_talk(lang))
    if lang == 'en':
        c = replace_meta(c, lang, 'talk', 'FunS Talk — Encrypted Messenger',
            'FunS Talk, an encrypted messenger powered by one wallet. Chat, send crypto, and build your community on BNB Chain.')
    else:
        c = replace_meta(c, lang, 'talk', 'FunS Talk — 암호화 메신저',
            '지갑 하나로 시작하는 암호화 메신저 FunS Talk. BNB 체인 위에서 채팅하고, 송금하고, 커뮤니티를 만드세요.')
    c = add_lang_dd_css(c)
    c = add_lang_dd_js(c)
    c = fix_html_lang_attr(c, lang)
    if lang == 'en':
        W('talk/index.html.new', c)
    else:
        W('ko/talk/index.html', c)

print("TALK done")
