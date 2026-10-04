"use client";

import Link from 'next/link';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import SiteFooter from '../../components/SiteFooter';

export default function ForgotPassword(){
  const router=useRouter();

  const[email,setEmail]=useState('');
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState('');
  const[error,setError]=useState('');

  async function submit(e){
    e.preventDefault();

    setBusy(true);
    setMessage('');
    setError('');

    try{
      const response=await fetch('/api/account/forgot-password',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email})
      });

      const data=await response.json();

      if(!response.ok){
        throw new Error(data.error||'Unable to send verification code.');
      }

      setMessage(
        data.message||
        'If an account exists for that email, a verification code has been sent.'
      );

      setTimeout(()=>{
        router.push(
          `/account/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`
        );
      },800);

    }catch(error){
      setError(error.message);
    }finally{
      setBusy(false);
    }
  }

  return (
    <main className="auth-premium">
      <div className="auth-panel">

        <Link href="/" className="auth-logo">
          AVANCY<span>COLLECTIVES™</span>
        </Link>

        <span className="eyebrow">
          AVANCY / ACCOUNT RECOVERY
        </span>

        <h1>
          RESET <em>PASSWORD.</em>
        </h1>

        <p>
          Enter the email connected to your account and we'll send you a 6-digit verification code.
        </p>

        <form onSubmit={submit}>

          <label>
            EMAIL
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e=>setEmail(e.target.value)}
            />
          </label>

          {error&&(
            <p className="form-error">
              {error}
            </p>
          )}

          {message&&(
            <p className="form-success">
              {message}
            </p>
          )}

          <button disabled={busy}>
            {busy?'SENDING…':'SEND VERIFICATION CODE →'}
          </button>

        </form>

        <p className="auth-switch">
          Remember your password?{' '}
          <Link href="/account/login">
            SIGN IN
          </Link>
        </p>

        <Link href="/shop" className="back-link">
          ← SHOP
        </Link>

      </div>

      <SiteFooter/>
    </main>
  );
}
