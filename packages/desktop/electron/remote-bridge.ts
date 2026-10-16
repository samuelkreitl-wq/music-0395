import { ipcMain } from 'electron';
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { AppRouterClient } from '../../web/src/api';
import { AbletonAdapter } from './ableton';

let adapter: AbletonAdapter | null=null;
let timer: ReturnType<typeof setTimeout> | null=null;
let generation=0;
let state={running:false,live:false,midi:false,paired:false,error:null as string|null,version:''};
export function stopRemoteBridge(){generation++;if(timer)clearTimeout(timer);timer=null;adapter?.close();adapter=null;state={...state,running:false,live:false,paired:false};}
export function registerRemoteBridge(){
  ipcMain.handle('remote:status',()=>state);
  ipcMain.handle('remote:stop',()=>{stopRemoteBridge();return state;});
  ipcMain.handle('remote:start',async(_e,input:{token:string;url:string})=>{
    stopRemoteBridge();
    const u=new URL(input.url); if(u.protocol!=='https:' && !(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname)))throw new Error('Use an HTTPS server URL.');
    const client:AppRouterClient=createORPCClient(new RPCLink({url:`${input.url.replace(/\/$/,'')}/api/rpc`}));
    adapter=new AbletonAdapter();state={running:true,live:false,midi:adapter.snapshot.midi,paired:false,error:null,version:''};
    const g=generation;
    async function exchange(){
      if(g!==generation||!adapter)return;
      adapter.poll();
      try{
        const result=await client.remote.exchange({token:input.token,snapshot:adapter.snapshot});
        if(g!==generation||!adapter)return;
        for(const c of result.commands)adapter.command(c.command);
        state={running:true,live:adapter.snapshot.live,midi:adapter.snapshot.midi,paired:result.paired,error:adapter.snapshot.error,version:adapter.snapshot.version};
      }catch(e){state.error=e instanceof Error?e.message:'Relay unavailable';adapter?.panic();}
      if(g===generation)timer=setTimeout(exchange,160);
    }
    void exchange();return state;
  });
}
