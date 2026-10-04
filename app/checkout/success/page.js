"use client";

import Link from 'next/link';
import {useEffect,useState} from 'react';

export default function PaymentSuccess({searchParams}){
 const [ready,setReady]=useState(false),[order,setOrder]=useState(null);

 useEffect(()=>{
   let cancelled=false;

   const params=new URLSearchParams(window.location.search);
   const id=params.get('order')||'';
   const email=params.get('email')||'';

   if(id&&email){
     fetch(
       `/api/track-order?order=${encodeURIComponent(id)}&email=${encodeURIComponent(email)}`,
       {cache:'no-store'}
     )
       .then(r=>r.ok?r.json():null)
       .then(d=>{
         if(!cancelled)setOrder(d?.order||null);
       })
       .catch(()=>{});
   }

   const t=setTimeout(()=>{
     if(!cancelled)setReady(true);
   },5000);

   return()=>{
     cancelled=true;
     clearTimeout(t);
   };
 },[]);

 const paymentStatus=String(order?.paymentStatus||"").toUpperCase();
 const isPaid=paymentStatus==="PAID";

 if(!ready){
   return (
     <main className="payment-wait">
       <div className="payment-wait-inner">
         <span>AVANCY COLLECTIVES / ORDER CONFIRMATION</span>

         <div className="pulse-mark">✓</div>

         <h1>
           ORDER<br/>
           <em>CONFIRMED.</em>
         </h1>

         <p>
           {isPaid
             ? "Your payment was received successfully. Preparing your order confirmation…"
             : "Your order has been confirmed. Preparing your order confirmation…"}
         </p>

         <div className="wait-line">
           <i/>
         </div>
       </div>
     </main>
   );
 }

 const items=order?.items||[];

 return (
   <main className="ac-success">
     <div className="success-inner">

       <span>AVANCY COLLECTIVES / THANK YOU</span>

       <div className="success-check">✓</div>

       <h1>
         THANK<br/>
         <em>YOU.</em>
       </h1>

       <p>
         Your order <b>{order?.id||''}</b> is confirmed.{" "}
         {isPaid
           ? "We’ve received your payment successfully, and your order is now in our fulfilment flow."
           : "Your order has been confirmed. Payment can be made upon delivery."
         }
       </p>

       {items.length>0&&(
         <div className="success-products">
           {items.map((x,i)=>(
             <div key={i}>
               <div className="success-thumb">
                 {x.image
                   ? <img src={x.image} alt=""/>
                   : <b>{x.art||'AVNC'}</b>
                 }
               </div>

               <span>
                 {x.name}
                 <small>
                   {x.custom
                     ? 'CUSTOM PRINT'
                     : `SIZE ${x.size||'—'} · QTY ${x.qty||1}`
                   }
                 </small>
               </span>

               <strong>
                 ₹{(
                   Number(x.price||0) *
                   Number(x.qty||1)
                 ).toLocaleString('en-IN')}
               </strong>
             </div>
           ))}
         </div>
       )}

       <div className="success-actions">
         <Link
           href={`/track-order?order=${encodeURIComponent(order?.id||'')}&email=${encodeURIComponent(order?.customer?.email||'')}`}
           className="ac-yellow-btn"
         >
           TRACK ORDER →
         </Link>

         <Link
           href="/shop"
           className="success-link"
         >
           CONTINUE SHOPPING
         </Link>
       </div>

     </div>
   </main>
 );
}
