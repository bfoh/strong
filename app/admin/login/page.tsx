import {staff} from '@/lib/admin-auth';import {redirect} from 'next/navigation';
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){
 if(await staff())redirect('/admin');const {error}=await searchParams;
 return <main id="main-content" className="section admin-login"><span className="eyebrow">STRONG PROPERTIES / STAFF ONLY</span><h1>Welcome back.</h1><p>Sign in to manage properties, enquiries and viewing requests.</p><form action="/api/admin/session" method="post" className="admin-form"><label>Email<input type="email" name="email" autoComplete="username" required/></label><label>Password<input type="password" name="password" autoComplete="current-password" required/></label><button className="gold-btn">Sign in securely</button>{error&&<p role="alert">Sign-in failed. Check your credentials and staff access.</p>}</form></main>
}
