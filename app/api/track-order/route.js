import { NextResponse } from 'next/server';
import { getOrder } from '../../../lib/db';

export async function GET(req) {
  try {
    const u = new URL(req.url);
    const id = String(u.searchParams.get('order') || '').trim();
    const email = String(u.searchParams.get('email') || '').trim().toLowerCase();
    if (!id || !email) return NextResponse.json({ error: 'Order number and checkout email are required.' }, { status: 400 });
    const order = await getOrder(id);
    if (!order || String(order.customer?.email || '').toLowerCase() !== email) return NextResponse.json({ error: 'We could not find an order matching those details.' }, { status: 404 });
    return NextResponse.json({ order }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Unable to look up the order.' }, { status: 500 });
  }
}
