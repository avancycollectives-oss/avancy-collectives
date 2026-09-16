import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {validSession} from "../../../../../lib/auth";
import {getProduct,updateProduct,deleteProduct} from "../../../../../lib/db";
import {deleteImage} from "../../../../../lib/cloudinary";

async function auth(){const c=await cookies();return validSession(c.get("avancy_admin")?.value)}
function normalize(p){const sizes=Array.isArray(p.sizes)?p.sizes.map(String).map(x=>x.trim()).filter(Boolean):[];const stock=Object.fromEntries(sizes.map(s=>[s,Math.max(0,Number(p.stock?.[s])||0)]));return {name:String(p.name||"").trim(),price:Math.max(0,Math.round(Number(p.price)||0)),category:String(p.category||"SIGNATURE").trim(),color:String(p.color||"Black").trim(),sizes,stock,gsm:String(p.gsm||"").trim(),fabric:String(p.fabric||"").trim(),fit:String(p.fit||"").trim(),description:String(p.description||"").trim(),art:String(p.art||"AVNC").trim(),active:p.active!==false,image:String(p.image||"").trim(),imagePublicId:String(p.imagePublicId||"").trim(),shippingWeight:Math.max(0,Number(p.shippingWeight)||0),shippingLength:Math.max(0,Number(p.shippingLength)||0),shippingBreadth:Math.max(0,Number(p.shippingBreadth)||0),shippingHeight:Math.max(0,Number(p.shippingHeight)||0)}}
export async function GET(req,{params}){if(!(await auth()))return NextResponse.json({error:"Unauthorized"},{status:401});const {id}=await params;const product=await getProduct(id);return product?NextResponse.json({product},{headers:{"Cache-Control":"no-store"}}):NextResponse.json({error:"Product not found."},{status:404})}
export async function PUT(req,{params}){if(!(await auth()))return NextResponse.json({error:"Unauthorized"},{status:401});try{const {id}=await params;const existing=await getProduct(id);if(!existing)return NextResponse.json({error:"Product not found."},{status:404});const p=normalize(await req.json());if(!p.name)return NextResponse.json({error:"Product name is required."},{status:400});if(!p.sizes.length)return NextResponse.json({error:"Add at least one size."},{status:400});const product=await updateProduct(id,p);
    if (existing.imagePublicId && existing.imagePublicId !== p.imagePublicId) {
      try { await deleteImage(existing.imagePublicId); } catch (imageError) { console.error("Old Cloudinary image cleanup failed:", imageError); }
    }
    return NextResponse.json({product})}catch(e){console.error(e);return NextResponse.json({error:"Could not update product."},{status:500})}}
export async function DELETE(req,{params}){if(!(await auth()))return NextResponse.json({error:"Unauthorized"},{status:401});const {id}=await params;
  const existing=await getProduct(id);
  if(!existing)return NextResponse.json({error:"Product not found."},{status:404});
  const deleted=await deleteProduct(id);
  if(deleted && existing.imagePublicId){try{await deleteImage(existing.imagePublicId);}catch(imageError){console.error("Cloudinary delete failed:",imageError);}}
  return deleted?NextResponse.json({ok:true}):NextResponse.json({error:"Product not found."},{status:404})}
