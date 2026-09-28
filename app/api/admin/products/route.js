import {NextResponse} from 'next/server';import {cookies} from 'next/headers';import {validSession} from '../../../../lib/auth';import {getProducts,createProduct} from '../../../../lib/db';import {deleteImage} from '../../../../lib/cloudinary';
async function auth(){const c=await cookies();return validSession(c.get('avancy_admin')?.value)}
function normalize(p){
  const sizes=Array.isArray(p.sizes)?p.sizes.map(String).map(x=>x.trim()).filter(Boolean):[];
  const stock=Object.fromEntries(sizes.map(s=>[s,Math.max(0,Number(p.stock?.[s])||0)]));
  const sizeMeasurements=p.sizeMeasurements&&typeof p.sizeMeasurements==='object'&&!Array.isArray(p.sizeMeasurements)?p.sizeMeasurements:{};
  const gstRate=Number(p.gstRate);
  const productWeight=Number(p.productWeight);
  const images=Array.isArray(p.images)
    ? p.images.slice(0,5).map(item=>({
        url:String(item?.url||item?.image||'').trim(),
        publicId:String(item?.publicId||item?.imagePublicId||'').trim()
      })).filter(item=>item.url)
    : [];

  return {
    id:String(p.id||'').trim(),
    name:String(p.name||'').trim(),
    price:Math.max(0,Math.round(Number(p.price)||0)),
    category:String(p.category||'SIGNATURE').trim(),
    color:String(p.color||'Black').trim(),
    sizes,
    stock,
    sizeMeasurements,
    gstRate:Number.isFinite(gstRate)?Math.max(0,gstRate):0,
    hsnCode:String(p.hsnCode||'').trim(),
    priceIncludesGst:p.priceIncludesGst===true,
    productWeight:Number.isFinite(productWeight)?Math.max(0,productWeight):0,
    gsm:String(p.gsm||'').trim(),
    fabric:String(p.fabric||'').trim(),
    fit:String(p.fit||'').trim(),
    description:String(p.description||'').trim(),
    art:String(p.art||'AVNC').trim(),
    active:p.active!==false,
    image:String(p.image||'').trim(),
    imagePublicId:String(p.imagePublicId||'').trim(),
    images,
    shippingWeight:Math.max(0,Number(p.shippingWeight)||0),
    shippingLength:Math.max(0,Number(p.shippingLength)||0),
    shippingBreadth:Math.max(0,Number(p.shippingBreadth)||0),
    shippingHeight:Math.max(0,Number(p.shippingHeight)||0)
  };
}
export async function GET(){if(!(await auth()))return NextResponse.json({error:'Unauthorized'},{status:401});return NextResponse.json({products:await getProducts()},{headers:{'Cache-Control':'no-store'}})}
export async function POST(req){if(!(await auth()))return NextResponse.json({error:'Unauthorized'},{status:401});let p;try{p=normalize(await req.json());if(!/^[a-z0-9][a-z0-9-_]{1,79}$/.test(p.id))return NextResponse.json({error:'Product ID must use lowercase letters, numbers, hyphens or underscores (2–80 chars).'}, {status:400});
if(!p.name)return NextResponse.json({error:'Product name is required.'},{status:400});
if(!Number.isFinite(Number(p.price))||Number(p.price)<0)return NextResponse.json({error:'Valid product price is required.'},{status:400});
if(!p.category)return NextResponse.json({error:'Category is required.'},{status:400});
if(!p.color)return NextResponse.json({error:'Colour is required.'},{status:400});
if(!p.sizes.length)return NextResponse.json({error:'Add at least one size.'},{status:400});
if(!p.fabric)return NextResponse.json({error:'Fabric is required.'},{status:400});
if(!p.fit)return NextResponse.json({error:'Fit is required.'},{status:400});
if(!Number.isFinite(Number(p.gstRate))||Number(p.gstRate)<0||Number(p.gstRate)>100)return NextResponse.json({error:'GST rate must be between 0 and 100.'},{status:400});
if(p.productWeight<0)return NextResponse.json({error:'Product weight cannot be negative.'},{status:400});
const product=await createProduct(p);return NextResponse.json({product},{status:201})}catch(e){if(e?.code==='23505')return NextResponse.json({error:'Product ID already exists.'},{status:409});if(p?.imagePublicId){try{await deleteImage(p.imagePublicId)}catch{}}console.error(e);return NextResponse.json({error:'Could not create product.'},{status:500})}}
