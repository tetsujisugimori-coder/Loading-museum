"use client";
import {useReducer} from 'react';
type History<T>={past:T[];present:T;future:T[]};
type Action<T>={type:'commit';value:T}|{type:'undo'|'redo'|'reset'};
export function historyReducer<T>(state:History<T>,action:Action<T>,initial:T):History<T>{
 if(action.type==='reset')return {past:[],present:initial,future:[]};
 if(action.type==='undo')return state.past.length?{past:state.past.slice(0,-1),present:state.past[state.past.length-1],future:[state.present,...state.future]}:state;
 if(action.type==='redo')return state.future.length?{past:[...state.past,state.present],present:state.future[0],future:state.future.slice(1)}:state;
 if(action.type==='commit')return JSON.stringify(state.present)===JSON.stringify(action.value)?state:{past:[...state.past,state.present].slice(-50),present:action.value,future:[]};
 return state;
}
export function useHistory<T>(initial:T){const [state,dispatch]=useReducer((s:History<T>,a:Action<T>)=>historyReducer(s,a,initial),{past:[],present:initial,future:[]});return {value:state.present,canUndo:!!state.past.length,canRedo:!!state.future.length,commit:(value:T)=>dispatch({type:'commit',value}),undo:()=>dispatch({type:'undo'}),redo:()=>dispatch({type:'redo'}),reset:()=>dispatch({type:'reset'})}}
