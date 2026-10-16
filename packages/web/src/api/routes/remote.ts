import { randomBytes, randomInt } from 'node:crypto';
import { z } from 'zod';
import { ORPCError } from '@orpc/server';
import { base } from '../__core/app';
import { authed } from '../middleware/auth';
import type { LiveSnapshot, RemoteCommand } from '../lib/remote-types';
import { s3, BUCKET } from '../lib/s3';
import { PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '../database';
import { sessions, sessionFiles } from '../database/schema';

const commandSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.enum(['play','stop','record','stopClips']) }),
  z.object({ kind: z.literal('tempo'), value: z.number().min(20).max(999) }),
  z.object({ kind: z.literal('track'), track: z.number().int().min(0).max(127), field: z.enum(['volume','panning','mute','solo','arm']), value: z.number().min(-1).max(1) }),
  z.object({ kind: z.literal('clip'), track: z.number().int().min(0).max(127), scene: z.number().int().min(0).max(127) }),
  z.object({ kind: z.literal('parameter'), track: z.number().int().min(0).max(127), device: z.number().int().min(0).max(127), parameter: z.number().int().min(0).max(1023), value: z.number().finite() }),
  z.object({ kind: z.literal('note'), note: z.number().int().min(0).max(127), velocity: z.number().int().min(0).max(127), on: z.boolean() }),
]);
const parameter = z.object({ id: z.number(), name: z.string().max(500), value: z.number(), min: z.number(), max: z.number() });
const track = z.object({ id: z.number(), name: z.string().max(500), volume: z.number(), panning: z.number(), mute: z.boolean(), solo: z.boolean(), arm: z.boolean(), canArm: z.boolean(), meter: z.number(), clips: z.array(z.object({ scene: z.number(), name: z.string().max(500), hasClip: z.boolean(), playing: z.boolean() })).max(128), devices: z.array(z.object({ id: z.number(), name: z.string().max(500), parameters: z.array(parameter).max(1024) })).max(128) });
const snapshotSchema = z.object({ live: z.boolean(), midi: z.boolean(), playing: z.boolean(), recording: z.boolean(), tempo: z.number(), beat: z.number(), version: z.string(), tracks: z.array(track).max(128), error: z.string().nullable() });
type Relay = { id: string; userId: string; code: string; codeExpires: number; companionToken: string; mobileToken: string | null; expires: number; heartbeat: number; snapshot: LiveSnapshot | null; queue: { id: string; time: number; command: RemoteCommand }[] };
const relays = new Map<string, Relay>();
const attempts = new Map<string, { count: number; reset: number }>();
const token = () => randomBytes(32).toString('hex');
function clean() { for (const [id,r] of relays) if (r.expires < Date.now()) relays.delete(id); for (const [ip,a] of attempts) if(a.reset < Date.now()) attempts.delete(ip); }
function find(key: string, role: 'mobile' | 'companion') {
  clean(); const r = [...relays.values()].find(r => (role === 'mobile' ? r.mobileToken : r.companionToken) === key);
  if (!r) throw new ORPCError('UNAUTHORIZED', { message: 'Pairing expired. Pair with your Mac again.' }); return r;
}
const keySchema = z.object({ token: z.string().length(64) });
export const remote = {
  create: authed.handler(({ context }) => {
    clean(); for (const [id,r] of relays) if(r.userId === context.user.id) relays.delete(id);
    const r: Relay = { id: token(), userId: context.user.id, code: String(randomInt(100000,1000000)), codeExpires: Date.now()+300000, companionToken: token(), mobileToken: null, expires: Date.now()+86400000, heartbeat: 0, snapshot: null, queue: [] };
    relays.set(r.id,r); return { token: r.companionToken, code: r.code, expiresAt: r.codeExpires };
  }),
  pair: base.input(z.object({ code: z.string().regex(/^\d{6}$/) })).handler(({ input, context }) => {
    clean(); const ip = context.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local';
    const a = attempts.get(ip) ?? { count: 0, reset: Date.now()+60000 }; a.count++; attempts.set(ip,a);
    if(a.count > 8) throw new ORPCError('TOO_MANY_REQUESTS', { message: 'Too many pairing attempts. Wait one minute.' });
    const r=[...relays.values()].find(r=>r.code===input.code && r.codeExpires>Date.now() && !r.mobileToken);
    if(!r) throw new ORPCError('NOT_FOUND',{message:'Invalid or expired code. Generate a new code on your Mac.'});
    r.mobileToken=token(); r.codeExpires=0; return { token:r.mobileToken };
  }),
  status: base.input(keySchema).handler(({ input }) => { const r=find(input.token,'mobile'); return { connected:Date.now()-r.heartbeat<4000, snapshot:r.snapshot }; }),
  command: base.input(keySchema.extend({ command: commandSchema })).handler(({ input }) => {
    const r=find(input.token,'mobile'); if(Date.now()-r.heartbeat>4000 || !r.snapshot?.live) throw new ORPCError('BAD_REQUEST',{message:'Ableton is not connected.'});
    if(input.command.kind==='note' && !r.snapshot.midi) throw new ORPCError('BAD_REQUEST',{message:'Virtual MIDI is unavailable on the Mac companion.'});
    r.queue=r.queue.filter(c=>Date.now()-c.time<1500);
    if(r.queue.length>=128) throw new ORPCError('TOO_MANY_REQUESTS');
    r.queue.push({id:token(),time:Date.now(),command:input.command});return {queued:true};
  }),
  exchange: base.input(keySchema.extend({ snapshot:snapshotSchema })).handler(({input})=>{
    const r=find(input.token,'companion');r.heartbeat=Date.now();r.snapshot=input.snapshot;
    const commands=r.queue.filter(c=>Date.now()-c.time<1500);r.queue=[];return {commands,paired:!!r.mobileToken};
  }),
  close: base.input(keySchema).handler(({input})=>{const r=find(input.token,'companion');relays.delete(r.id);return {ok:true};}),
  takeUpload: base.input(keySchema.extend({ filename:z.string().min(1).max(200), contentType:z.enum(['audio/mp4','audio/webm','audio/wav','audio/mpeg','audio/x-m4a']) })).handler(async({input})=>{
    const r=find(input.token,'mobile');const key=`users/${r.userId}/remote-takes/${token()}-${input.filename.replace(/[^\w.-]/g,'_')}`;
    const url=await getSignedUrl(s3,new PutObjectCommand({Bucket:BUCKET,Key:key,ContentType:input.contentType}),{expiresIn:600}); return {url,key};
  }),
  saveTake: base.input(keySchema.extend({key:z.string(),name:z.string().max(200),contentType:z.string()})).handler(async({input})=>{
    const r=find(input.token,'mobile'); if(!input.key.startsWith(`users/${r.userId}/remote-takes/`)) throw new ORPCError('FORBIDDEN');
    const head=await s3.send(new HeadObjectCommand({Bucket:BUCKET,Key:input.key}));
    const [session]=await db.insert(sessions).values({userId:r.userId,title:`Vocal take — ${new Date().toLocaleString()}`,daw:'ableton',bpm:r.snapshot?Math.round(r.snapshot.tempo):null,notes:'Recorded locally on mobile. Download and import into Live; not automatically synchronized to the arrangement.'}).returning();
    if(!session) throw new ORPCError("INTERNAL_SERVER_ERROR");
    await db.insert(sessionFiles).values({sessionId:session.id,name:input.name,storageKey:input.key,size:Number(head.ContentLength??0),contentType:input.contentType});return {sessionId:session.id};
  }),
};
