"use client";

import Link from 'next/link';
import {useSearchParams,useRouter} from 'next/navigation';
import {Suspense} from 'react';
import {useState} from 'react';
import SiteFooter from '../../components/SiteFooter';

function ResetPasswordForm(){
  const params=useSearchParams();
  const router=useRouter();

  const token=params.get('token')||'';

  const[password,setPassword]=useState('');
  const[confirm,setConfirm]=useState('');
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState('');
  const[error,setError]=useState('');

  async function submit(e){
    e.preventDefault();

    setError('');
    setMessage('');

    if(!token){
      setError('This password reset link is invalid or missing.');
      return;
    }

    if(password.length<6){
      setError('Password must be at least 6 characters.');
      return;
    }

    if(password!==confirm){
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);

    try{
      const response=await fetch('/api/account/reset-password',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          token,
          password
        })
      });

      const data=await response.json();

      if(!response.ok){
        throw new Error(data.error||'Unable to reset your password.');
      }

      setMessage('Your password has been updated. Redirecting to sign in…');

      setTimeout(()=>{
        router.replace('/account/login');
      },1500);

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
          NEW <em>PASSWORD.</em>
        </h1>

        <p>
          Create a new password for your Avancy Collectives account.
        </p>

        <form onSubmit={submit}>
          <label>
            NEW PASSWORD
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={e=>setPassword(e.target.value)}
            />
          </label>

          <label>
            CONFIRM PASSWORD
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirm}
              onChange={e=>setConfirm(e.target.value)}
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
            {busy?'UPDATING…':'UPDATE PASSWORD →'}
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


export default function ResetPassword(){
  return (
    <Suspense fallback={
      <main className="auth-premium">
        <div className="auth-panel">
          <span className="auth-logo">
            AVANCY<span>COLLECTIVES™</span>
          </span>
          <span className="eyebrow">AVANCY / ACCOUNT RECOVERY</span>
          <h1>LOADING <em>RESET.</em></h1>
          <p>Preparing your secure password reset.</p>
        </div>
      </main>
    }>
      <ResetPasswordForm/>
    </Suspense>
  );
}
