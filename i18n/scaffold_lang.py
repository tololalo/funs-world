# -*- coding: utf-8 -*-
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'i18n'))
import build as B

PTYPES = ['home','talk','wallet','talk-download','wallet-download','download-app']

def R(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()
def W(p, s):
    full = os.path.join(ROOT, p)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, 'w', encoding='utf-8').write(s)

for code, name, flag in B.LANGS:
    if code in ('en', 'ko'):
        continue
    for ptype in PTYPES:
        ko_path = B.file_path('ko', ptype).replace(B.ROOT + '/', '')
        content = R(ko_path)
        # 1. html lang attr
        content = re.sub(r'<html lang="[a-z]+">', f'<html lang="{code}">', content, count=1)
        # 2. regenerate the lang dropdown block entirely so self-highlight + hrefs are correct for this lang
        new_dd = B.build_lang_dropdown(code, ptype, aria_label='Language')
        content = re.sub(r'<details class="lang-dd".*?</details>', new_dd, content, count=1, flags=re.S)
        # 3. fix canonical link (ko-> this lang)
        content = re.sub(r'(<link rel="canonical" href=")https://funs\.world/ko/([^"]*)(")',
                          rf'\1https://funs.world/{code}/\2\3', content, count=1)
        target_path = B.file_path(code, ptype).replace(B.ROOT + '/', '')
        W(target_path, content)
        print('scaffolded', target_path)
print("done: scaffolded", len(B.LANGS) - 2, "languages x", len(PTYPES), "page types (KO placeholder text, correct structure/paths)")
