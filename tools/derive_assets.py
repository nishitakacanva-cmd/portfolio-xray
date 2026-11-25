"""Prepare Portfolio X-Ray assets. Originals in the asset pack are never modified.

1. Copies the 4 environment plates and 17 cropped PNGs from 01_Portfolio_XRay verbatim.
2. Derived (recorded in src/data/asset-manifest.json with derivedFrom/derivation):
   - PX_PROP_01 split into left/right door leaves at the centre seam so the doors can slide.
   - PX_FORM_03 header crop: only the correctly spelled header is used; the baked section labels
     contain a defect ("EVIOENCE BEHINO THE DESIGN"), so report sections are typeset live.
3. Specimen pages rendered from the supplied PDFs (pdftoppm), 1600 px wide + 320 px thumbnails.
   - Bachat Basics p13: the four photographs of user-testing participants are blurred (private individuals).
   - Canva campaign: only pages without identifiable people (p2 shows a real public figure; p5, p7, p9, p16, p22 show people).
   - Nature's Basket: NO page images. The slides depict likenesses of real film actors; the specimen is a text record.
Usage: python3 tools/derive_assets.py <asset-pack-root> <dir-with-pdfs>
"""
import json, os, shutil, subprocess, sys, glob
from PIL import Image, ImageFilter, ImageDraw

PACK, PDFS = sys.argv[1], sys.argv[2]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, 'public')
SRC = os.path.join(PACK, '01_Portfolio_XRay')
man = {}

def rec(key, rel, extra=None):
    im = Image.open(os.path.join(PUB, rel))
    man[key] = {'path': rel, 'w': im.width, 'h': im.height, 'alpha': im.mode == 'RGBA', **(extra or {})}

for sub in ['01_Environments', '03_Cropped_Transparent_PNGs']:
    d = os.path.join(PUB, 'assets', '01_Portfolio_XRay', sub); os.makedirs(d, exist_ok=True)
    for f in sorted(glob.glob(os.path.join(SRC, sub, '*.png'))):
        shutil.copy2(f, d)
        rec(os.path.basename(f)[:-4], f'assets/01_Portfolio_XRay/{sub}/{os.path.basename(f)}')

DER = os.path.join(PUB, 'assets', 'derived'); os.makedirs(DER, exist_ok=True)
# doors: find the centre seam (darkest vertical band near the middle)
doors = Image.open(os.path.join(SRC, '03_Cropped_Transparent_PNGs', 'PX_PROP_01_FrostedDoubleDoors_v01.png')).convert('RGBA')
g = doors.convert('L'); W, H = doors.size
cols = [sum(g.getpixel((x, y)) for y in range(int(H * .2), int(H * .8), 3)) for x in range(int(W * .44), int(W * .56))]
seam = int(W * .44) + cols.index(min(cols))
doors.crop((0, 0, seam, H)).save(os.path.join(DER, 'PX_PROP_01_FrostedDoubleDoors_v01__left.png'), optimize=True)
doors.crop((seam, 0, W, H)).save(os.path.join(DER, 'PX_PROP_01_FrostedDoubleDoors_v01__right.png'), optimize=True)
for side in ['left', 'right']:
    rec(f'PX_PROP_01_FrostedDoubleDoors_v01__{side}', f'assets/derived/PX_PROP_01_FrostedDoubleDoors_v01__{side}.png',
        {'derivedFrom': 'PX_PROP_01_FrostedDoubleDoors_v01', 'derivation': f'Split at the centre seam (x={seam}) into two leaves so the doors slide apart.'})
rep = Image.open(os.path.join(SRC, '03_Cropped_Transparent_PNGs', 'PX_FORM_03_ExaminationReport_v01.png')).convert('RGBA')
rep.crop((0, 27, rep.width, 106)).save(os.path.join(DER, 'PX_FORM_03_ExaminationReport_v01__header.png'), optimize=True)
rec('PX_FORM_03_ExaminationReport_v01__header', 'assets/derived/PX_FORM_03_ExaminationReport_v01__header.png',
    {'derivedFrom': 'PX_FORM_03_ExaminationReport_v01', 'derivation': 'Rows 27–106 (title + department) only. The baked section labels read "EVIOENCE BEHINO THE DESIGN" and cover 4 of 7 layers, so sections are live HTML.'})
json.dump(man, open(os.path.join(ROOT, 'src', 'data', 'asset-manifest.json'), 'w'), indent=1)

# ---- specimen pages ----
SPEC = {
    'bachat': ('BDES24-28_Sem_3_SDM217_EA2_Part_2_Nikhita_C_SDM_A_fall2025.pdf', list(range(1, 22))),
    'canva': ('_EIA_2___Nishita_Bajaj_SDM_A_Creative_Visualisation__2025__2_.pdf', [1, 3, 4, 6, 8, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21]),
}
pages = {}
for key, (fn, keep) in SPEC.items():
    src = glob.glob(os.path.join(PDFS, '*' + fn.split('_SDM')[0][-12:] + '*')) or glob.glob(os.path.join(PDFS, key + '.pdf'))
    pdf = os.path.join(PDFS, key + '.pdf')
    out = os.path.join(PUB, 'specimens', key); os.makedirs(out, exist_ok=True)
    tmp = f'/tmp/px_{key}'; os.makedirs(tmp, exist_ok=True)
    pages[key] = []
    for p in keep:
        subprocess.run(['pdftoppm', '-r', '80', '-f', str(p), '-l', str(p), '-singlefile', '-png', pdf, f'{tmp}/p{p}'], check=True)
        im = Image.open(f'{tmp}/p{p}.png').convert('RGB')
        im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
        note = None
        if key == 'bachat' and p == 13:
            # participant photographs occupy x 834–1208, y 156–648 of a 1280-wide render
            k = 1600 / 1280; box = tuple(round(v * k) for v in (830, 150, 1212, 652))
            region = im.crop(box).filter(ImageFilter.GaussianBlur(26))
            im.paste(region, box[:2])
            note = 'Participant photographs blurred in this exhibit (private individuals).'
        im.save(f'{out}/p{p:02d}.jpg', quality=80, optimize=True, progressive=True)
        t = im.copy(); t.thumbnail((320, 320)); t.save(f'{out}/p{p:02d}_t.jpg', quality=72, optimize=True)
        pages[key].append({'n': p, 'src': f'specimens/{key}/p{p:02d}.jpg', 'thumb': f'specimens/{key}/p{p:02d}_t.jpg', 'w': im.width, 'h': im.height, **({'note': note} if note else {})})
json.dump(pages, open(os.path.join(ROOT, 'src', 'data', 'pages.json'), 'w'), indent=1)
print('seam', seam, {k: len(v) for k, v in pages.items()})
