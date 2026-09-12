import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteSession } from '../../../lib/auth';
export async function POST(){const c=await cookies();const token=c.get('avancy_admin')?.value;if(token)await deleteSession(token);const r=NextResponse.redirect(new URL('/admin/login',process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000'));r.cookies.set('avancy_admin','',{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:0});return r}
