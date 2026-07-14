# -*- coding: utf-8 -*-
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'i18n'))
import build as B

def W(p, s):
    full = os.path.join(ROOT, p)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, 'w', encoding='utf-8').write(s)
    print('wrote', p, len(s), 'bytes')

STYLE = '''<style>
:root{
  --bg:#F6F7FB; --ink:#221E1A; --muted:#6E6862; --soft:#B8B2AA;
  --accent:#FF6B35; --accent-deep:#C45520; --green:#1BA672; --red:#D64545;
  --primary:#FF6B35;
  --glass:rgba(255,255,255,.55); --glass-strong:rgba(255,255,255,.78); --glass-border:rgba(255,255,255,.9);
  --shadow-lg:0 32px 80px rgba(34,30,26,.14); --shadow-md:0 8px 32px rgba(34,30,26,.08); --shadow-sm:0 2px 10px rgba(34,30,26,.05);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;font-family:'Pretendard Variable',Pretendard,'Noto Sans KR',system-ui,sans-serif;color:var(--ink);background:var(--bg);-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:inherit;text-decoration:none}
a:hover{color:var(--accent-deep)}
img{max-width:100%}
.aurora{position:fixed;inset:0;z-index:-1;pointer-events:none;background:
  radial-gradient(ellipse 45% 35% at 18% 8%,rgba(255,154,61,.28),transparent 60%),
  radial-gradient(ellipse 40% 32% at 85% 18%,rgba(79,195,247,.25),transparent 60%),
  radial-gradient(ellipse 50% 40% at 55% 90%,rgba(255,215,0,.18),transparent 60%),
  radial-gradient(ellipse 35% 30% at 5% 75%,rgba(255,107,53,.16),transparent 55%)}
.glass{background:var(--glass);border:1px solid var(--glass-border);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
.nav-wrap{position:sticky;top:18px;z-index:60;display:flex;justify-content:center;padding:0 20px}
.nav{display:flex;align-items:center;gap:28px;border-radius:50px;padding:10px 18px 10px 22px;box-shadow:var(--shadow-md)}
.nav-logo{display:flex;align-items:center;gap:9px;font-family:'Space Grotesk','Pretendard Variable',sans-serif;font-weight:700;font-size:16px}
.nav-logo img{width:30px;height:30px;object-fit:contain}
.dl-hero{padding:64px 5% 32px;text-align:center;position:relative}
.dl-hero .hero-logo{width:110px;height:110px;object-fit:contain;filter:drop-shadow(0 18px 34px rgba(255,107,53,.25));margin-bottom:24px;animation:floatLogo 4s ease-in-out infinite}
.dl-title{
  font-family:'Space Grotesk','Pretendard Variable',sans-serif;font-weight:700;letter-spacing:-1.2px;
  font-size:clamp(1.9rem,5vw,3.2rem);line-height:1.15;margin:0 0 14px;
  background:linear-gradient(135deg,#FF6B35 20%,#FF9A3D 60%,#E9A400 100%);
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
}
.dl-sub{color:var(--muted);font-size:clamp(.95rem,2vw,1.1rem);line-height:1.8;max-width:520px;margin:0 auto}
@keyframes floatLogo{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
.platform-wrap{padding:40px 5% 90px}
.platform-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;max-width:860px;margin:0 auto}
.platform-card{
  background:var(--glass);border:1px solid var(--glass-border);
  border-radius:22px;padding:44px 32px;
  backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  text-align:center;position:relative;overflow:hidden;box-shadow:var(--shadow-sm);
  transition:transform .2s ease,box-shadow .2s ease;
}
.platform-card:hover{transform:translateY(-4px);box-shadow:var(--shadow-md)}
.platform-card h2{font-family:'Space Grotesk','Pretendard Variable',sans-serif;font-size:1.3rem;color:var(--ink);margin:0 0 8px}
.platform-card .pd{color:var(--muted);font-size:.9rem;line-height:1.7;margin:0 0 26px}
.soon-badge{
  display:inline-flex;align-items:center;gap:6px;
  color:#B07E00;background:rgba(255,201,61,.18);border:1px solid rgba(255,201,61,.45);
  padding:4px 14px;border-radius:50px;font-size:.72rem;font-weight:700;
  letter-spacing:1.5px;text-transform:uppercase;margin-bottom:14px;
}
.store-badge{display:inline-flex;align-items:center;transition:transform .2s ease,filter .2s ease}
.store-badge:hover{transform:translateY(-3px);filter:drop-shadow(0 10px 24px rgba(255,107,53,.25))}
.store-badge img{display:block;width:auto;border-radius:9px}
.store-badge.gp img{height:56px}
.store-badge.as img{height:56px}
.store-badge.disabled{opacity:.45;filter:grayscale(35%);cursor:default;pointer-events:none}
.wait-form{display:flex;gap:10px;max-width:340px;margin:0 auto}
.wait-input{
  flex:1;min-width:0;
  background:#fff;border:1px solid rgba(34,30,26,.12);
  border-radius:12px;padding:13px 16px;color:var(--ink);
  font-size:.9rem;font-family:inherit;outline:none;box-shadow:var(--shadow-sm);
  transition:border-color .2s ease,box-shadow .2s ease;
}
.wait-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(255,107,53,.15)}
.wait-input::placeholder{color:var(--soft)}
.wait-btn{
  background:var(--accent);
  color:#fff;border:none;border-radius:12px;padding:13px 20px;
  font-weight:700;font-size:.88rem;cursor:pointer;white-space:nowrap;font-family:inherit;
  box-shadow:0 6px 18px rgba(255,107,53,.35);
  transition:transform .15s ease,box-shadow .15s ease;
}
.wait-btn:hover{transform:translateY(-1px);box-shadow:0 10px 24px rgba(255,107,53,.45)}
.wait-success{display:none;color:var(--green);font-size:.88rem;font-weight:600;margin-top:14px}
.wait-note{color:var(--muted);font-size:.75rem;margin-top:12px}
.dl-back{text-align:center;padding:0 5% 72px}
.back-link{
  display:inline-block;background:var(--glass);border:1px solid var(--glass-border);
  padding:14px 30px;font-size:15px;font-weight:700;border-radius:14px;
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:var(--shadow-sm);
  transition:transform .15s ease,box-shadow .15s ease;
}
.back-link:hover{transform:translateY(-1px);box-shadow:var(--shadow-md)}
footer{border-top:1px solid rgba(255,255,255,.9);background:rgba(255,255,255,.42);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
@media (max-width:600px){
  .dl-hero{padding:48px 4% 24px}
  .platform-card{padding:32px 20px}
  .wait-form{flex-direction:column}
  .store-badge.gp img{height:46px}
  .store-badge.as img{height:46px}
}
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{animation:none !important;transition:none !important}
}
''' + B.LANG_DD_CSS + '''
</style>'''

TEXT = {
    'talk-download': {
        'en': dict(brand='FunS Talk', title_meta='Download FunS Talk — Encrypted Messenger',
            desc='Download the FunS Talk app — get it now on Google Play for Android, or join the iOS waitlist.',
            og_desc='An encrypted messenger powered by one wallet. Get FunS Talk today.',
            h1='Download FunS Talk', lede='An encrypted messenger powered by one wallet.<br>Get it today.',
            android_pd='Available now on<br>Google Play.', ios_pd="The App Store version is in the works.<br>Be the first to know when it launches.",
            email_ph='Enter your email', join_btn='Join Waitlist',
            success="✓ You're on the list! We'll email you at launch.",
            note='Join the waitlist to get the iOS launch announcement by email.',
            back='← Back to FunS Talk', pkg='com.funstalk.app', badge_gp='google-play-en.png'),
        'ko': dict(brand='FunS Talk', title_meta='FunS Talk 다운로드 — 암호화 메신저',
            desc='FunS Talk 앱 다운로드 — Android는 Google Play에서 바로, iOS는 웨이트리스트로 출시 소식을 받아보세요.',
            og_desc='지갑 하나로 시작하는 암호화 메신저, FunS Talk을 지금 만나보세요.',
            h1='FunS Talk 다운로드', lede='지갑 하나로 시작하는 암호화 메신저.<br>지금 바로 만나보세요.',
            android_pd='Google Play에서 지금 바로<br>다운로드할 수 있습니다.', ios_pd='App Store 버전을 준비하고 있습니다.<br>출시되면 가장 먼저 알려드릴게요.',
            email_ph='이메일을 입력하세요', join_btn='웨이트리스트 신청',
            success='✓ 등록 완료! iOS 출시 소식을 이메일로 보내드릴게요.',
            note='신청하시면 iOS 버전 출시 소식을 이메일로 받아보실 수 있어요.',
            back='← FunS Talk으로 돌아가기', pkg='com.funstalk.app', badge_gp='google-play-ko.png'),
    },
    'wallet-download': {
        'en': dict(brand='FunS Wallet', title_meta='Download FunS Wallet — Multi-chain Wallet',
            desc='Download the FunS Wallet app — get it now on Google Play for Android, or join the iOS waitlist.',
            og_desc='From Bitcoin to FUNS — assets across 6 chains in one place. Get FunS Wallet today.',
            h1='Download FunS Wallet', lede='From Bitcoin to FUNS — assets across 6 chains in one place.<br>Get it today.',
            android_pd='Available now on<br>Google Play.', ios_pd="The App Store version is in the works.<br>Be the first to know when it launches.",
            email_ph='Enter your email', join_btn='Join Waitlist',
            success="✓ You're on the list! We'll email you at launch.",
            note='Join the waitlist to get the iOS launch announcement by email.',
            back='← Back to FunS Wallet', pkg='world.funs.wallet', badge_gp='google-play-en.png'),
        'ko': dict(brand='FunS Wallet', title_meta='FunS Wallet 다운로드 — 멀티체인 지갑',
            desc='FunS Wallet 앱 다운로드 — Android는 Google Play에서 바로, iOS는 웨이트리스트로 출시 소식을 받아보세요.',
            og_desc='비트코인부터 FUNS까지, 6개 체인 자산을 한 곳에서. FunS Wallet을 지금 만나보세요.',
            h1='FunS Wallet 다운로드', lede='비트코인부터 FUNS까지, 6개 체인의 자산을 한 곳에서.<br>지금 바로 만나보세요.',
            android_pd='Google Play에서 지금 바로<br>다운로드할 수 있습니다.', ios_pd='App Store 버전을 준비하고 있습니다.<br>출시되면 가장 먼저 알려드릴게요.',
            email_ph='이메일을 입력하세요', join_btn='웨이트리스트 신청',
            success='✓ 등록 완료! iOS 출시 소식을 이메일로 보내드릴게요.',
            note='신청하시면 iOS 버전 출시 소식을 이메일로 받아보실 수 있어요.',
            back='← FunS Wallet으로 돌아가기', pkg='world.funs.wallet', badge_gp='google-play-ko.png'),
    },
}
# default (placeholder = EN copy) for the 8 new languages, added later when translating
for ptype in TEXT:
    for code, name, flag in B.LANGS:
        if code not in TEXT[ptype]:
            TEXT[ptype][code] = dict(TEXT[ptype]['en'])
            TEXT[ptype][code]['badge_gp'] = 'google-play-en.png'

def build_download_page(lang, ptype):
    t = TEXT[ptype][lang]
    parent_type = 'talk' if ptype == 'talk-download' else 'wallet'
    logo_img = B.asset(lang, ptype, 'images/funs-nugi.png')
    back_href = B.href_to(lang, ptype, lang, parent_type)
    home_footer_href = B.href_to(lang, ptype, lang, 'home')
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

<!-- NAV -->
<div class="nav-wrap">
  <nav class="nav glass" aria-label="Main menu">
    <a href="{back_href}" class="nav-logo">
      <img src="{logo_img}" alt="{t['brand']}">
      <span>{t['brand']}</span>
    </a>
    {dd}
  </nav>
</div>

<!-- HERO -->
<section class="dl-hero">
  <img src="{logo_img}" alt="{t['brand']}" class="hero-logo">
  <h1 class="dl-title">{t['h1']}</h1>
  <p class="dl-sub">{t['lede']}</p>
</section>

<!-- PLATFORMS -->
<section class="platform-wrap">
  <div class="platform-grid">
    <div class="platform-card">
      <h2>Android</h2>
      <p class="pd">{t['android_pd']}</p>
      <a class="store-badge gp" href="https://play.google.com/store/apps/details?id={t['pkg']}">
        <img src="{gp_badge}" alt="Get it on Google Play">
      </a>
    </div>
    <div class="platform-card">
      <h2>iOS</h2>
      <div><span class="soon-badge">✦ Coming Soon</span></div>
      <p class="pd">{t['ios_pd']}</p>
      <div style="margin-bottom:20px;"><span class="store-badge as disabled"><img src="{as_badge}" alt="Download on the App Store"></span></div>
      <form class="wait-form" id="waitForm">
        <input type="email" class="wait-input" id="waitEmail" placeholder="{t['email_ph']}" required>
        <button type="submit" class="wait-btn">{t['join_btn']}</button>
      </form>
      <div class="wait-success" id="waitSuccess">{t['success']}</div>
      <p class="wait-note">{t['note']}</p>
    </div>
  </div>
</section>

<div class="dl-back">
  <a href="{back_href}" class="back-link">{t['back']}</a>
</div>

<!-- FOOTER -->
<footer style="text-align:center; padding: 32px 5%;">
  <p style="color:var(--muted); font-size:.8rem;">© 2026 {t['brand']} · <a href="{home_footer_href}" style="color:var(--muted);">funs.world</a></p>
</footer>

<script>{B.LANG_DD_JS}</script>
<script>
const WAITLIST_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzooUoNiLsqEOrZVrxqw69hBVwUlakuIOd3n2BocYjHFWir3E10hKd5uROPS0ubMbE/exec';
document.getElementById('waitForm').addEventListener('submit', function(e) {{
  e.preventDefault();
  const input = document.getElementById('waitEmail');
  const success = document.getElementById('waitSuccess');
  const email = input.value.trim();
  if (!email.match(/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/)) {{
    input.style.borderColor = 'var(--primary)';
    setTimeout(() => {{ input.style.borderColor = ''; }}, 2000);
    return;
  }}
  fetch(WAITLIST_ENDPOINT, {{
    method: 'POST', mode: 'no-cors',
    headers: {{ 'Content-Type': 'application/x-www-form-urlencoded' }},
    body: 'email=' + encodeURIComponent(email) + '&lang={lang}&page={ptype.replace("-download", "/download")}'
  }});
  this.style.display = 'none';
  success.style.display = 'block';
}});
</script>
</body>
</html>
'''

for ptype in ['talk-download', 'wallet-download']:
    for lang in ['en', 'ko']:
        content = build_download_page(lang, ptype)
        path = B.file_path(lang, ptype).replace(B.ROOT + '/', '')
        # for en (root), write to .new suffix if a conflicting old file exists at same path we must not clobber yet incorrectly? actually ptype root for en talk-download = talk/download/index.html which currently holds KO content (old). We need staging.
        if lang == 'en':
            W(path + '.new', content)
        else:
            W(path, content)
print("DOWNLOAD pages (talk/wallet) done for en+ko")
