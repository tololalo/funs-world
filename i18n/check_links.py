# -*- coding: utf-8 -*-
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TARGET_DIRS = ['index.html','talk/index.html','wallet/index.html',
    'talk/download/index.html','wallet/download/index.html','download-app/index.html',
    'ko/index.html','ko/talk/index.html','ko/wallet/index.html',
    'ko/talk/download/index.html','ko/wallet/download/index.html','ko/download-app/index.html']

PENDING_LANGS = ['zh','ja','es','vi','ru','id','pt','tr']

attr_re = re.compile(r'(?:href|src)="([^"]*)"')

errors = []
for rel in TARGET_DIRS:
    fpath = os.path.join(ROOT, rel)
    if not os.path.exists(fpath):
        errors.append((rel, 'MISSING FILE', ''))
        continue
    text = open(fpath, encoding='utf-8').read()
    base_dir = os.path.dirname(fpath)
    for m in attr_re.finditer(text):
        link = m.group(1)
        if not link or link.startswith(('http://','https://','mailto:','data:','#','tel:')):
            continue
        path_part = link.split('#')[0]
        if not path_part:
            continue
        resolved = os.path.normpath(os.path.join(base_dir, path_part))
        if os.path.exists(resolved):
            continue
        # check if pending-language false positive
        relresolved = os.path.relpath(resolved, ROOT)
        if any(relresolved.startswith(l + '/') or relresolved.startswith('/' + l + '/') for l in PENDING_LANGS):
            continue
        errors.append((rel, link, resolved))

if errors:
    print(f"{len(errors)} broken link(s):")
    for f, link, resolved in errors:
        print(f"  {f} -> {link}  (resolved: {resolved})")
else:
    print("All links OK (excluding pending new-language folders).")
