import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import { toast } from "sonner";

export default function Login() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isRegister = location.pathname === "/register";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaId, setCaptchaId] = useState("");
  const [captchaQuestion, setCaptchaQuestion] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reload, setReload] = useState(0);

  const startedRef = useRef(false);

  const fetchCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    try {
      const data = await api.getCaptcha();
      setCaptchaId(data.captcha_id);
      setCaptchaQuestion(data.question);
      setCaptchaAnswer("");
    } catch {
      toast.error("Failed to load captcha");
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    fetchCaptcha();
  }, [fetchCaptcha]);

  useEffect(() => {
    if (reload > 0) fetchCaptcha();
  }, [reload, fetchCaptcha]);

  useEffect(() => {
    if (user) navigate("/browse");
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (isRegister) {
        await register(name, email, password, captchaId, captchaAnswer);
        toast.success("Account created!");
      } else {
        await login(email, password, captchaId, captchaAnswer);
        toast.success("Welcome back!");
      }
      navigate("/browse");
    } catch (err) {
      toast.error(err.message || "Authentication failed");
      setReload((r) => r + 1);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/">
            <h1 className="text-3xl font-heading uppercase tracking-tight text-terra">
              Plotto
            </h1>
          </Link>
          <p className="text-sm text-ink-muted mt-2">
            {isRegister ? "Create your account" : "Sign in to your account"}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          data-testid={isRegister ? "register-form" : "login-form"}
          className="bg-surface border border-line-strong rounded-sm p-6 space-y-4"
        >
          {isRegister && (
            <div>
              <label className="block text-xs tracking-[0.15em] uppercase text-ink-muted mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                data-testid="register-name-input"
                className="w-full px-3 py-2 border border-line-strong rounded-sm text-sm focus:outline-none focus:border-terra transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-xs tracking-[0.15em] uppercase text-ink-muted mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid={isRegister ? "register-email-input" : "login-email-input"}
              className="w-full px-3 py-2 border border-line-strong rounded-sm text-sm focus:outline-none focus:border-terra transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs tracking-[0.15em] uppercase text-ink-muted mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              data-testid={isRegister ? "register-password-input" : "login-password-input"}
              className="w-full px-3 py-2 border border-line-strong rounded-sm text-sm focus:outline-none focus:border-terra transition-colors"
            />
          </div>

          {/* Captcha */}
          <div>
            <label className="block text-xs tracking-[0.15em] uppercase text-ink-muted mb-1.5">
              Verification
            </label>
            <div className="flex items-center gap-3">
              <div
                data-testid="captcha-question"
                className="flex-1 px-3 py-2 bg-paper border border-line rounded-sm text-sm text-ink"
              >
                {captchaLoading ? "Loading..." : captchaQuestion || "Loading..."}
              </div>
              <button
                type="button"
                onClick={() => setReload((r) => r + 1)}
                data-testid="captcha-refresh"
                className="p-2 text-ink-muted hover:text-terra transition-colors"
              >
                <RefreshCw size={16} />
              </button>
              <input
                type="text"
                inputMode="numeric"
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                required
                placeholder="Answer"
                data-testid="captcha-answer-input"
                className="w-24 px-3 py-2 border border-line-strong rounded-sm text-sm focus:outline-none focus:border-terra transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || captchaLoading}
            data-testid={isRegister ? "register-submit-button" : "login-submit-button"}
            className="w-full py-2.5 bg-terra text-white text-sm font-medium rounded-sm hover:bg-terra/90 transition-colors disabled:opacity-50"
          >
            {submitting ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="text-center mt-4">
          {isRegister ? (
            <Link to="/login" className="text-sm text-ink-muted hover:text-terra transition-colors">
              Already have an account? Sign in
            </Link>
          ) : (
            <Link to="/register" className="text-sm text-ink-muted hover:text-terra transition-colors">
              Need an account? Register
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
