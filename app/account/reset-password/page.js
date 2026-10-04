"use client";

import Link from 'next/link';
import {useSearchParams,useRouter} from 'next/navigation';
import {Suspense,useEffect,useState} from 'react';
import SiteFooter from '../../components/SiteFooter';

function ResetPasswordForm(){
  const params=useSearchParams();
  const router=useRouter();

  const email=params.get('email')||'';

  const[otp,setOtp]=useState('');
  const[password,setPassword]=useState('');
  const[confirm,setConfirm]=useState('');
  const[showPassword,setShowPassword]=useState(false);
  const[showConfirm,setShowConfirm]=useState(false);
  const[busy,setBusy]=useState(false);
  const[resending,setResending]=useState(false);
  const[resendSeconds,setResendSeconds]=useState(0);
  const[message,setMessage]=useState('');
  const[error,setError]=useState('');

  async function resendOtp(){
    if(!email||resending||resendSeconds>0)return;

    setError('');
    setMessage('');
    setResending(true);

    try{
      const response=await fetch('/api/account/resend-password-otp',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email})
      });

      const data=await response.json();

      if(!response.ok){
        if(response.status===429&&data.retryAfter){
          setResendSeconds(Number(data.retryAfter));
        }

        throw new Error(
          data.error||'Unable to send a new verification code.'
        );
      }

      setOtp('');
      setMessage(
        data.message||'A new verification code has been sent.'
      );

      setResendSeconds(
        Number(data.cooldown||60)
      );

    }catch(error){
      setError(error.message);
    }finally{
      setResending(false);
    }
  }

  useEffect(()=>{
    if(resendSeconds<=0)return;

    const timer=setInterval(()=>{
      setResendSeconds(current=>{
        if(current<=1){
          clearInterval(timer);
          return 0;
        }

        return current-1;
      });
    },1000);

    return ()=>clearInterval(timer);
  },[resendSeconds]);

  async function submit(e){
    e.preventDefault();

    setError('');
    setMessage('');

    if(!email){
      setError('Your recovery email is missing. Please request a new code.');
      return;
    }

    if(!/^\d{6}$/.test(otp)){
      setError('Please enter the 6-digit verification code.');
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
          email,
          otp,
          password
        })
      });

      const data=await response.json();

      if(!response.ok){
        throw new Error(
          data.error||'Unable to reset your password.'
        );
      }

      setMessage(
        'Your password has been updated. Redirecting to sign in…'
      );

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
          VERIFY <em>ACCOUNT.</em>
        </h1>

        <p>
          Enter the 6-digit code sent to your email
          {email ? (
            <>
              {' — '}
              <strong>{email}</strong>
              {' — '}
            </>
          ) : null}
          then create a new password.
        </p>

        <form onSubmit={submit}>

          <label>
            VERIFICATION CODE
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoComplete="one-time-code"
              value={otp}
              onChange={e=>{
                const value=e.target.value
                  .replace(/\D/g,'')
                  .slice(0,6);

                setOtp(value);
              }}
            />
          </label>

          <div style={{
            display:'flex',
            alignItems:'center',
            justifyContent:'space-between',
            gap:'12px',
            margin:'-2px 0 18px'
          }}>
            <span style={{
              color:'#777',
              fontSize:'11px',
              lineHeight:1.5
            }}>
              Didn't receive the code?
            </span>

            <button
              type="button"
              onClick={resendOtp}
              disabled={resending||resendSeconds>0}
              style={{
                background:'transparent',
                border:'0',
                padding:'0',
                color:resending||resendSeconds>0?'#666':'#e2f952',
                fontSize:'11px',
                fontWeight:900,
                letterSpacing:'.08em',
                cursor:resending||resendSeconds>0?'not-allowed':'pointer'
              }}
            >
              {resending
                ? 'SENDING…'
                : resendSeconds>0
                  ? `RESEND IN ${resendSeconds}s`
                  : 'RESEND OTP'}
            </button>
          </div>

          <label>
            NEW PASSWORD

            <div style={{
              position:'relative',
              width:'100%'
            }}>
              <input
                type={showPassword?'text':'password'}
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={e=>setPassword(e.target.value)}
                style={{
                  width:'100%',
                  paddingRight:'52px'
                }}
              />

              <button
                type="button"
                aria-label={showPassword?'Hide password':'Show password'}
                onClick={()=>setShowPassword(v=>!v)}
                style={{
                  position:'absolute',
                  right:'12px',
                  top:'50%',
                  transform:'translateY(-50%)',
                  border:'0',
                  background:'transparent',
                  padding:'8px',
                  color:'#888',
                  cursor:'pointer',
                  fontSize:'16px',
                  lineHeight:1
                }}
              >
                {showPassword?'◉':'◌'}
              </button>
            </div>
          </label>

          <label>
            CONFIRM PASSWORD

            <div style={{
              position:'relative',
              width:'100%'
            }}>
              <input
                type={showConfirm?'text':'password'}
                required
                minLength={6}
                autoComplete="new-password"
                value={confirm}
                onChange={e=>setConfirm(e.target.value)}
                style={{
                  width:'100%',
                  paddingRight:'52px'
                }}
              />

              <button
                type="button"
                aria-label={showConfirm?'Hide password':'Show password'}
                onClick={()=>setShowConfirm(v=>!v)}
                style={{
                  position:'absolute',
                  right:'12px',
                  top:'50%',
                  transform:'translateY(-50%)',
                  border:'0',
                  background:'transparent',
                  padding:'8px',
                  color:'#888',
                  cursor:'pointer',
                  fontSize:'16px',
                  lineHeight:1
                }}
              >
                {showConfirm?'◉':'◌'}
              </button>
            </div>
          </label>

          <p style={{
            margin:'4px 0 14px',
            color:'#888',
            fontSize:'11px',
            lineHeight:1.6
          }}>
            Your verification code expires in 5 minutes.
          </p>

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

          <span className="eyebrow">
            AVANCY / ACCOUNT RECOVERY
          </span>

          <h1>
            LOADING <em>RECOVERY.</em>
          </h1>

          <p>
            Preparing your secure password recovery.
          </p>
        </div>
      </main>
    }>
      <ResetPasswordForm/>
    </Suspense>
  );
}
