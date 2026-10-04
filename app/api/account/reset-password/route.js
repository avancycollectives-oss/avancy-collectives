import {NextResponse} from 'next/server';
import {
  findCustomerByEmail,
  findPasswordReset,
  incrementPasswordResetAttempts
} from '../../../../lib/db';
import {
  passwordHash,
  completePasswordReset
} from '../../../../lib/customerAuth';

import crypto from 'crypto';

function hash(v){
  return crypto
    .createHash('sha256')
    .update(v)
    .digest('hex');
}

export async function POST(req){
  try{
    const body=await req.json();

    const email=String(body.email||'').trim().toLowerCase();
    const otp=String(body.otp||'').trim();
    const password=String(body.password||'');

    if(!email){
      return NextResponse.json(
        {error:'Please enter your email address.'},
        {status:400}
      );
    }

    if(!/^\d{6}$/.test(otp)){
      return NextResponse.json(
        {error:'Please enter the 6-digit verification code.'},
        {status:400}
      );
    }

    if(password.length<6){
      return NextResponse.json(
        {error:'Password must be at least 6 characters.'},
        {status:400}
      );
    }

    const customer=await findCustomerByEmail(email);

    if(!customer){
      return NextResponse.json(
        {error:'The verification code is invalid or has expired.'},
        {status:400}
      );
    }

    const reset=await findPasswordReset(
      hash(`${otp}:${customer.id}`)
    );

    if(!reset || reset.customer_id!==customer.id){
      if(reset){
        await incrementPasswordResetAttempts(reset.id);
      }

      return NextResponse.json(
        {error:'The verification code is invalid or has expired.'},
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
