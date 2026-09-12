import {NextResponse} from 'next/server';import {cookies} from 'next/headers';import {customerFromToken} from '../../../../lib/customerAuth';import {updateCustomer} from '../../../../lib/db';
async function current(){const c=await cookies();return customerFromToken(c.get('avancy_customer')?.value)}
export async function GET(){const c=await current();return c?NextResponse.json({customer:c}):NextResponse.json({error:'Not signed in.'},{status:401})}
export async function PUT(req){const c=await current();if(!c)return NextResponse.json({error:'Not signed in.'},{status:401});const b=await req.json();const u=await updateCustomer(c.id,{name:String(b.name||'').trim(),phone:String(b.phone||'').trim()});return NextResponse.json({customer:u})}
