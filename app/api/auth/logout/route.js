import {NextResponse} from "next/server";import {cookies} from "next/headers";import {deleteSession} from "../../../../lib/auth";
export async function POST(){const c=await cookies();const token=c.get("avancy_admin")?.value;if(token)await deleteSession(token);const res=NextResponse.json({ok:true});res.cookies.set("avancy_admin","",{httpOnly:true,path:"/",maxAge:0});return res}
