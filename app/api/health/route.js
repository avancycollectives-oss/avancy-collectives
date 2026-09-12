import {NextResponse} from "next/server"; import {ensureSchema} from "../../../lib/db";
export async function GET(){try{await ensureSchema();return NextResponse.json({ok:true,database:"connected"})}catch(e){console.error(e);return NextResponse.json({ok:false,error:e.message},{status:500})}}
