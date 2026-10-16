import {createHash} from 'node:crypto';
import {consumeRequestLimit} from '@/lib/request-limits';
import {sameOrigin} from '@/lib/origin';
import {supabaseConfig} from '@/lib/supabase-config';
import {staffSchema} from '@/lib/admin-auth';
import {NextResponse} from 'next/server';import {createClient} from '@supabase/supabase-js';import {db} from '@/lib/server';
export async function POST(req:Request){if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});
 const form=await req.formData();const email=String(form.get('email')||'').trim(),password=String(form.get('password')||'');
 const {url,publicKey:key}=supabaseConfig();
 const browserOrigin=req.headers.get('origin')!;
 const fail=()=>NextResponse.redirect(new URL('/admin/login?error=1',browserOrigin),303);
 if(!url||!key||!db()||!email||!password)return fail();
 if(!consumeRequestLimit('login:'+createHash('sha256').update(email.toLowerCase()).digest('hex'),10))return fail();
 const client=createClient(url,key,{auth:{persistSession:false}});
 const {data,error}=await client.auth.signInWithPassword({email,password});if(error||!data.user||!data.session)return fail();
 const {data:profile}=await db()!.from('staff_profiles').select('id,full_name,role').eq('id',data.user.id).maybeSingle();if(!staffSchema.safeParse(profile).success)return fail();
 const res=NextResponse.redirect(new URL('/admin',browserOrigin),303);
 res.cookies.set('sp_admin_token',data.session.access_token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:Math.min(data.session.expires_in||3600,3600)});
 return res;
}
export async function DELETE(req:Request){if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});const res=NextResponse.redirect(new URL('/admin/login',req.headers.get('origin')!),303);res.cookies.set('sp_admin_token','',{httpOnly:true,path:'/',maxAge:0});return res;}
