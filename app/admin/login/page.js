"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [authStep, setAuthStep] = useState("credentials");
  const [setupData, setSetupData] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [backupCodes, setBackupCodes] = useState(null);

  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();

    if (isLoading) return;

    setError("");
    setIsLoading(true);

    try {
      if (authStep === "credentials") {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error || "Login failed."
          );
        }

        if (data?.requires2FASetup) {
          const setupResponse = await fetch(
            "/api/auth/2fa/setup",
            {
              method: "GET",
              cache: "no-store",
            }
          );

          const setup = await setupResponse.json();

          if (!setupResponse.ok) {
            throw new Error(
              setup?.error ||
                "Could not start 2FA setup."
            );
          }

          setSetupData(setup);
          setAuthStep("setup");
          setTwoFactorCode("");
          setIsLoading(false);
          return;
        }

        if (data?.requires2FAVerification) {
          setAuthStep("verify");
          setTwoFactorCode("");
          setIsLoading(false);
          return;
        }

        throw new Error(
          "Secure authentication could not be established."
        );
      }

      const response = await fetch(
        "/api/auth/2fa/verify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: twoFactorCode,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Two-factor verification failed."
        );
      }

      if (data?.backupCodes?.length) {
        setBackupCodes(data.backupCodes);
        setIsLoading(false);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(
        err?.message ||
          "Authentication failed."
      );
      setIsLoading(false);
    }
  }


  return (
    <main className="av-glass-login">
      {/* Ambient background glows */}
      <div className="av-glass-login-glow av-glass-login-glow-left" />
      <div className="av-glass-login-glow av-glass-login-glow-right" />

      {/* Ambient center light */}
      <div className="av-glass-login-ambient" />

      {/* Login card */}
      <section className="av-glass-login-card">

        {/* Logo badge */}
        <div className="av-glass-login-brand">
          <div className="av-glass-login-logo">
            <span>N</span>
            <div className="av-glass-login-logo-ping" />
          </div>

          <h1>Welcome back, Operator</h1>

          <p>
            Administrative Console • Level 4
          </p>
        </div>

        {/* Login form */}
        {backupCodes ? (
          <div className="av-glass-2fa-panel">
            <div className="av-glass-2fa-kicker">
              RECOVERY ACCESS
            </div>

            <h2>Save your backup codes</h2>

            <p>
              These codes can be used if you lose
              access to Google Authenticator. Each
              code can be used only once.
            </p>

            <div className="av-glass-backup-codes">
              {backupCodes.map((code) => (
                <code key={code}>{code}</code>
              ))}
            </div>

            <button
              type="button"
              className="av-glass-login-submit"
              onClick={() => {
                setBackupCodes(null);
                router.push("/admin");
                router.refresh();
              }}
            >
              <span>Continue to Admin</span>
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="av-glass-login-form"
          >
            {authStep === "credentials" ? (
              <>
                <div className="av-glass-field">
                  <label>
                    Mail
                  </label>

                  <div className="av-glass-input-wrap">
                    <Mail
                      size={17}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />

                    <input
                      type="email"
                      required
                      autoComplete="username"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      placeholder="Admin Identifier"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="av-glass-field">
                  <div className="av-glass-input-wrap">
                    <Lock
                      size={17}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />

                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      placeholder="Password"
                      disabled={isLoading}
                    />

                    <button
                      type="button"
                      className="av-glass-password-toggle"
                      onClick={() =>
                        setShowPassword(
                          (value) => !value
                        )
                      }
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff
                          size={17}
                          strokeWidth={1.8}
                        />
                      ) : (
                        <Eye
                          size={17}
                          strokeWidth={1.8}
                        />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="av-glass-login-error">
                    <span>!</span>
                    <p>{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  className="av-glass-login-submit"
                  disabled={isLoading}
                  aria-busy={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2
                        size={17}
                        className="av-glass-login-spinner"
                        aria-hidden="true"
                      />
                      <span>
                        Authenticating...
                      </span>
                    </>
                  ) : (
                    <span>
                      Establish Secure Session
                    </span>
                  )}
                </button>
              </>
            ) : (
              <>
                <div className="av-glass-2fa-panel">
                  <div className="av-glass-2fa-kicker">
                    {authStep === "setup"
                      ? "FIRST-TIME SECURITY SETUP"
                      : "SECURE VERIFICATION"}
                  </div>

                  <h2>
                    {authStep === "setup"
                      ? "Connect Google Authenticator"
                      : "Verify your identity"}
                  </h2>

                  <p>
                    {authStep === "setup"
                      ? "Scan this QR code with Google Authenticator, then enter the 6-digit code shown on your phone."
                      : "Open Google Authenticator and enter the current 6-digit Avancy security code."}
                  </p>

                  {authStep === "setup" &&
                    setupData?.qrCodeDataUrl && (
                      <div className="av-glass-2fa-qr">
                        <img
                          src={
                            setupData.qrCodeDataUrl
                          }
                          alt="Google Authenticator setup QR code"
                        />
                      </div>
                    )}

                  {authStep === "setup" &&
                    setupData?.secret && (
                      <div className="av-glass-2fa-secret">
                        <span>
                          MANUAL SETUP KEY
                        </span>
                        <code>
                          {setupData.secret}
                        </code>
                      </div>
                    )}

                  <div className="av-glass-2fa-code-wrap">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      autoComplete="one-time-code"
                      autoFocus
                      value={twoFactorCode}
                      onChange={(e) =>
                        setTwoFactorCode(
                          e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6)
                        )
                      }
                      placeholder="000000"
                      aria-label="6-digit authenticator code"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {error && (
                  <div className="av-glass-login-error">
                    <span>!</span>
                    <p>{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  className="av-glass-login-submit"
                  disabled={
                    isLoading ||
                    twoFactorCode.length !== 6
                  }
                  aria-busy={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2
                        size={17}
                        className="av-glass-login-spinner"
                        aria-hidden="true"
                      />
                      <span>
                        Verifying...
                      </span>
                    </>
                  ) : (
                    <span>
                      {authStep === "setup"
                        ? "Enable Two-Factor Authentication"
                        : "Verify & Enter Admin"}
                    </span>
                  )}
                </button>
              </>
            )}
          </form>
        )}

        {/* Security footer */}
        <div className="av-glass-login-security">
          <span>
            <i />
            TLS 1.3 Active
          </span>

          <span>
            Encrypted Session
          </span>
        </div>

      </section>
    </main>
  );
}
