"use client";
import Link from 'next/link';import {useState} from 'react';import {useRouter} from 'next/navigation';import SiteFooter from '../../components/SiteFooter';
export default function Login(){const[email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[showPassword,setShowPassword]=useState(false);const r=useRouter();async function submit(e){e.preventDefault();setError('');setBusy(true);try{const x=await fetch('/api/account/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});const d=await x.json();if(!x.ok)throw Error(d.error||'Login failed.');r.replace('/shop');r.refresh()}catch(e){setError(e.message)}finally{setBusy(false)}}return <main className="auth-premium"><div className="auth-panel"><Link href="/" className="auth-logo">AVANCY<span>COLLECTIVES™</span></Link><span className="eyebrow">THE COLLECTIVE / ACCOUNT</span><h1>SIGN <em>IN.</em></h1><p>Welcome back. Your pieces are waiting.</p>

<a href="/api/account/google/start" className="google-auth-button">
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M21.35 12.23c0-.79-.07-1.55-.23-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z"/>
    <path d="M12 21.75c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.55 0-4.71-1.72-5.49-4.04H3.26v2.53A9.75 9.75 0 0 0 12 21.75Z"/>
    <path d="M6.51 13.83A5.86 5.86 0 0 1 6.2 12c0-.64.11-1.26.31-1.83V7.64H3.26A9.74 9.74 0 0 0 2.25 12c0 1.57.38 3.05 1.01 4.36l3.25-2.53Z"/>
    <path d="M12 6.13c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.13 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.74 5.39l3.25 2.53C7.29 7.85 9.45 6.13 12 6.13Z"/>
  </svg>
  <span>CONTINUE WITH GOOGLE</span>
</a>

<div className="auth-divider"><span>OR</span></div>

<form onSubmit={submit}><label>EMAIL<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>PASSWORD<div className="password-field"><input type={showPassword?'text':'password'} required value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" className="password-toggle" aria-label={showPassword?'Hide password':'Show password'} onClick={()=>{setShowPassword(true);setTimeout(()=>setShowPassword(false),2000)}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg></button></div></label>
<div className="forgot-password-row">
  <Link href="/account/forgot-password">FORGOT PASSWORD?</Link>
</div>
{error&&<p className="form-error">{error}</p>}<button disabled={busy}>{busy?'SIGNING IN…':'SIGN IN →'}</button></form><p className="auth-switch">New here? <Link href="/account/register">CREATE ACCOUNT</Link></p><Link href="/shop" className="back-link">← SHOP</Link></div><SiteFooter/></main>}
