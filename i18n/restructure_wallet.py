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

def add_lang_dd_css(content): return content.replace('</style>', B.LANG_DD_CSS + '\n</style>', 1)
def add_lang_dd_js(content): return content.replace('</body>', f'<script>{B.LANG_DD_JS}</script>\n</body>', 1)
def fix_html_lang_attr(content, lang): return re.sub(r'<html lang="[a-z]+">', f'<html lang="{lang}">', content, count=1)
def replace_meta(content, lang, ptype, title, desc):
    content = re.sub(r'<title>.*?</title>', f'<title>{title}</title>', content, count=1)
    content = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{desc}">', content, count=1)
    content = re.sub(r'<link rel="canonical"[^>]*>\n(<link rel="alternate"[^>]*>\n?)+', B.meta_block(lang, ptype, title, desc, 0) + '\n', content, count=1)
    return content

def rebuild_nav_wallet(lang):
    home_href = B.href_to(lang, 'wallet', lang, 'home')
    talk_href = B.href_to(lang, 'wallet', lang, 'talk')
    wallet_href = B.href_to(lang, 'wallet', lang, 'wallet')
    dd = B.build_lang_dropdown(lang, 'wallet')
    cta = B.CTA_LABEL_TALK[lang]
    logo_img = B.asset(lang, 'wallet', 'images/funs-nugi.png')
    return f'''<!-- Nav -->
<div class="nav-wrap">
  <nav class="nav glass" aria-label="Main menu">
    <a class="nav-logo" href="{home_href}"><img src="{logo_img}" alt="FunS logo"><span>FunS</span></a>
    <div class="nav-links">
      <a href="{home_href}">Home</a>
      <a href="{talk_href}">Talk</a>
      <a class="on" href="{wallet_href}">Wallet</a>
    </div>
    {dd}
    <a class="btn btn-accent" href="#download">{cta}</a>
  </nav>
</div>'''

def replace_nav_block(content, new_nav):
    pattern = re.compile(r'<!-- Nav -->.*?</div>\s*(?=<!-- Hero -->)', re.S)
    new_content, n = pattern.subn(new_nav + '\n\n', content, count=1)
    assert n == 1, "wallet nav block not found"
    return new_content

# ============================= EN root wallet =============================
old_en_wallet = R('en/wallet/index.html')
s = old_en_wallet
s = sub1(s, 'src="../../funs-nugi.png"', 'src="../images/funs-nugi.png"', 'en-wallet')
s = sub1(s, 'href="../../funs-nugi.png"', 'href="../images/funs-nugi.png"', 'en-wallet')  # favicon
s = sub1(s, 'src="../../images/coins/', 'src="../images/coins/', 'en-wallet')
s = sub1(s, 'src="../../images/badges/', 'src="../images/badges/', 'en-wallet')
s = sub1(s, 'href="../../talk/en.html"', 'href="../talk/"', 'en-wallet')
s = sub1(s, 'href="../../talk/privacy.html"', 'href="../talk/privacy.html"', 'en-wallet')
s = sub1(s, 'href="../../talk/terms.html"', 'href="../talk/terms.html"', 'en-wallet')
s = sub1(s, 'href="../../wallet/download/en.html"', 'href="download/"', 'en-wallet')
NEW_EN_WALLET = s

# ============================= KO wallet (/ko/wallet/) =============================
old_ko_wallet = R('wallet/index.html')
s = old_ko_wallet
s = sub1(s, 'src="../images/coins/', 'src="../../images/coins/', 'ko-wallet')
s = sub1(s, 'src="../images/badges/', 'src="../../images/badges/', 'ko-wallet')
s = sub1(s, 'src="../funs-nugi.png"', 'src="../../images/funs-nugi.png"', 'ko-wallet')
s = sub1(s, 'href="../funs-nugi.png"', 'href="../../images/funs-nugi.png"', 'ko-wallet')  # if favicon present
s = sub1(s, 'href="../talk/privacy.html"', 'href="../../talk/privacy.html"', 'ko-wallet')
s = sub1(s, 'href="../talk/terms.html"', 'href="../../talk/terms.html"', 'ko-wallet')
NEW_KO_WALLET = s

for lang, base in [('en', NEW_EN_WALLET), ('ko', NEW_KO_WALLET)]:
    c = base
    c = replace_nav_block(c, rebuild_nav_wallet(lang))
    if lang == 'en':
        c = replace_meta(c, lang, 'wallet', 'FunS Wallet — Multi-chain Wallet',
            'Assets on 6 chains, from Bitcoin to FUNS, all in one place. QR payments, P2E rewards, and self-custody — FunS Wallet.')
    else:
        c = replace_meta(c, lang, 'wallet', 'FunS Wallet — 멀티체인 지갑',
            '비트코인부터 FUNS까지 6개 체인의 자산을 한 곳에서. QR 결제, P2E 보상, 자가 보관 — FunS Wallet.')
    c = add_lang_dd_css(c)
    c = add_lang_dd_js(c)
    c = fix_html_lang_attr(c, lang)
    if lang == 'en':
        W('wallet/index.html.new', c)
    else:
        W('ko/wallet/index.html', c)

print("WALLET done")
