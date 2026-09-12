import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logoutCustomer } from '../../../../lib/customerAuth';
export async function POST(){const c=await cookies();const token=c.get('avancy_customer')?.value;await logoutCustomer(token);const r=NextResponse.json({ok:true});r.cookies.set('avancy_customer','',{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:0});return r}
