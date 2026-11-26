import {createHash} from 'node:crypto';
export const hash = x => createHash('sha256').update(x).digest('hex');
export const bytes = x => Buffer.from(JSON.stringify(x));
export const clone = x => structuredClone(x);
export function insist(ok, code) { if (!ok) throw new Error(code); }
export function exact(x, keys, code='SCHEMA_INVALID') { insist(x && Object.getPrototypeOf(x)===Object.prototype && Object.keys(x).sort().join('|')===keys.slice().sort().join('|'),code); }
export const text = x => typeof x==='string' && x.length>0;
export const integer = x => Number.isSafeInteger(x) && x>=0;
export function freeze(x) { if(x&&typeof x==='object') {Object.values(x).forEach(freeze);Object.freeze(x);} return x; }
