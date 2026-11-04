import { landmarks } from './pan-zoom-model';

// Original, fictional illustration. Shared geometry keeps the overview honest.
export default function PanZoomWorld({ selected = '' }: { selected?: string }) {
  return <g>
    <rect width="1000" height="700" rx="28" fill="#dce9d4" />
    <path d="M40 80 Q240 0 430 85 T960 80 L970 650 Q760 725 520 635 T30 630Z" fill="#b7d4b5" />
    <path d="M490 -20 C620 120 380 230 490 350 S640 510 490 730" stroke="#72adb5" strokeWidth="62" fill="none" />
    <path d="M170 540 Q70 300 270 190 Q450 80 710 230 Q880 360 800 565 Q640 650 505 440 Q350 410 170 540" stroke="#f7e8bd" strokeWidth="28" strokeLinecap="round" fill="none" />
    <path d="M170 540 Q70 300 270 190 Q450 80 710 230 Q880 360 800 565" stroke="#ad9563" strokeWidth="2" strokeDasharray="4 9" fill="none" />
    {[ [85,145],[130,105],[800,95],[875,150],[925,470],[90,595],[225,615],[340,560],[650,620] ].map(([x,y],i)=><g key={i} transform={`translate(${x} ${y})`}><rect x="-4" y="0" width="8" height="34" fill="#796348"/><circle cy="-6" r="27" fill={i%2?'#47745e':'#63885e'}/><circle cx="-10" cy="-15" r="12" fill="#78986b"/></g>)}
    <g transform="translate(270 190)"><circle r="67" fill="#b3c7a3"/><rect x="-45" y="-15" width="90" height="65" rx="5" fill="#f7eed2" stroke="#4d6366" strokeWidth="3"/><path d="M-52 -15 A52 52 0 0 1 52 -15Z" fill="#375d70"/><path d="M0 -42 L4 -32 L15 -32 L6 -25 L9 -14 L0 -21 L-9 -14 L-6 -25 L-15 -32 L-4 -32Z" fill="#ffdd8c"/><path d="M10 -5 L66 -28" stroke="#364958" strokeWidth="12"/><rect x="-10" y="20" width="20" height="30" fill="#9b6e45"/></g>
    <g transform="translate(710 230)"><circle r="83" fill="#86a77c" stroke="#597c60" strokeWidth="3"/>{[-1,1].flatMap(a=>[-1,1].map(b=><g key={`${a}${b}`} transform={`translate(${a*34} ${b*34})`}><rect x="-24" y="-24" width="48" height="48" rx="12" fill="#436d59"/>{[-10,0,10].map(x=><circle key={x} cx={x} cy={x/2} r="4" fill="#f3d389"/>)}</g>))}<circle r="18" fill="#eee0b9"/><path d="M0 10 L0 -17 L12 6Z" fill="#665c53"/></g>
    <g transform="translate(505 440) rotate(-20)"><rect x="-63" y="-23" width="126" height="46" rx="8" fill="#9a704b" stroke="#614b3c" strokeWidth="4"/>{[-45,-25,-5,15,35].map(x=><path key={x} d={`M${x} -22V22`} stroke="#cfaa79" strokeWidth="3"/>)}<path d="M6 -11 A13 13 0 1 0 6 11 A10 10 0 0 1 6 -11" fill="#ffedaf"/></g>
    <g transform="translate(800 565)"><rect x="-43" y="-24" width="86" height="70" fill="#e2c6a0" stroke="#765c49" strokeWidth="3"/><path d="M-55 -22 L0 -65 L55 -22Z" fill="#82545c"/><rect x="-25" y="-8" width="21" height="21" fill="#ffe58f" stroke="#765c49" strokeWidth="3"/><rect x="13" y="12" width="20" height="34" fill="#765c49"/>{[-35,-18,0].map(x=><g key={x}><rect x={x} y="49" width="11" height="12" fill="#b97c59"/><circle cx={x+5} cy="45" r="7" fill="#537c55"/></g>)}</g>
    <g transform="translate(170 540)">{[-38,0,38].map((x,i)=><g key={x} transform={`translate(${x} ${i%2?-35:-5})`}><rect x="-4" width="8" height="42" fill="#796348"/><path d="M0 -70L-30 9H30Z" fill="#3f715b"/><path d="M0 -50L-22 0H22Z" fill="#5f8d67"/></g>)}<path d="M12 15V-30L34 -20L12 -10" fill="#c06c58" stroke="#665347" strokeWidth="3"/></g>
    <g fill="#375b50" fontSize="19" fontFamily="sans-serif" textAnchor="middle">{landmarks.map((m,i)=><text key={m.id} x={m.x} y={m.y+(i===1?112:94)}>{String(i+1).padStart(2,'0')} {m.name}</text>)}</g>
    <g fill="#345c50" fontSize="18" fontFamily="sans-serif"><text x="45" y="50">HOSHIMI FIELD NOTES</text><text x="900" y="55">N ↑</text><text x="45" y="665">架空の小世界 / 1000 × 700</text></g>
    {landmarks.map(m=><circle data-landmark={m.id} key={m.id} cx={m.x} cy={m.y} r={selected===m.id?84:3} fill={selected===m.id?'none':'#253d40'} stroke={selected===m.id?'#bd4d3e':'none'} strokeWidth="5" strokeDasharray="10 5"/>)}
  </g>;
}
