import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {
  validSession
} from '../../../../../lib/auth.js';
import {
  savePushSubscription,
  deletePushSubscription
} from '../../../../../lib/db.js';

export const runtime='nodejs';

async function requireAdmin(){
  const c=await cookies();
  const token=c.get('avancy_admin')?.value||'';
  return validSession(token);
}

export async function POST(req){
  try{
    if(!(await requireAdmin())){
      return NextResponse.json(
        {error:'Unauthorized.'},
        {status:401}
      );
    }

    const body=await req.json();
    const subscription=body?.subscription;

    if(
      !subscription ||
      typeof subscription.endpoint!=='string' ||
      typeof subscription.keys?.p256dh!=='string' ||
      typeof subscription.keys?.auth!=='string'
    ){
      return NextResponse.json(
        {error:'Invalid push subscription.'},
        {status:400}
      );
    }

    await savePushSubscription(
      subscription,
      req.headers.get('user-agent')||''
    );

    return NextResponse.json({
      ok:true
    });
  }catch(e){
    console.error('Push subscription save error:',e);

    return NextResponse.json(
      {error:'Could not save push subscription.'},
      {status:500}
    );
  }
}

export async function DELETE(req){
  try{
    if(!(await requireAdmin())){
      return NextResponse.json(
        {error:'Unauthorized.'},
        {status:401}
      );
    }

    const body=await req.json();
    const endpoint=body?.endpoint;

    if(typeof endpoint!=='string'||!endpoint.trim()){
      return NextResponse.json(
        {error:'Invalid push endpoint.'},
        {status:400}
      );
    }

    await deletePushSubscription(endpoint);

    return NextResponse.json({
      ok:true
    });
  }catch(e){
    console.error('Push subscription delete error:',e);

    return NextResponse.json(
      {error:'Could not remove push subscription.'},
      {status:500}
    );
  }
}
