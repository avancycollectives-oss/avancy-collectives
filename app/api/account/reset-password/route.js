import {NextResponse} from 'next/server';
import {passwordResetFromToken,completePasswordReset} from '../../../../lib/customerAuth';

export async function POST(req){
  try{
    const body=await req.json();

    const token=String(body.token||'').trim();
    const password=String(body.password||'');

    if(!token){
      return NextResponse.json(
        {error:'Invalid or missing reset link.'},
        {status:400}
      );
    }

    if(password.length<6){
      return NextResponse.json(
        {error:'Password must be at least 6 characters.'},
        {status:400}
      );
    }

    const reset=await passwordResetFromToken(token);

    if(!reset){
      return NextResponse.json(
        {error:'This reset link is invalid or has expired.'},
        {status:400}
      );
    }

    await completePasswordReset(
      reset.id,
      reset.customer_id,
      password
    );

    return NextResponse.json({
      ok:true,
      message:'Your password has been updated.'
    });

  }catch(error){
    console.error('Reset password error:',error);

    return NextResponse.json(
      {error:'Unable to reset your password right now.'},
      {status:500}
    );
  }
}
