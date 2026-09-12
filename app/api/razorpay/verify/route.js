import crypto from 'crypto';
import {NextResponse} from 'next/server';
import {getOrder,markPayment,decrementStock} from '../../../../lib/db';
export const runtime='nodejs';
export async function POST(req){
  try{
    const secret=process.env.RAZORPAY_KEY_SECRET;
    if(!secret)return NextResponse.json({error:'Payment verification is not configured.'},{status:503});
    const b=await req.json();
    const razorpayOrderId=b.razorpayOrderId||b.razorpay_order_id;
    const razorpayPaymentId=b.razorpayPaymentId||b.razorpay_payment_id;
    const razorpaySignature=b.razorpaySignature||b.razorpay_signature;
    if(!razorpayOrderId||!razorpayPaymentId||!razorpaySignature||!b.orderId)return NextResponse.json({error:'Incomplete payment verification.'},{status:400});
    const expected=crypto.createHmac('sha256',secret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex');
    const a=Buffer.from(expected,'utf8'), c=Buffer.from(String(razorpaySignature),'utf8');
    if(a.length!==c.length||!crypto.timingSafeEqual(a,c))return NextResponse.json({error:'Payment signature could not be verified.'},{status:400});
    const order=await getOrder(b.orderId);
    if(!order||order.paymentOrderId!==razorpayOrderId)return NextResponse.json({error:'Payment order mismatch.'},{status:400});
    if(order.paymentStatus!=='PAID'){await markPayment(order.id,'PAID',razorpayPaymentId);await decrementStock(order.items)}
    return NextResponse.json({ok:true,orderId:order.id});
  }catch(e){console.error('Razorpay verification error:',e);return NextResponse.json({error:'Payment verification failed.'},{status:500})}
}
