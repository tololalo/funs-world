import os, re
ROOT = '/Users/maesterong/FUNS/Funshome'
PTYPES_FILES = []
for lang_dir in ['', 'ko/', 'zh/', 'ja/', 'es/', 'vi/', 'ru/', 'id/', 'pt/', 'tr/']:
    for sub in ['', 'talk/', 'wallet/', 'talk/download/', 'wallet/download/', 'download-app/']:
        p = os.path.join(ROOT, lang_dir, sub, 'index.html')
        if os.path.exists(p):
            PTYPES_FILES.append(p)

attr_re = re.compile(r'(?:href|src)="([^"]*)"')
errors = []
for fpath in PTYPES_FILES:
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
        if not os.path.exists(resolved):
            errors.append((os.path.relpath(fpath, ROOT), link))
if errors:
    print(f"{len(errors)} broken links:")
    for f, l in errors:
        print(f"  {f} -> {l}")
else:
    print(f"All links OK across {len(PTYPES_FILES)} files.")
