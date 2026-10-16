import { createContext, useContext, useState } from 'react';
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import Constants from 'expo-constants';
import type { AppRouterClient } from '@template/web';
import type { RemoteCommand } from '../../web/src/api/lib/remote-types';
import { useQuery } from '@tanstack/react-query';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';

export const remoteClient:AppRouterClient=createORPCClient(new RPCLink({url:`${(Constants.expoConfig?.extra?.apiUrl??'').replace(/\/$/,'')}/api/rpc`}));
const orpc=createTanstackQueryUtils(remoteClient);
const RemoteContext=createContext({token:'',setToken:(_token:string)=>{}});
export function RemoteProvider({children}:{children:React.ReactNode}){const [token,setToken]=useState('');return <RemoteContext.Provider value={{token,setToken}}>{children}</RemoteContext.Provider>;}
export function useRemote(){
 const {token,setToken}=useContext(RemoteContext);
 const [error,setError]=useState('');
 const query=useQuery(orpc.remote.status.queryOptions({input:{token},enabled:!!token,refetchInterval:500,retry:false}));
 const ready=Boolean(query.data?.connected&&query.data.snapshot?.live&&!query.isError);
 async function command(command:RemoteCommand){setError('');try{await remoteClient.remote.command({token,command});}catch(e){setError(e instanceof Error?e.message:'Command failed');}}
 return {token,setToken,query,ready,snapshot:query.data?.snapshot,error,command};
}
