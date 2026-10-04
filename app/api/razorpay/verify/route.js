import crypto from 'crypto';
import {NextResponse} from 'next/server';
import {getOrder,markPayment,decrementStock} from '../../../../lib/db';
import {notifyNewOrder} from '../../../../lib/push.js';
import {sendOrderConfirmationEmail} from '../../../../lib/email.js';

export const runtime='nodejs';

export async function POST(req){
  try{
    const secret=process.env.RAZORPAY_KEY_SECRET;
    const keyId=process.env.RAZORPAY_KEY_ID;

    if(!secret||!keyId){
      return NextResponse.json(
        {error:'Payment verification is not configured.'},
        {status:503}
      );
    }

    const b=await req.json();

    const razorpayOrderId=b.razorpayOrderId||b.razorpay_order_id;
    const razorpayPaymentId=b.razorpayPaymentId||b.razorpay_payment_id;
    const razorpaySignature=b.razorpaySignature||b.razorpay_signature;

    if(
      !razorpayOrderId||
      !razorpayPaymentId||
      !razorpaySignature||
      !b.orderId
    ){
      return NextResponse.json(
        {error:'Incomplete payment verification.'},
        {status:400}
      );
    }

    const order=await getOrder(b.orderId);

    if(!order||order.paymentOrderId!==razorpayOrderId){
      return NextResponse.json(
        {error:'Payment order mismatch.'},
        {status:400}
      );
    }

    /*
     * Verify the Razorpay signature first.
     */
    const expected=crypto
      .createHmac('sha256',secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const a=Buffer.from(expected,'utf8');
    const c=Buffer.from(String(razorpaySignature),'utf8');

    if(
      a.length!==c.length||
      !crypto.timingSafeEqual(a,c)
    ){
      return NextResponse.json(
        {error:'Payment signature could not be verified.'},
        {status:400}
      );
    }

    /*
     * Server-side amount verification.
     * Razorpay amounts are represented in the smallest currency unit.
     */
    const auth=Buffer
      .from(`${keyId}:${secret}`)
      .toString('base64');

    const rr=await fetch(
      `https://api.razorpay.com/v1/orders/${encodeURIComponent(razorpayOrderId)}`,
      {
        method:'GET',
        headers:{
          Authorization:`Basic ${auth}`
        },
        cache:'no-store'
      }
    );

    const ro=await rr.json();

    if(!rr.ok){
      console.error('Razorpay order lookup failed:',ro);
      return NextResponse.json(
        {error:'Unable to verify the Razorpay order amount.'},
        {status:502}
      );
    }

    const expectedAmount=Number(order.total||0)*100;
    const razorpayAmount=Number(ro?.amount||0);
    const razorpayCurrency=String(ro?.currency||'');

    if(
      razorpayAmount!==expectedAmount||
      razorpayCurrency!=='INR'
    ){
      console.error(
        'Razorpay amount mismatch:',
        {
          orderId:order.id,
          expectedAmount,
          razorpayAmount,
          razorpayCurrency
        }
      );

      return NextResponse.json(
        {error:'Payment amount could not be verified.'},
        {status:400}
      );
    }

    if(order.paymentStatus!=='PAID'){
      await markPayment(
        order.id,
        'PAID',
        razorpayPaymentId
      );

      await decrementStock(order.items);

      const paidOrder=await getOrder(order.id);

      if(paidOrder){
        await notifyNewOrder(
          paidOrder,
          'RAZORPAY'
        );

        /*
         * Payment is already verified and marked PAID.
         * Email failure must never turn a successful payment
         * into a failed verification response.
         */
        try{
          await sendOrderConfirmationEmail(
            paidOrder,
            'RAZORPAY'
          );
        }catch(emailError){
          console.error(
            'Razorpay order confirmation email error:',
            emailError
          );
        }
      }
    }

    return NextResponse.json({
      ok:true,
      orderId:order.id
    });

  }catch(e){
    console.error(
      'Razorpay verification error:',
      e
    );

    return NextResponse.json(
      {error:'Payment verification failed.'},
      {status:500}
    );
  }
}
