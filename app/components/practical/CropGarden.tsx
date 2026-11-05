// Original illustration: a garden, cottage, moon bridge and orchard. No external assets.
const flowers = [[98,526],[126,548],[164,511],[195,561],[244,527],[282,573],[316,538]];
const trees = [[755,150,45],[863,217,56],[927,129,40],[775,340,36],[917,367,44]];
export default function CropGarden() {
  return <g data-crop-art="garden">
    <rect width="1000" height="700" fill="#d9e6da" />
    <path d="M0 235Q180 110 355 220T700 208T1000 215V0H0Z" fill="#bbd0be" />
    <circle cx="688" cy="88" r="35" fill="#f7d997" />
    <path d="M0 310Q260 220 500 303T1000 266V700H0Z" fill="#9fbc8c" />
    <path d="M560 0Q444 144 549 301T542 700" fill="none" stroke="#75a7ad" strokeWidth="111" />
    <path d="M550 0Q432 145 538 301T531 700" fill="none" stroke="#b6d1ce" strokeWidth="8" strokeDasharray="20 30" />
    <path d="M260 377Q260 445 388 466T747 557" fill="none" stroke="#e5d2aa" strokeWidth="48" />
    <g data-crop-feature="house">
      <rect x="132" y="230" width="259" height="170" rx="4" fill="#f0dfbb" />
      <path d="M107 238L258 124L419 238Z" fill="#a14e3e" /><path d="M134 226L258 139L391 227" fill="none" stroke="#d08a60" strokeWidth="7" />
      <rect x="333" y="146" width="29" height="68" fill="#865040" />
      <rect x="239" y="303" width="49" height="97" rx="22" fill="#3d666a" />
      {[168,317].map(x => <g key={x}><rect x={x} y="277" width="41" height="50" rx="18" fill="#f6c969" stroke="#6c7e71" strokeWidth="6" /><path d={`M${x + 20} 278v48M${x} 302h41`} stroke="#6c7e71" strokeWidth="4" /></g>)}
      <path d="M124 400h278" stroke="#6d7c5b" strokeWidth="10" />
    </g>
    <g data-crop-feature="garden">
      <path d="M60 491Q212 444 366 495L345 620Q204 657 65 610Z" fill="#527a63" />
      {flowers.map(([x,y],i) => <g key={x}><path d={`M${x} ${y}v32`} stroke="#d9e5a1" strokeWidth="5" /><circle cx={x} cy={y} r={i%2 ? 17 : 13} fill={i%2 ? '#efb775' : '#e9a4a2'} /><circle cx={x} cy={y} r="5" fill="#f7e8af" /></g>)}
      <path d="M46 615Q214 672 367 625" fill="none" stroke="#efdfbf" strokeWidth="7" />
    </g>
    <g data-crop-feature="bridge">
      <path d="M428 438Q532 353 636 438V480Q532 408 428 480Z" fill="#dec296" stroke="#82654e" strokeWidth="5" />
      <path d="M422 426Q532 337 642 426M424 450Q532 365 640 450" fill="none" stroke="#795846" strokeWidth="9" />
      {[443,479,516,553,590,627].map((x,i) => <path key={x} d={`M${x} ${i===0||i===5?414: i===1||i===4?392:381}v44`} stroke="#795846" strokeWidth="6" />)}
    </g>
    <g data-crop-feature="orchard">{trees.map(([x,y,r],i) => <g key={x + y}><path d={`M${x} ${y}v${r+38}`} stroke="#7a624b" strokeWidth="13" /><circle cx={x} cy={y} r={r} fill={i%2 ? '#47735e' : '#628968'} /><circle cx={x-13} cy={y-13} r={r*.49} fill="#8da875" /><circle cx={x+15} cy={y+7} r="9" fill="#e0ad66" /></g>)}</g>
    <g data-crop-feature="pavilion"><path d="M758 567h142v86H758Z" fill="#d6c6a0" /><path d="M737 572l92-64 92 64Z" fill="#486e71" /><rect x="811" y="596" width="36" height="57" fill="#b56d4c" /><circle cx="830" cy="548" r="10" fill="#f3d68c" /></g>
    <path d="M24 676h952" stroke="#789676" strokeWidth="3" strokeDasharray="4 14" />
  </g>;
}
