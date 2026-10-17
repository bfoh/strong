import 'server-only';
import {readLeadContext} from './lead-context';
export async function mapLimited<T,R>(rows:T[],work:(row:T)=>Promise<R>,limit=8):Promise<R[]> {
 const result=new Array<R>(rows.length);let next=0;
 await Promise.all(Array.from({length:Math.min(limit,rows.length)},async()=>{for(;;){const i=next++;if(i>=rows.length)return;result[i]=await work(rows[i]);}}));
 return result;
}
export async function attachLeadContext<T extends {id:string}>(kind:'enquiries'|'appointments',rows:T[]) {
 return mapLimited(rows,async row=>({...row,buyerContext:await readLeadContext(kind,row.id)}));
}
