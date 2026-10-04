"use client";
import Link from 'next/link';
import SiteFooter from '../components/SiteFooter';import {useEffect,useRef,useState} from 'react';
const countries=[['IN','🇮🇳','+91'],['US','🇺🇸','+1'],['GB','🇬🇧','+44'],['AE','🇦🇪','+971'],['AU','🇦🇺','+61'],['CA','🇨🇦','+1'],['SG','🇸🇬','+65']];
export default function Checkout(){
 const[cart,setCart]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[country,setCountry]=useState(countries[0]),[addresses,setAddresses]=useState([]),[user,setUser]=useState(null),[selected,setSelected]=useState(''),[pricing,setPricing]=useState(null),[quoteBusy,setQuoteBusy]=useState(false),[f,setF]=useState({name:'',email:'',phone:'',address:'',city:'',state:'',pincode:'',payment:'COD'});
 const quoteAbortRef=useRef(null);
 const quoteTimerRef=useRef(null);
 const quoteRequestRef=useRef(0);
 useEffect(()=>{try{setCart(JSON.parse(localStorage.getItem('avancy-cart')||'[]').filter(x=>x?.id&&x?.size))}catch{setCart([])};Promise.all([fetch('/api/account/profile',{cache:'no-store'}),fetch('/api/account/addresses',{cache:'no-store'})]).then(async([pr,ar])=>{const pd=await pr.json();const ad=await ar.json();if(pr.ok){setUser(pd.customer);setF(x=>({...x,name:pd.customer.name||'',email:pd.customer.email||'',phone:pd.customer.phone||''}))}if(ar.ok){let list=ad.addresses||[];if(!list.length){try{const legacy=JSON.parse(localStorage.getItem('avancy-addresses')||'[]');for(const old of Array.isArray(legacy)?legacy:[]){const x=await fetch('/api/account/addresses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(old)});if(x.ok){const y=await x.json();list.push(y.address)}}if(list.length)localStorage.removeItem('avancy-addresses')}catch{}}setAddresses(list)}}).catch(()=>{})},[]);
 const cartSubtotal=cart.reduce((s,x)=>s+Number(x.price||0)*Number(x.qty||1),0);
 const displayedSubtotal=pricing?.subtotal??cartSubtotal;
 const displayedShipping=pricing?.shippingAmount??0;
 const displayedTotal=pricing?.total??cartSubtotal;
 const shippingLabel = quoteBusy
   ? 'CALCULATING…'
   : !pricing
     ? 'ENTER PINCODE'
     : pricing.shippingAmount===0
       ? 'FREE'
       : `₹${Number(pricing.shippingAmount).toLocaleString('en-IN')}`;
 const ch=(k,v)=>setF(x=>({...x,[k]:v}));
 function applyAddress(a){setSelected(a.id);setF(x=>({...x,name:a.name||x.name,phone:String(a.phone||'').replace(/^\+?91/,'').replace(/\D/g,'').slice(-10),address:a.address||'',city:a.city||'',state:a.state||'',pincode:a.pincode||''}));if(a.country){const found=countries.find(c=>c[0]==='IN'&&String(a.country).toLowerCase()==='india');if(found)setCountry(found)}}
 async function refreshQuote(nextForm=f){
   if(!cart.length||!/^[0-9]{6}$/.test(nextForm.pincode||'')){
     if(quoteAbortRef.current)quoteAbortRef.current.abort();
     setPricing(null);
     setQuoteBusy(false);
     return;
   }

   if(quoteAbortRef.current)quoteAbortRef.current.abort();

   const controller=new AbortController();
   quoteAbortRef.current=controller;

   const requestId=++quoteRequestRef.current;

   setQuoteBusy(true);
   setError('');

   try{
     const r=await fetch('/api/shipping/quote',{
       method:'POST',
       headers:{'Content-Type':'application/json'},
       body:JSON.stringify({
         items:cart,
         customer:nextForm,
         paymentMethod:nextForm.payment
       }),
       signal:controller.signal
     });

     const d=await r.json();

     if(controller.signal.aborted)return;

     if(!r.ok)throw Error(d.error||'Unable to calculate delivery.');

     if(requestId===quoteRequestRef.current)setPricing(d);
   }catch(err){
     if(err?.name==='AbortError')return;

     if(requestId===quoteRequestRef.current){
       setPricing(null);
       setError(err.message||'Unable to calculate delivery.');
     }
   }finally{
     if(requestId===quoteRequestRef.current)setQuoteBusy(false);
   }
 }

 useEffect(()=>{
   if(quoteTimerRef.current)clearTimeout(quoteTimerRef.current);

   if(!/^[0-9]{6}$/.test(f.pincode||'')){
     if(quoteAbortRef.current)quoteAbortRef.current.abort();
     setPricing(null);
     setQuoteBusy(false);
     return;
   }

   quoteTimerRef.current=setTimeout(()=>{
     refreshQuote(f);
   },500);

   return()=>{
     if(quoteTimerRef.current)clearTimeout(quoteTimerRef.current);
   };
 },[f.pincode,f.payment,cart.length]);

 useEffect(()=>{
   return()=>{
     if(quoteTimerRef.current)clearTimeout(quoteTimerRef.current);
     if(quoteAbortRef.current)quoteAbortRef.current.abort();
   };
 },[]);

 async function submit(e){
   e.preventDefault();
   setError('');

   if(!f.name||!f.email||!f.phone||!f.address||!f.city||!f.state||!/^[0-9]{6}$/.test(f.pincode)){
     return setError('Please complete all required delivery details, including state.');
   }

   setBusy(true);

   const body={
     ...f,
     phone:`${country[2]}${f.phone.replace(/\D/g,'')}`,
     items:cart
   };

   try{if(f.payment==='COD'){const r=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error||'Could not place order.');localStorage.removeItem('avancy-cart');dispatchEvent(new Event('avancy-cart-updated'));location.href=`/checkout/success?order=${encodeURIComponent(d.orderId)}&email=${encodeURIComponent(f.email)}`;return}const r=await fetch('/api/razorpay/order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error||'Could not start payment.');if(!window.Razorpay)await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';s.onload=res;s.onerror=()=>rej(Error('Unable to load secure payment.'));document.body.appendChild(s)});const rp=new window.Razorpay({key:d.keyId,amount:d.amount,currency:d.currency,name:'AVANCY COLLECTIVES',description:'Custom streetwear order',order_id:d.razorpayOrderId,prefill:{name:f.name,email:f.email,contact:body.phone},theme:{color:'#e2f952'},handler:async(resp)=>{try{const vr=await fetch('/api/razorpay/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...resp,orderId:d.orderId})});const vd=await vr.json();if(!vr.ok)throw Error(vd.error||'Payment verification failed.');localStorage.removeItem('avancy-cart');dispatchEvent(new Event('avancy-cart-updated'));location.href=`/checkout/success?order=${encodeURIComponent(vd.orderId)}&email=${encodeURIComponent(f.email)}`}catch(err){setError(err.message);setBusy(false)}},modal:{ondismiss:()=>setBusy(false)}});rp.open()}catch(err){setError(err.message||'Checkout failed.');setBusy(false)}}
 return (
  <main className="ac-site">
    <header className="ac-nav">
      <Link href="/" className="ac-brand">
        <strong>Avancy</strong>
        <span>Collectives</span>
      </Link>

      <span className="checkout-tag">SECURE CHECKOUT</span>

      <Link href="/cart" className="checkout-back">
        ← BAG
      </Link>
    </header>

    <section className="checkout-page">

      <div className="checkout-main-column">

        <span className="ac-kicker">DROP / CHECKOUT</span>

        <h1>
          MAKE IT <em>YOURS.</em>
        </h1>

        <form onSubmit={submit} className="checkout-form">

          <label>
            FULL NAME
            <input
              required
              value={f.name}
              onChange={(e) => ch("name", e.target.value)}
            />
          </label>

          <label>
            EMAIL
            <input
              type="email"
              required
              value={f.email}
              onChange={(e) => ch("email", e.target.value)}
            />
          </label>

          <label>
            MOBILE
            <div className="phone-row">
              <select
                value={country[0]}
                onChange={(e) =>
                  setCountry(
                    countries.find(
                      (x) => x[0] === e.target.value
                    ) || countries[0]
                  )
                }
              >
                {countries.map((c) => (
                  <option key={c[0]} value={c[0]}>
                    {c[1]} {c[2]}
                  </option>
                ))}
              </select>

              <input
                required
                inputMode="numeric"
                value={f.phone}
                onChange={(e) =>
                  ch(
                    "phone",
                    e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 12)
                  )
                }
              />
            </div>
          </label>

          <label className="full-field">
            ADDRESS
            <textarea
              required
              value={f.address}
              onChange={(e) => ch("address", e.target.value)}
            />
          </label>

          <label>
            CITY
            <input
              required
              value={f.city}
              placeholder="Enter your city"
              onChange={(e) => ch("city", e.target.value)}
            />
          </label>

          <label>
            STATE
            <input
              required
              value={f.state}
              placeholder="Enter your state"
              onChange={(e) => ch("state", e.target.value)}
            />
          </label>

          <label>
            PINCODE
            <input
              required
              inputMode="numeric"
              maxLength={6}
              value={f.pincode}
              onChange={(e) =>
                ch(
                  "pincode",
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6)
                )
              }
            />
          </label>

          <div className="full-field payment-choice">
            <b>PAYMENT</b>

            <label>
              <input
                type="radio"
                checked={f.payment === "COD"}
                onChange={() => ch("payment", "COD")}
              />
              CASH ON DELIVERY
            </label>

            <label>
              <input
                type="radio"
                checked={f.payment === "RAZORPAY"}
                onChange={() => ch("payment", "RAZORPAY")}
              />
              RAZORPAY / UPI / CARD
            </label>
          </div>

          {error && (
            <div className="form-error full-field">
              {error}
            </div>
          )}

          <button
            className="ac-yellow-btn full-field"
            disabled={busy || !cart.length}
          >
            {busy
              ? "PROCESSING…"
              : f.payment === "COD"
                ? `PLACE COD ORDER — PAY ₹${Number(displayedTotal || 0).toLocaleString("en-IN")} →`
                : `PAY SECURELY — ₹${Number(displayedTotal || 0).toLocaleString("en-IN")} →`}
          </button>

        </form>
      </div>

      <aside className="checkout-right-column">

        <div className="checkout-summary">

          <span>YOUR BAG</span>

          <h2>
            ₹{Number(displayedTotal || 0).toLocaleString("en-IN")}
          </h2>

          {cart.map((x) => (
            <div key={x.key} className="summary-line">
              <span>
                {x.name} / {x.size} × {x.qty}
              </span>

              <b>
                ₹{(
                  Number(x.price || 0) *
                  Number(x.qty || 1)
                ).toLocaleString("en-IN")}
              </b>
            </div>
          ))}

          <div className="summary-line">
            <span>SUBTOTAL</span>
            <b>
              ₹{Number(displayedSubtotal || 0).toLocaleString("en-IN")}
            </b>
          </div>

          <div className="summary-line">
            <span>DELIVERY</span>
            <b>{shippingLabel}</b>
          </div>

          {pricing?.firstFiveFree && (
            <div className="summary-line">
              <span>FIRST 5 ORDERS</span>
              <b>FREE DELIVERY</b>
            </div>
          )}

          <div className="summary-line">
            <span>TOTAL</span>
            <b>
              ₹{Number(displayedTotal || 0).toLocaleString("en-IN")}
            </b>
          </div>

          <Link href="/cart">
            EDIT BAG →
          </Link>

        </div>

        {user && addresses.length > 0 && (
          <div className="checkout-saved">

            <div className="saved-head">
              <b>SAVED ADDRESSES</b>
              <span>Choose one to autofill checkout</span>
            </div>

            <div className="saved-address-picker">
              {addresses.map((a) => (
                <button
                  type="button"
                  key={a.id}
                  className={selected === a.id ? "selected" : ""}
                  onClick={() => applyAddress(a)}
                >
                  <strong>{a.name}</strong>

                  <span>
                    {a.label} · {a.city}
                  </span>

                  <small>
                    {a.address}, {a.state} — {a.pincode}
                  </small>
                </button>
              ))}
            </div>

          </div>
        )}

        {user && (
          <div className="checkout-manage-addresses">
            <span>ADDRESS BOOK</span>
            <Link href="/account/addresses">
              MANAGE ADDRESSES →
            </Link>
          </div>
        )}

      </aside>

    </section>

    <SiteFooter />
  </main>
 )
}
