import {NextResponse} from 'next/server';
import crypto from 'crypto';

export async function GET(req){
  const clientId=process.env.GOOGLE_CLIENT_ID;
  const siteUrl=process.env.APP_URL||new URL(req.url).origin;
  const redirectUri=process.env.GOOGLE_REDIRECT_URI||`${siteUrl}/api/account/google/callback`;

  if(!clientId){
    return NextResponse.json(
      {error:'Google authentication is not configured.'},
      {status:503}
    );
  }

  const state=crypto.randomBytes(32).toString('hex');

  const params=new URLSearchParams({
    client_id:clientId,
    redirect_uri:redirectUri,
    response_type:'code',
    scope:'openid email profile',
    access_type:'offline',
    prompt:'select_account',
    state
  });

  const response=NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );

  response.cookies.set('avancy_google_state',state,{
    httpOnly:true,
    sameSite:'lax',
    secure:process.env.NODE_ENV==='production',
    path:'/',
    maxAge:600
  });

  return response;
}
