import { ASSETS, WIDTH, HEIGHT, validLayers, type AssetId, type Layer } from './layer-composer-model';
export type Images = Record<AssetId, HTMLCanvasElement>;
/** All teaching artwork is original, synchronously generated locally. No network or image decoding is needed. */
export function createImages(): Images {
  return Object.fromEntries(ASSETS.map(a=>{
    const c=document.createElement('canvas');c.width=a.width;c.height=a.height;const x=c.getContext('2d');if(!x)throw new Error('教材画像のCanvasを作成できません');
    if(a.id==='landscape'){
      x.fillStyle='#c7d7db';x.fillRect(0,0,600,400);
      x.fillStyle='#edb586';x.fillRect(0,160,600,240);
      x.fillStyle='#406f78';x.beginPath();x.moveTo(0,320);x.bezierCurveTo(170,130,300,430,600,230);x.lineTo(600,400);x.lineTo(0,400);x.fill();
      x.fillStyle='#214551';x.beginPath();x.moveTo(0,370);x.bezierCurveTo(210,250,400,390,600,310);x.lineTo(600,400);x.lineTo(0,400);x.fill();
    }else if(a.id==='sun'){
      x.fillStyle='#eea24b';x.beginPath();x.arc(100,100,85,0,Math.PI*2);x.fill();
      x.fillStyle='rgba(255,238,183,0.5)';x.fillRect(80,25,40,150);
    }else{
      x.strokeStyle='#215568';x.lineWidth=7;x.beginPath();x.moveTo(110,240);x.bezierCurveTo(155,150,75,100,140,0);x.stroke();
      x.fillStyle='#468fa1';for(const [cx,cy,rot] of [[85,75,.7],[157,45,-.8],[90,150,.6],[160,120,-.7],[148,195,-.9]]){x.beginPath();x.ellipse(cx,cy,43,20,rot,0,Math.PI*2);x.fill();}
    }
    return[a.id,c];
  })) as Images;
}
export function render(canvas: HTMLCanvasElement, layers: Layer[], images: Images): void {
  if(!validLayers(layers))throw new Error('編集データが不正です');
  const c=canvas.getContext('2d');if(!c)throw new Error('Canvas描画に失敗しました');
  canvas.width=WIDTH;canvas.height=HEIGHT;c.clearRect(0,0,WIDTH,HEIGHT);
  for(const l of layers){if(!l.visible)continue;const img=images[l.imageId];if(!img||img.width<=0||img.height<=0)throw new Error('教材画像が未準備です');c.save();try{c.globalAlpha=l.opacity;c.globalCompositeOperation=l.blend==='normal'?'source-over':l.blend;c.drawImage(img,l.x,l.y,l.width,l.height);}finally{c.restore();}}
}
