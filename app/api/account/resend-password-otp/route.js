import {NextResponse} from 'next/server';
import {Resend} from 'resend';
import {
  findCustomerByEmail,
  getLatestPasswordReset
} from '../../../../lib/db';
import {createPasswordResetToken} from '../../../../lib/customerAuth';

export const runtime='nodejs';

const RESEND_COOLDOWN_MS=60*1000;

function escapeHtml(value){
  return String(value??'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

export async function POST(req){
  try{
    const body=await req.json();
    const email=String(body.email||'').trim().toLowerCase();

    if(!email){
      return NextResponse.json(
        {error:'Please enter your email address.'},
        {status:400}
      );
    }

    /*
     * Keep account enumeration protection.
     * The public response is intentionally identical whether the
     * customer exists or not.
     */
    const customer=await findCustomerByEmail(email);

    if(!customer){
      return NextResponse.json({
        ok:true,
        message:'If an account exists for that email, a new verification code has been sent.'
      });
    }

    const apiKey=process.env.RESEND_API_KEY;

    if(!apiKey){
      console.error('Password reset email is not configured.');

      return NextResponse.json(
        {error:'Password reset email is not configured yet.'},
        {status:503}
      );
    }

    /*
     * Prevent repeated resend requests.
     * The existing reset record remains valid during the cooldown.
     */
    const latest=await getLatestPasswordReset(customer.id);

    if(latest?.created_at){
      const createdAt=new Date(latest.created_at).getTime();
      const elapsed=Date.now()-createdAt;

      if(elapsed<RESEND_COOLDOWN_MS){
        const retryAfter=Math.max(
          1,
          Math.ceil((RESEND_COOLDOWN_MS-elapsed)/1000)
        );

        return NextResponse.json(
          {
            error:`Please wait ${retryAfter} seconds before requesting another code.`,
            retryAfter
          },
          {status:429}
        );
      }
    }

    const otp=await createPasswordResetToken(customer.id);

    const resend=new Resend(apiKey);

    await resend.emails.send({
      from:'account@avancycollectives.in',
      to:[customer.email],
      subject:'Your new Avancy Collectives password reset code',
      html:`
        <div style="background:#090909;color:#f5f5f0;padding:40px 24px;font-family:Arial,sans-serif">
          <div style="max-width:560px;margin:0 auto;border:1px solid #292929;border-radius:18px;padding:32px;background:#111">

            <div style="font-size:28px;font-weight:900;letter-spacing:-.04em">
              AVANCY<span style="color:#e2f952">COLLECTIVES™</span>
            </div>

            <p style="color:#999;letter-spacing:.08em;font-size:11px;font-weight:700;margin-top:28px">
              ACCOUNT / PASSWORD RESET
            </p>

            <h1 style="font-size:38px;line-height:1;margin:12px 0 18px">
              YOUR NEW CODE.
            </h1>

            <p style="color:#c7c7c2;line-height:1.7">
              A new password recovery code was requested for your Avancy Collectives account.
            </p>

            <div style="margin:30px 0;padding:22px;border:1px solid #333;border-radius:14px;text-align:center;background:#0b0b0b">
              <div style="color:#888;font-size:10px;font-weight:900;letter-spacing:.12em;margin-bottom:10px">
                VERIFICATION CODE
              </div>

              <div style="font-size:42px;font-weight:900;letter-spacing:.22em;color:#e2f952">
                ${escapeHtml(otp)}
              </div>
            </div>

            <p style="color:#888;font-size:13px;line-height:1.6">
              This code expires in 5 minutes and can only be used once.
            </p>

            <p style="color:#888;font-size:13px;line-height:1.6">
              You have a maximum of 5 attempts to enter the correct code.
            </p>

            <p style="color:#666;font-size:12px;line-height:1.6">
              If you did not request a password reset, you can safely ignore this email.
            </p>

          </div>
        </div>
      `
    });

    return NextResponse.json({
      ok:true,
      message:'A new verification code has been sent.',
      cooldown:60
    });

  }catch(error){
    console.error('Resend password OTP error:',error);

    return NextResponse.json(
      {error:'Unable to send a new verification code right now.'},
      {status:500}
    );
  }
}
