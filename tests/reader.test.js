import test from 'node:test';
import assert from 'node:assert/strict';
import {savedSpread,canTurn,loadSpread,saveSpread,STORAGE_KEY} from '../reader-state.js';
import {FlipEngine,progressFor,shouldComplete} from '../flip-engine.js';
test('saved spreads validate, truncate and clamp safely', () => {
  for (const [value, expected] of [[null,0],[undefined,0],['',0],['oops',0],['NaN',0],['Infinity',0],[Infinity,0],['-5',0],['200',14],['4.9',4],['14',14],['7',7],[{},0]]) assert.equal(savedSpread(value),expected);
});
test('storage failures never prevent reading', () => {
  const denied = {getItem(){throw Error('denied');},setItem(){throw Error('denied');}};
  assert.equal(loadSpread(denied),0); assert.doesNotThrow(()=>saveSpread(denied,8));
  const values = new Map(); const storage = {getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
  saveSpread(storage,5); assert.equal(values.get(STORAGE_KEY),'5'); assert.equal(loadSpread(storage),5);
});
test('navigation cannot leave the 15 spreads or accept invalid directions', () => {
  assert.equal(canTurn(0,-1),false); assert.equal(canTurn(14,1),false);
  for (let i=0;i<15;i++) { assert.equal(canTurn(i,1),i<14); assert.equal(canTurn(i,-1),i>0); }
  for (const value of [NaN,Infinity,-1,15,2.5]) assert.equal(canTurn(value,1),false);
  for (const direction of [0,2,-2,NaN]) assert.equal(canTurn(5,direction),false);
});
test('both drag directions return before midpoint and complete after it', () => {
  assert.equal(progressFor(900,700,400,1),.25);
  assert.equal(progressFor(100,300,400,-1),.25);
  assert.equal(shouldComplete(.5),false); assert.equal(shouldComplete(.501),true);
  assert.equal(progressFor(900,-100,400,1),1); assert.equal(progressFor(900,1000,400,1),0);
});
test('direct navigation refuses busy, fractional and out-of-range requests', () => {
  const engine = Object.assign(Object.create(FlipEngine.prototype),{spread:0,count:15,draw(){this.drawn=true;}});
  for(const value of [-1,15,NaN,2.5]) assert.equal(engine.goTo(value),false);
  engine.animating=true; assert.equal(engine.goTo(4),false); engine.animating=false;
  engine.drag={}; assert.equal(engine.goTo(4),false); engine.drag=null;
  assert.equal(engine.goTo(14),true); assert.equal(engine.spread,14); assert.equal(engine.drawn,true);
});
