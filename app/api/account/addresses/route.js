import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { customerFromToken } from '../../../../lib/customerAuth';
import { createCustomerAddress, updateCustomerAddress, deleteCustomerAddress, getCustomerAddresses } from '../../../../lib/db';

async function current() {
  const c = await cookies();
  return customerFromToken(c.get('avancy_customer')?.value);
}

export async function GET() {
  const user = await current();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  return NextResponse.json({ addresses: await getCustomerAddresses(user.id) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req) {
  const user = await current();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  try {
    const b = await req.json();
    if (!b.name?.trim() || !b.address?.trim() || !b.city?.trim() || !/^[0-9]{6}$/.test(String(b.pincode))) {
      return NextResponse.json({ error: 'Full name, address, city and a valid 6-digit pincode are required.' }, { status: 400 });
    }
    const address = await createCustomerAddress(user.id, {
      label: String(b.label || 'HOME').trim().slice(0,30), name: String(b.name).trim(), phone: String(b.phone || '').trim(),
      address: String(b.address).trim(), city: String(b.city).trim(), state: String(b.state || '').trim(),
      pincode: String(b.pincode).trim(), country: String(b.country || 'India').trim()
    });
    return NextResponse.json({ address }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Could not save address.' }, { status: 500 });
  }
}

export async function PUT(req) {
  const user = await current();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  try {
    const b = await req.json(); const id = String(b.id || '');
    if (!id || !b.name?.trim() || !b.address?.trim() || !b.city?.trim() || !/^[0-9]{6}$/.test(String(b.pincode))) return NextResponse.json({error:'Full name, address, city and a valid 6-digit pincode are required.'},{status:400});
    const address=await updateCustomerAddress(user.id,id,{label:String(b.label||'HOME').trim().slice(0,30),name:String(b.name).trim(),phone:String(b.phone||'').trim(),address:String(b.address).trim(),city:String(b.city).trim(),state:String(b.state||'').trim(),pincode:String(b.pincode).trim(),country:String(b.country||'India').trim()});
    return address?NextResponse.json({address}):NextResponse.json({error:'Address not found.'},{status:404});
  } catch(e){console.error(e);return NextResponse.json({error:'Could not update address.'},{status:500})}
}

export async function DELETE(req) {
  const user = await current();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Address ID is required.' }, { status: 400 });
  return (await deleteCustomerAddress(user.id, id)) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Address not found.' }, { status: 404 });
}
