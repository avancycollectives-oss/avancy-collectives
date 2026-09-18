import {NextResponse} from 'next/server';
import {Resend} from 'resend';
import {findCustomerByEmail} from '../../../../lib/db';
import {createPasswordResetToken} from '../../../../lib/customerAuth';

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

    const customer=await findCustomerByEmail(email);

    /*
      Always return the same public response whether the account exists
      or not. This prevents email-account enumeration.
    */
    if(customer){
      const apiKey=process.env.RESEND_API_KEY;
      const from=process.env.EMAIL_FROM;

      if(!apiKey||!from){
        console.error('Password reset email is not configured.');
        return NextResponse.json(
          {error:'Password reset email is not configured yet.'},
          {status:503}
        );
      }

      const token=await createPasswordResetToken(customer.id);
      const siteUrl=process.env.APP_URL||new URL(req.url).origin;
      const resetUrl=`${siteUrl}/account/reset-password?token=${encodeURIComponent(token)}`;

      const resend=new Resend(apiKey);

      await resend.emails.send({
        from,
        to:[customer.email],
        subject:'Reset your Avancy Collectives password',
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
                RESET YOUR PASSWORD.
              </h1>

              <p style="color:#c7c7c2;line-height:1.7">
                We received a request to reset the password for your Avancy Collectives account.
              </p>

              <p style="margin:28px 0">
                <a href="${resetUrl}" style="display:inline-block;background:#e2f952;color:#090909;text-decoration:none;padding:15px 22px;border-radius:10px;font-weight:900">
                  RESET PASSWORD →
                </a>
              </p>

              <p style="color:#888;font-size:13px;line-height:1.6">
                This reset link expires in 30 minutes and can only be used once.
              </p>

              <p style="color:#666;font-size:12px;line-height:1.6">
                If you did not request this, you can safely ignore this email.
              </p>
            </div>
          </div>
        `
      });
    }

    return NextResponse.json({
      ok:true,
      message:'If an account exists for that email, a password reset link has been sent.'
    });

  }catch(error){
    console.error('Forgot password error:',error);

    return NextResponse.json(
      {error:'Unable to process the password reset request right now.'},
      {status:500}
    );
  }
}
