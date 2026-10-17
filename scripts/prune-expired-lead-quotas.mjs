// Dry run by default. Never touches enquiries, attribution, settings or media.
// Run with the existing server environment; add --apply only after reviewing the count.
import {createClient} from '@supabase/supabase-js';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw Error('Server Supabase configuration required.');
const storage=createClient(url,key,{auth:{persistSession:false}}).storage;
const bucket=await storage.getBucket('strong-homepage-private');if(bucket.error||bucket.data?.public!==false)throw Error('Verified private bucket required.');
const files=storage.from('strong-homepage-private'),expired=[],now=Date.now();
for(let offset=0;;offset+=1000){const listed=await files.list('quotas',{limit:1000,offset,sortBy:{column:'name',order:'asc'}});if(listed.error)throw Error('Quota listing unavailable.');for(const f of listed.data||[]){if(!/^(?:leads-)?[a-f0-9]{64}-\d+-\d+\.json$/.test(f.name))continue;const object=await files.download('quotas/'+f.name);if(object.error||!object.data)throw Error('Quota read unavailable.');const value=JSON.parse(await object.data.text());if(Number.isSafeInteger(value.expires)&&value.expires>0&&value.expires<now)expired.push('quotas/'+f.name);}if((listed.data||[]).length<1000)break;}
console.log(JSON.stringify({expiredQuotaObjects:expired.length,apply:process.argv.includes('--apply'),leadRecordsTouched:false}));
if(process.argv.includes('--apply'))for(let i=0;i<expired.length;i+=100){const removed=await files.remove(expired.slice(i,i+100));if(removed.error)throw Error('Quota removal failed.');}
