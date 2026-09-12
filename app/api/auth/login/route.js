import {NextResponse} from "next/server";
import {adminCredentials,createSession} from "../../../../lib/auth";

export async function POST(req){
  try{
    const {email,password}=await req.json(); const a=adminCredentials();
    if(!a.password)return NextResponse.json({error:"Admin password is not configured. Add ADMIN_PASSWORD to .env.local."},{status:500});
    if(email!==a.email||password!==a.password)return NextResponse.json({error:"Invalid admin credentials."},{status:401});
    const token=await createSession(); const res=NextResponse.json({ok:true});
    res.cookies.set("avancy_admin",token,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:60*60*8}); return res;
  }catch(e){console.error(e);return NextResponse.json({error:"Login failed."},{status:500})}
}
