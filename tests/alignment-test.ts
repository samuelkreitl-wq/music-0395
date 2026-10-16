import { strict as assert } from 'node:assert';
import { analyzeOffset, decodeWav, encodeWav, shiftStem, testStems, type Stem } from '../packages/web/src/web/lib/alignment';

for (const lag of [180, -245, 0, 650, -500]) {
  const { lead, backing } = testStems(lag);
  const result = analyzeOffset(lead, backing);
  assert(result.accepted, JSON.stringify(result));
  assert(Math.abs(result.offsetMs - lag) <= 5, JSON.stringify(result));
  const output = shiftStem(backing, -result.offsetMs);
  const check = analyzeOffset(lead, output);
  assert(check.accepted && Math.abs(check.offsetMs) <= 5);
  assert.equal(output.sampleRate, backing.sampleRate);
  assert.equal(output.channels.length, 2);
  assert.equal(output.channels[0]!.length, backing.channels[0]!.length);
  console.log('OFFSET_PASS', lag, result.score.toFixed(3), result.separation.toFixed(3));
}
const { lead } = testStems();
const silence: Stem = { name:'silence', sampleRate:48000, channels:[new Float32Array(48000*8)] };
assert.equal(analyzeOffset(lead, silence).accepted, false);
const constant: Stem = { ...silence, channels:[new Float32Array(48000*8).fill(0.2)] };
assert.equal(analyzeOffset(lead, constant).accepted, false);
const unrelated = { ...silence, channels:[new Float32Array(48000*8)] };
let seed = 41;
for(let i=0;i<unrelated.channels[0]!.length;i++) { seed = (Math.imul(seed,1664525)+1013904223)>>>0; unrelated.channels[0]![i]=(seed/4294967296-0.5)*0.5; }
assert.equal(analyzeOffset(lead, unrelated).accepted, false);
assert.equal(analyzeOffset(lead, testStems(1000).backing).accepted, false);
const tiny: Stem = { name:'samples', sampleRate:8000, channels:[new Float32Array([0.2,-0.4,1.2,-1.3]),new Float32Array([0.1,0.5,0.3,0.7])] };
const moved = shiftStem(tiny, 0.125);
assert.deepEqual([...moved.channels[0]!], [0,...tiny.channels[0]!.slice(0,3)]);
assert.deepEqual([...shiftStem(tiny,-0.125).channels[1]!], [...tiny.channels[1]!.slice(1),0]);
const roundtrip = decodeWav(encodeWav(tiny), 'roundtrip');
assert.equal(roundtrip.sampleRate,8000);
assert.deepEqual(roundtrip.channels,tiny.channels);
assert.throws(()=>decodeWav(new ArrayBuffer(3),'bad'));
console.log('SILENCE_AMBIGUITY_EDGE_REJECTION_AND_FLOAT_WAV_PASS');