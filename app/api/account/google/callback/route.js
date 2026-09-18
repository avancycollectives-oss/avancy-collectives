import {NextResponse} from 'next/server';
import {OAuth2Client} from 'google-auth-library';
import {
  findOrCreateGoogleCustomer,
  createCustomerLogin
} from '../../../../../lib/customerAuth';

export async function GET(req){
  try{
    const url=new URL(req.url);
    const code=url.searchParams.get('code');
    const state=url.searchParams.get('state');
    const error=url.searchParams.get('error');

    const cookieState=req.cookies.get('avancy_google_state')?.value||'';

    if(error){
      return NextResponse.redirect(new URL('/account/login?error=google_cancelled',url));
    }

    if(!code||!state||!cookieState||state!==cookieState){
      return NextResponse.redirect(new URL('/account/login?error=google_state',url));
    }

    const clientId=process.env.GOOGLE_CLIENT_ID;
    const clientSecret=process.env.GOOGLE_CLIENT_SECRET;
    const siteUrl=process.env.APP_URL||url.origin;
    const redirectUri=process.env.GOOGLE_REDIRECT_URI||`${siteUrl}/api/account/google/callback`;

    if(!clientId||!clientSecret){
      return NextResponse.redirect(new URL('/account/login?error=google_config',url));
    }

    const client=new OAuth2Client(
      clientId,
      clientSecret,
      redirectUri
    );

    const {tokens}=await client.getToken(code);

    if(!tokens.id_token){
      throw new Error('Google did not return an ID token.');
    }

    const ticket=await client.verifyIdToken({
      idToken:tokens.id_token,
      audience:clientId
    });

    const payload=ticket.getPayload();

    if(!payload?.email||payload.email_verified!==true){
      throw new Error('Google email is not verified.');
    }

    const customer=await findOrCreateGoogleCustomer(payload);
    const sessionToken=await createCustomerLogin(customer.id);

    const response=NextResponse.redirect(new URL('/shop',url));

    response.cookies.set('avancy_customer',sessionToken,{
      httpOnly:true,
      sameSite:'lax',
      secure:process.env.NODE_ENV==='production',
      path:'/',
      maxAge:60*60*24*30
    });

    response.cookies.set('avancy_google_state','',{
      httpOnly:true,
      sameSite:'lax',
      secure:process.env.NODE_ENV==='production',
      path:'/',
      maxAge:0
    });

    return response;

  }catch(error){
    console.error('Google authentication error:',error);

    const url=new URL(req.url);

    return NextResponse.redirect(
      new URL('/account/login?error=google_failed',url)
    );
  }
}
