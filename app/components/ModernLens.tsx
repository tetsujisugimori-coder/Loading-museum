"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import "./modern-lens.css";

const W = 480, H = 300;
/** The artwork is generated here: no external image or source assets. */
function makeArtwork(): ImageData {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#eeaf71'); grad.addColorStop(.5, '#da547d'); grad.addColorStop(1, '#2c6c9f');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 9; i++) {
    ctx.strokeStyle = `hsla(${165 + i * 11},85%,${55 + i * 2}%,.75)`;
    ctx.lineWidth = 7; ctx.beginPath();
    ctx.ellipse(240, 150, 38 + i * 28, 22 + i * 16, -.4, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = '#f7efcb'; ctx.beginPath(); ctx.arc(325, 95, 42, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#243753'; ctx.font = 'bold 42px sans-serif'; ctx.fillText('LIGHT', 28, 230);
  return ctx.getImageData(0, 0, W, H);
}

export default function ModernLens() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const source = useRef<ImageData | null>(null);
  const grayscale = useRef<ImageData | null>(null);
  const [x, setX] = useState(50), [y, setY] = useState(50);
  const [size, setSize] = useState(55), [distortion, setDistortion] = useState(45);
  useEffect(() => {
    const image = makeArtwork(); source.current = image;
    const gray = new ImageData(new Uint8ClampedArray(image.data), W, H);
    for (let i=0; i<gray.data.length; i+=4) { const v=gray.data[i]*.2126+gray.data[i+1]*.7152+gray.data[i+2]*.0722; gray.data[i]=gray.data[i+1]=gray.data[i+2]=v; }
    grayscale.current=gray;
  }, []);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d'); const image = source.current;
    const background = grayscale.current;
    if (!ctx || !image || !background) return;
    // Coalesce pointer updates into a frame; only the lens rectangle needs color sampling.
    const frame = requestAnimationFrame(() => {
      const src = image.data;
      ctx.putImageData(background,0,0);
      const cx = x / 100 * W, cy = y / 100 * H, radius = 18 + size * .8;
      const left = Math.max(0, Math.floor(cx-radius)), top = Math.max(0, Math.floor(cy-radius));
      const right = Math.min(W, Math.ceil(cx+radius)), bottom = Math.min(H, Math.ceil(cy+radius));
      const width=right-left, height=bottom-top;
      const out = ctx.createImageData(width,height), dest = out.data;
      const channel = (sx: number, sy: number, ch: number) => {
        const px = Math.max(0, Math.min(W-1, Math.round(sx)));
        const py = Math.max(0, Math.min(H-1, Math.round(sy)));
        return src[(py*W+px)*4+ch];
      };
      for (let py=top; py<bottom; py++) for (let px=left; px<right; px++) {
        const index = ((py-top)*width+px-left)*4, dx=(px-cx)/radius, dy=(py-cy)/radius;
        const falloff = Math.max(0, 1 - (dx*dx+dy*dy)/2);
        const scale = 1 - distortion/100 * .5 * falloff;
        const sx = cx + (px-cx)*scale, sy = cy + (py-cy)*scale;
        const shift = distortion/100 * 5 * (1-falloff);
        dest[index]=channel(sx+dx*shift,sy+dy*shift,0);
        dest[index+1]=channel(sx,sy,1);
        dest[index+2]=channel(sx-dx*shift,sy-dy*shift,2);
        dest[index+3]=255;
      }
      ctx.putImageData(out,left,top);
      ctx.strokeStyle = '#fff'; ctx.lineWidth=2; ctx.strokeRect(cx-radius,cy-radius,radius*2,radius*2);
    });
    return () => cancelAnimationFrame(frame);
  }, [x,y,size,distortion]);
  function point(e: PointerEvent<HTMLCanvasElement>) {
    const rect=e.currentTarget.getBoundingClientRect();
    setX(Math.max(0,Math.min(100,Math.round((e.clientX-rect.left)/rect.width*100))));
    setY(Math.max(0,Math.min(100,Math.round((e.clientY-rect.top)/rect.height*100))));
  }
  return <div className="lensExperiment">
    <canvas ref={canvas} width={W} height={H} aria-label="色と屈折を表示するレンズ。下のスライダーでも位置を操作できます。" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId); point(e);}} onPointerMove={e=>{if(e.pointerType === 'mouse' || e.buttons) point(e);}} />
    <p>ドラッグしてレンズを移動。周囲は白黒、内側は画素の参照位置を曲げ、赤と青をずらします。</p>
    <div className="modernControls"><label>横位置 <input type="range" min="0" max="100" value={x} onChange={e=>setX(+e.target.value)}/></label><label>縦位置 <input type="range" min="0" max="100" value={y} onChange={e=>setY(+e.target.value)}/></label><label>大きさ <input type="range" min="0" max="100" value={size} onChange={e=>setSize(+e.target.value)}/></label><label>歪み・色ずれ <input type="range" min="0" max="100" value={distortion} onChange={e=>setDistortion(+e.target.value)}/></label><button onClick={()=>{setX(50);setY(50);setSize(55);setDistortion(45);}}>リセット</button></div>
  </div>;
}
