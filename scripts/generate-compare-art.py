"""Original, fictional comparison studies. No photographs or external assets."""
from pathlib import Path

DEST = Path(__file__).resolve().parents[1] / 'public' / 'compare'
DEST.mkdir(parents=True, exist_ok=True)

def wrap(body, name):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760">
<title>{name} — original fictional illustration</title>{body}</svg>'''

for after in (False, True):
    body = '''<rect width="1200" height="760" fill="#dce9e9"/>
<circle cx="1010" cy="130" r="66" fill="#f4d78f"/>
<path d="M0 320L130 230 250 305 370 210 530 320 730 240 940 320 1100 235 1200 300V510H0Z" fill="#8cb2ad"/>
<path d="M0 420Q300 370 600 430T1200 415V760H0Z" fill="#487d86"/>
<path d="M30 520H270M910 490H1130M740 580H1100M80 640H400" stroke="#a5c9c6" stroke-width="5"/>
<path d="M0 610L1200 560V760H0Z" fill="#d5c5a6"/>
<path d="M0 650L1200 600M0 720L1200 670M200 650L250 760M510 625L560 760M850 615L900 760" stroke="#b9a98d" stroke-width="3"/>
<rect x="275" y="273" width="650" height="335" fill="WALL"/>
<path d="M235 285L600 108 965 285Z" fill="ROOF"/>
<path d="M270 277H930M345 240H855M425 202H775M505 164H695" stroke="#795c50" stroke-width="5"/>
<rect x="293" y="574" width="614" height="35" fill="#8d8c77"/>
<rect x="547" y="397" width="106" height="212" fill="#375660"/>
<path d="M600 407V605" stroke="#233d45" stroke-width="5"/>
<circle cx="616" cy="510" r="5" fill="#e6bb71"/>
<rect x="495" y="302" width="210" height="53" rx="3" fill="#244b55"/>
<text x="600" y="338" text-anchor="middle" fill="#f7e8bd" font-size="24" font-family="sans-serif" letter-spacing="5">PORT ATELIER</text>
<g fill="#9dc4c5" stroke="#556d70" stroke-width="9">
<rect x="340" y="385" width="115" height="132"/><rect x="745" y="385" width="115" height="132"/></g>
<path d="M397 390V512M345 449H450M802 390V512M750 449H855" stroke="#e6d8bc" stroke-width="7"/>
<rect x="88" y="513" width="26" height="150" fill="#75634c"/>
<g fill="#527d66"><circle cx="100" cy="422" r="79"/><circle cx="63" cy="476" r="69"/><circle cx="146" cy="480" r="65"/></g>
<path d="M995 592H1145V610H995ZM1010 608V665M1130 608V665" fill="none" stroke="#725a49" stroke-width="12"/>
<path d="M985 569H1155" stroke="#725a49" stroke-width="20"/>
'''.replace('WALL', '#eee1bf' if after else '#b9b09b').replace('ROOF', '#b46a50' if after else '#807268')
    if after:
        body += '''<path d="M327 376H466M732 376H872" stroke="#ac654d" stroke-width="13"/>
<g fill="#bd6e50"><rect x="335" y="524" width="125" height="27"/><rect x="740" y="524" width="125" height="27"/></g>
<g stroke="#59805a" stroke-width="5"><path d="M350 528V506M380 528V498M413 528V507M445 528V500M760 528V504M795 528V497M832 528V506M850 528V500"/></g>
<g fill="#d58a91"><circle cx="350" cy="505" r="10"/><circle cx="413" cy="505" r="9"/><circle cx="795" cy="497" r="11"/><circle cx="850" cy="500" r="10"/></g>
<g fill="#e6b45c"><circle cx="380" cy="498" r="11"/><circle cx="445" cy="500" r="9"/><circle cx="760" cy="504" r="11"/><circle cx="832" cy="505" r="9"/></g>'''
    else:
        body += '''<path d="M490 285L478 330 500 347 483 378M690 529L704 552 691 574M320 540L348 558 337 574" fill="none" stroke="#79746c" stroke-width="5"/>
<path d="M748 391L786 442 755 490 798 512M806 392L826 420 811 443" fill="none" stroke="#445b60" stroke-width="4"/>
<path d="M550 146L600 122 638 143 613 171Z" fill="#c7bc9e"/>
<path d="M967 654Q1015 605 1031 646T1100 650" fill="none" stroke="#7f8d63" stroke-width="9"/>'''
    (DEST / f'restoration-{"after" if after else "before"}.svg').write_text(wrap(body, 'Harbour atelier / restoration study'), encoding='utf-8')

for after in (False, True):
    # Identical geometry; only the palette changes in this exposure/color study.
    palette = ['#e8d5ae', '#80a6a8', '#608375', '#e8b75a', '#b6533e', '#396675', '#b4c9a1', '#f2ead3'] if after else ['#8f9fa8', '#718593', '#657c80', '#a5a99b', '#7d828b', '#5b707e', '#929f9e', '#b0b9bc']
    body = '''<rect width="1200" height="760" fill="P0"/>
<rect x="90" y="62" width="1020" height="460" rx="160" fill="P1"/>
<path d="M90 420L250 270 405 350 570 210 800 365 950 255 1110 400V522H90Z" fill="P2"/>
<circle cx="900" cy="190" r="66" fill="P3"/>
<path d="M90 310H1110M600 62V522M285 102V522M915 102V522" stroke="P7" stroke-width="18"/>
<path d="M0 555H1200V760H0Z" fill="P5"/>
<ellipse cx="600" cy="675" rx="430" ry="34" fill="#213a44" opacity=".22"/>
<path d="M250 585L950 585 1050 650 150 650Z" fill="P7"/>
<path d="M210 650V760M990 650V760" stroke="P7" stroke-width="28"/>
<path d="M365 483H515L495 610H385Z" fill="P4"/>
<path d="M440 490V288M440 390Q340 350 345 293Q433 295 440 390M440 440Q550 394 542 330Q447 339 440 440M440 345Q495 308 487 258Q432 273 440 345" fill="P2" stroke="P2" stroke-width="7"/>
<path d="M635 515Q695 485 748 515L735 604H648Z" fill="P3"/>
<path d="M745 530Q815 518 791 558Q777 576 740 570" fill="none" stroke="P3" stroke-width="15"/>
<rect x="810" y="565" width="108" height="36" rx="3" fill="P4"/>
<rect x="820" y="550" width="108" height="17" rx="2" fill="P6"/>
<path d="M270 624H935" stroke="P1" stroke-width="4"/>
'''
    for i, color in enumerate(palette):
        body = body.replace(f'P{i}', color)
    (DEST / f'correction-{"after" if after else "before"}.svg').write_text(wrap(body, 'Window light / color correction study'), encoding='utf-8')
