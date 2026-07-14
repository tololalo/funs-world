import re, os, sys
sys.path.insert(0, 'i18n')
import build as B

FACTOR = 1.12
PTYPES = ['home','talk','wallet','talk-download','wallet-download','download-app']

def fmt(n):
    n = round(n, 2)
    if n == int(n):
        return str(int(n))
    return ('%.2f' % n).rstrip('0').rstrip('.')

def scale_px(m):
    val = float(m.group(1))
    return f'font-size:{fmt(val * FACTOR)}px'

def scale_rem(m):
    val = float(m.group(1))
    return f'font-size:{fmt(val * FACTOR)}rem'

def scale_clamp(m):
    a, b, c = m.group(1), m.group(2), m.group(3)
    a_val = float(a.replace('rem',''))
    c_val = float(c.replace('rem',''))
    return f'font-size:clamp({fmt(a_val*FACTOR)}rem,{b},{fmt(c_val*FACTOR)}rem)'

def process(text):
    # clamp(Arem,Bvw,Crem) form
    text = re.sub(r'font-size:clamp\(([\d.]+)rem,([\d.]+vw),([\d.]+)rem\)', scale_clamp, text)
    # plain px
    text = re.sub(r'font-size:([\d.]+)px', scale_px, text)
    # plain rem (not already handled by clamp)
    text = re.sub(r'font-size:([\d.]+)rem(?!,)', scale_rem, text)
    return text

changed = 0
for code, name, flag in B.LANGS:
    for ptype in PTYPES:
        path = B.file_path(code, ptype)
        if not os.path.exists(path):
            continue
        text = open(path, encoding='utf-8').read()
        new_text = process(text)
        if new_text != text:
            open(path, 'w', encoding='utf-8').write(new_text)
            changed += 1
print(f'{changed} files updated with +{int((FACTOR-1)*100)}% font-size scaling')
