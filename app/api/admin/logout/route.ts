import {sameOrigin} from '@/lib/origin';
import {NextResponse} from 'next/server';
export async function POST(req:Request){if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});const res=NextResponse.redirect(new URL('/admin/login',req.headers.get('origin')!),303);res.cookies.set('sp_admin_token','',{httpOnly:true,path:'/',maxAge:0});return res;}
