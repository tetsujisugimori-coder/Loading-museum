'use strict';
const mode=new URLSearchParams(location.search).get('fault')||'normal';
if(!['normal','commit-delay','cancel-race','dom-delay'].includes(mode))throw Error('invalid fault');
const events=[];let generation=0,committed='Idle',pending=null,timer=null;
const emit=(kind,data={})=>events.push({seq:events.length+1,kind,time:Date.now(),generation,...data});
const reflect=(value)=>{document.querySelector('#state').textContent=value;emit('dom-reflection',{value});};
function commit(value,token){emit('guard',{token,accepted:token===generation});if(token!==generation)return;committed=value;emit('commit',{value,token});if(mode==='dom-delay'){pending=()=>reflect(value);emit('held-dom');}else reflect(value);}
document.querySelector('#start').onclick=()=>{generation++;const token=generation;emit('timer-registration',{token});timer=setTimeout(()=>{emit('callback-start',{token});emit('update-request',{value:'Done',token});if(mode==='commit-delay'||mode==='cancel-race'){pending=()=>commit('Done',token);emit('held-commit',{token});}else commit('Done',token);},100);};
document.querySelector('#cancel').onclick=()=>{emit('cancel-request');generation++;clearTimeout(timer);committed='Cancelled';reflect('Cancelled');emit('cancel-processed');};
document.querySelector('#release').onclick=()=>{const action=pending;pending=null;if(!action)throw Error('no held boundary');emit('release');action();emit('release-finished');};
window.safetySnapshot=()=>({events:structuredClone(events),committed,dom:document.querySelector('#state').textContent,pending:!!pending,mode});
