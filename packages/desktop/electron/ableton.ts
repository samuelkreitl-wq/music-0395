import { UDPPort } from 'osc';
import { createRequire } from 'node:module';
import type { LiveSnapshot, LiveTrack, RemoteCommand } from '../../web/src/api/lib/remote-types';

/** Loopback-only AbletonOSC adapter. Tracks and clips come from Live, never demo data. */
export class AbletonAdapter {
  private port: UDPPort;
  private lastReply=0;
  private ready=false;
  private midi: any = null;
  private notes=new Set<number>();
  private noteTimeouts=new Map<number,ReturnType<typeof setTimeout>>();
  snapshot: LiveSnapshot = { live:false,midi:false,playing:false,recording:false,tempo:120,beat:0,version:'',tracks:[],error:null };
  constructor() {
    this.port=new UDPPort({localAddress:'127.0.0.1',localPort:11001,remoteAddress:'127.0.0.1',remotePort:11000,metadata:true});
    this.port.on('ready',()=>{this.ready=true;this.poll();});
    this.port.on('error',(e: Error)=>{this.snapshot.error=e.message;});
    this.port.on('message',(m: {address:string;args:{value:unknown}[]})=>this.receive(m.address,m.args.map(a=>a.value)));
    this.port.open();
    try {
      const require=createRequire(import.meta.url); const midi=require('@julusian/midi');
      this.midi=new midi.Output();this.midi.openVirtualPort('Finish the Song Remote'); this.snapshot.midi=true;
    } catch { this.snapshot.midi=false; }
  }
  send(address:string,args:(number|string)[]=[]) {
    if(this.ready) this.port.send({address,args:args.map(value=>({type:typeof value==='string'?'s':Number.isInteger(value)?'i':'f',value}))});
  }
  poll() {
    this.snapshot.live=Date.now()-this.lastReply<3000;
    for(const p of ['is_playing','record_mode','tempo','current_song_time','num_tracks','num_scenes']) this.send(`/live/song/get/${p}`);
    this.send('/live/application/get/version');
    for (const t of this.snapshot.tracks.slice(0,32)) {
      for(const p of ['name','volume','panning','mute','solo','arm','can_be_armed','output_meter_level','playing_slot_index']) this.send(`/live/track/get/${p}`,[t.id]);
      this.send('/live/track/get/clips/name',[t.id]);this.send('/live/track/get/devices/name',[t.id]);
      for(const d of t.devices.slice(0,8)) for(const p of ['name','value','min','max']) this.send(`/live/device/get/parameters/${p}`,[t.id,d.id]);
    }
  }
  private track(id:number):LiveTrack {
    let t=this.snapshot.tracks.find(t=>t.id===id);
    if(!t){t={id,name:`Track ${id+1}`,volume:0,panning:0,mute:false,solo:false,arm:false,canArm:false,meter:0,clips:[],devices:[]};this.snapshot.tracks.push(t);}return t;
  }
  private receive(address:string,a:unknown[]) {
    if(!address.startsWith('/live/')) return;
    this.lastReply=Date.now();this.snapshot.live=true;
    const p=address.split('/').at(-1)!;
    if(address==='/live/error'){this.snapshot.error=String(a[0]);return;}
    if(address.includes('/application/')){this.snapshot.version=a.join('.');return;}
    if(address.includes('/song/')){
      if(p==='num_tracks'){const n=Math.min(32,Number(a[0]));for(let i=0;i<n;i++)this.track(i);this.snapshot.tracks=this.snapshot.tracks.filter(t=>t.id<n);}
      if(p==='is_playing')this.snapshot.playing=Boolean(Number(a[0]));
      if(p==='record_mode')this.snapshot.recording=Boolean(Number(a[0]));
      if(p==='tempo')this.snapshot.tempo=Number(a[0]);
      if(p==='current_song_time')this.snapshot.beat=Number(a[0]);return;
    }
    const t=this.track(Number(a[0]));
    if(address.includes('/device/')){
      const d=t.devices.find(d=>d.id===Number(a[1]));if(!d)return;
      const values=a.slice(2);
      for(let i=0;i<Math.min(values.length,64);i++){
        d.parameters[i]??={id:i,name:`Parameter ${i+1}`,value:0,min:0,max:1};
        const param=d.parameters[i]!; if(p==='name')param.name=String(values[i]);else if(p==='value'||p==='min'||p==='max')param[p]=Number(values[i]);
      }return;
    }
    if(address.includes('/clips/name')){t.clips=a.slice(1,9).map((n,scene)=>({scene,name:String(n??''),hasClip:!!n,playing:t.clips[scene]?.playing??false}));return;}
    if(address.includes('/devices/name')){t.devices=a.slice(1,9).map((n,id)=>({id,name:String(n),parameters:t.devices[id]?.parameters??[]}));return;}
    if(p==='name')t.name=String(a[1]);
    if(p==='volume'||p==='panning')t[p]=Number(a[1]);
    if(p==='mute'||p==='solo'||p==='arm')t[p]=Boolean(Number(a[1]));
    if(p==='can_be_armed')t.canArm=Boolean(Number(a[1]));
    if(p==='output_meter_level')t.meter=Number(a[1]);
    if(p==='playing_slot_index')for(const c of t.clips)c.playing=c.scene===Number(a[1]);
  }
  command(c:RemoteCommand) {
    if(!this.snapshot.live)return;
    if(c.kind==='play')this.send('/live/song/start_playing');
    if(c.kind==='stop'){this.send('/live/song/stop_playing');this.panic();}
    if(c.kind==='record')this.send('/live/song/set/record_mode',[this.snapshot.recording?0:1]);
    if(c.kind==='stopClips')this.send('/live/song/stop_all_clips');
    if(c.kind==='tempo')this.send('/live/song/set/tempo',[c.value]);
    if(c.kind==='track')this.send(`/live/track/set/${c.field}`,[c.track,c.value]);
    if(c.kind==='clip')this.send('/live/clip_slot/fire',[c.track,c.scene]);
    if(c.kind==='parameter')this.send('/live/device/set/parameter/value',[c.track,c.device,c.parameter,c.value]);
    if(c.kind==='note'&&this.midi){
      this.midi.sendMessage([c.on?0x90:0x80,c.note,c.on?c.velocity:0]);
      if(this.noteTimeouts.has(c.note))clearTimeout(this.noteTimeouts.get(c.note));
      if(c.on){this.notes.add(c.note);this.noteTimeouts.set(c.note,setTimeout(()=>{this.midi?.sendMessage([0x80,c.note,0]);this.notes.delete(c.note);},2000));}
      else this.notes.delete(c.note);
    }
  }
  panic(){if(this.midi)for(const n of this.notes)this.midi.sendMessage([0x80,n,0]);this.notes.clear();for(const timeout of this.noteTimeouts.values())clearTimeout(timeout);this.noteTimeouts.clear();}
  close(){this.panic();this.port.close();try{this.midi?.closePort();}catch{/* already closed */}}
}
