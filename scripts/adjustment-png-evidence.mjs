/** Decode the non-interlaced 8-bit RGB/RGBA PNG screenshots used by this diagnostic.
 * Unsupported encodings fail closed; this is structural/pixel verification, not visual review.
 */
import {inflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const need=(ok,s)=>{if(!ok)throw Error(s);};
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
export function decodeEvidencePng(bytes){
 need(Buffer.isBuffer(bytes)&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'PNG_FORMAT');
 let offset=8,width,height,channels,end=false,idatSeen=false,idatEnded=false;const chunks=[];
 while(offset<bytes.length){need(offset+12<=bytes.length,'PNG_TRUNCATED_CHUNK');const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);need(length<=bytes.length-offset-12,'PNG_TRUNCATED_DATA');const body=bytes.subarray(offset+8,offset+8+length);need(crc32(bytes.subarray(offset+4,offset+8+length))===bytes.readUInt32BE(offset+8+length),'PNG_CRC');
  if(offset===8)need(type==='IHDR','PNG_IHDR_FIRST');
  if(type==='IHDR'){need(width===undefined&&length===13,'PNG_IHDR');width=body.readUInt32BE(0);height=body.readUInt32BE(4);channels=body[9]===2?3:body[9]===6?4:0;need(width>0&&height>0&&width*height<=20000000&&body[8]===8&&channels&&body[10]===0&&body[11]===0&&body[12]===0,'PNG_UNSUPPORTED_OR_SIZE');}
  else if(type==='IDAT'){need(width&& !idatEnded,'PNG_IDAT_ORDER');idatSeen=true;chunks.push(body);}
  else {if(idatSeen)idatEnded=true;if(type==='IEND'){need(length===0&&idatSeen&&offset+12===bytes.length,'PNG_IEND');end=true;}else need(type[0]===type[0].toLowerCase()||type==='PLTE','PNG_UNKNOWN_CRITICAL');}
  offset+=length+12;
 }
 need(end&&chunks.length,'PNG_INCOMPLETE');const stride=width*channels,raw=inflateSync(Buffer.concat(chunks),{maxOutputLength:(stride+1)*height});need(raw.length===(stride+1)*height,'PNG_PIXEL_LENGTH');const pixels=Buffer.alloc(stride*height);
 for(let y=0;y<height;y++){const filter=raw[y*(stride+1)];need(filter<=4,'PNG_FILTER');for(let x=0;x<stride;x++){const a=x>=channels?pixels[y*stride+x-channels]:0,b=y?pixels[(y-1)*stride+x]:0,c=y&&x>=channels?pixels[(y-1)*stride+x-channels]:0;let predict=0;if(filter===1)predict=a;else if(filter===2)predict=b;else if(filter===3)predict=Math.floor((a+b)/2);else if(filter===4){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);predict=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}pixels[y*stride+x]=(raw[y*(stride+1)+1+x]+predict)&255;}}
 return {width,height,channels,pixelSHA256:createHash('sha256').update(pixels).digest('hex')};
}
