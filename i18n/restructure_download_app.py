# -*- coding: utf-8 -*-
import os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'i18n'))
import build as B

def W(p, s):
    full = os.path.join(ROOT, p)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, 'w', encoding='utf-8').write(s)
    print('wrote', p, len(s), 'bytes')

STYLE_PATH = os.path.join(ROOT, 'i18n')
import restructure_download as RD  # reuse STYLE constant
STYLE = RD.STYLE

TEXT = {
    'en': dict(title_meta='Download the FunS App', desc='Download FunS Talk and FunS Wallet — join the waitlist to be first to know when they launch.',
        og_desc='FunS Talk, an encrypted messenger, and FunS Wallet, a multi-chain wallet. Get notified at launch.',
        h1='Download the FunS App', lede='FunS Talk, an encrypted messenger, and FunS Wallet, a multi-chain wallet.<br>Be the first to know when they launch.',
        soon='✦ Coming Soon', android_pd='Both FunS Talk and FunS Wallet<br>are coming soon to Android.',
        ios_pd='The App Store version is in the works.<br>Be the first to know when it launches.',
        email_ph='Enter your email', join_btn='Join Waitlist',
        success="✓ You're on the list! We'll email you at launch.",
        note_android='Join the waitlist to get the Android launch announcement by email.',
        note_ios='Join the waitlist to get the iOS launch announcement by email.',
        back='← Back to FunS Platform', badge_gp='google-play-en.png'),
    'ko': dict(title_meta='FunS 앱 다운로드', desc='FunS Talk와 FunS Wallet 다운로드 — 출시 소식을 가장 먼저 받아보세요.',
        og_desc='암호화 메신저 FunS Talk와 멀티체인 지갑 FunS Wallet. 출시 소식을 받아보세요.',
        h1='FunS 앱 다운로드', lede='암호화 메신저 FunS Talk와 멀티체인 지갑 FunS Wallet.<br>출시 소식을 가장 먼저 받아보세요.',
        soon='✦ 곧 출시 예정', android_pd='FunS Talk과 FunS Wallet 모두<br>Android 버전을 준비하고 있습니다.',
        ios_pd='App Store 버전을 준비하고 있습니다.<br>출시되면 가장 먼저 알려드릴게요.',
        email_ph='이메일을 입력하세요', join_btn='웨이트리스트 신청',
        success='✓ 등록 완료! 출시 소식을 이메일로 보내드릴게요.',
        note_android='신청하시면 Android 버전 출시 소식을 이메일로 받아보실 수 있어요.',
        note_ios='신청하시면 iOS 버전 출시 소식을 이메일로 받아보실 수 있어요.',
        back='← FunS Platform으로 돌아가기', badge_gp='google-play-ko.png'),
}
for code, name, flag in B.LANGS:
    if code not in TEXT:
        TEXT[code] = dict(TEXT['en'])
        TEXT[code]['badge_gp'] = 'google-play-en.png'

def build_page(lang):
    ptype = 'download-app'
    t = TEXT[lang]
    logo_img = B.asset(lang, ptype, 'funs-nugi.png')
    back_href = B.href_to(lang, ptype, lang, 'home')
    dd = B.build_lang_dropdown(lang, ptype, aria_label='Language')
    gp_badge = B.asset(lang, ptype, 'images/badges/' + t['badge_gp'])
    as_badge = B.asset(lang, ptype, 'images/badges/app-store-en.svg')
    canon = 'https://funs.world/' + B.lang_prefix(lang) + B.TYPE_PATH[ptype]
    meta = B.meta_block(lang, ptype, t['title_meta'], t['desc'], 0)
    return f'''<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{t['title_meta']}</title>
<meta name="description" content="{t['desc']}">
<meta property="og:title" content="{t['title_meta']}">
<meta property="og:description" content="{t['og_desc']}">
<meta property="og:image" content="https://funs.world/funs-nugi.png">
<meta property="og:url" content="{canon}">
<meta property="og:type" content="website">
{meta}
<link rel="icon" type="image/png" href="{logo_img}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
{STYLE}
</head>
<body>
<div class="aurora" aria-hidden="true"></div>

<div class="nav-wrap">
  <nav class="nav glass" aria-label="Main menu">
    <a href="{back_href}" class="nav-logo">
      <img src="{logo_img}" alt="FunS">
      <span>FunS</span>
    </a>
    {dd}
  </nav>
</div>

<section class="dl-hero">
  <img src="{logo_img}" alt="FunS" class="hero-logo">
  <h1 class="dl-title">{t['h1']}</h1>
  <p class="dl-sub">{t['lede']}</p>
</section>

<section class="platform-wrap">
  <div class="platform-grid">
    <div class="platform-card">
      <h2>Android</h2>
      <div><span class="soon-badge">{t['soon']}</span></div>
      <p class="pd">{t['android_pd']}</p>
      <div style="margin-bottom:20px;"><span class="store-badge gp disabled"><img src="{gp_badge}" alt="Google Play"></span></div>
      <form class="wait-form" id="waitFormGp">
        <input type="email" class="wait-input" placeholder="{t['email_ph']}" required>
        <button type="submit" class="wait-btn">{t['join_btn']}</button>
      </form>
      <div class="wait-success">{t['success']}</div>
      <p class="wait-note">{t['note_android']}</p>
    </div>
    <div class="platform-card">
      <h2>iOS</h2>
      <div><span class="soon-badge">{t['soon']}</span></div>
      <p class="pd">{t['ios_pd']}</p>
      <div style="margin-bottom:20px;"><span class="store-badge as disabled"><img src="{as_badge}" alt="App Store"></span></div>
      <form class="wait-form" id="waitFormAs">
        <input type="email" class="wait-input" placeholder="{t['email_ph']}" required>
        <button type="submit" class="wait-btn">{t['join_btn']}</button>
      </form>
      <div class="wait-success">{t['success']}</div>
      <p class="wait-note">{t['note_ios']}</p>
    </div>
  </div>
</section>

<div class="dl-back">
  <a href="{back_href}" class="back-link">{t['back']}</a>
</div>

<footer style="text-align:center; padding: 32px 5%;">
  <p style="color:var(--muted); font-size:.8rem;">© 2026 FunS Platform · <a href="{back_href}" style="color:var(--muted);">funs.world</a></p>
</footer>

<script>{B.LANG_DD_JS}</script>
<script>
const WAITLIST_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzooUoNiLsqEOrZVrxqw69hBVwUlakuIOd3n2BocYjHFWir3E10hKd5uROPS0ubMbE/exec';
function wireForm(formId, page) {{
  const form = document.getElementById(formId);
  form.addEventListener('submit', function(e) {{
    e.preventDefault();
    const input = form.querySelector('.wait-input');
    const success = form.nextElementSibling;
    const email = input.value.trim();
    if (!email.match(/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/)) {{
      input.style.borderColor = 'var(--primary)';
      setTimeout(() => {{ input.style.borderColor = ''; }}, 2000);
      return;
    }}
    fetch(WAITLIST_ENDPOINT, {{
      method: 'POST', mode: 'no-cors',
      headers: {{ 'Content-Type': 'application/x-www-form-urlencoded' }},
      body: 'email=' + encodeURIComponent(email) + '&lang={lang}&page=' + page
    }});
    form.style.display = 'none';
    success.style.display = 'block';
  }});
}}
wireForm('waitFormGp', 'home-android');
wireForm('waitFormAs', 'home-ios');
</script>
</body>
</html>
'''

for lang in ['en', 'ko']:
    content = build_page(lang)
    path = B.file_path(lang, 'download-app').replace(B.ROOT + '/', '')
    if lang == 'en':
        W(path + '.new', content)
    else:
        W(path, content)
print("download-app en+ko done")
