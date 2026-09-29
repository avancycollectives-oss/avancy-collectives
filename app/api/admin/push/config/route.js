import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {validSession} from '../../../../../lib/auth.js';

export const runtime='nodejs';

async function requireAdmin(){
  const c=await cookies();
  const token=c.get('avancy_admin')?.value||'';
  return validSession(token);
}

export async function GET(){
  try{
    if(!(await requireAdmin())){
      return NextResponse.json(
        {error:'Unauthorized.'},
        {status:401}
      );
    }

    const publicKey=process.env.WEB_PUSH_VAPID_PUBLIC_KEY||'';

    if(!publicKey){
      return NextResponse.json(
        {error:'Push notifications are not configured.'},
        {status:503}
      );
    }

    return NextResponse.json({
      publicKey
    });
  }catch(e){
    console.error('Push config error:',e);

    return NextResponse.json(
      {error:'Could not load push notification configuration.'},
      {status:500}
    );
  }
}
