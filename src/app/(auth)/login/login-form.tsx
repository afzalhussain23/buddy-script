"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
  type FieldErrors,
  getFieldErrors,
  getResponseFieldErrors,
  signInSchema,
} from "@/lib/validation";

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={id} role="alert" style={{ color: "#ff4d4f", margin: "6px 0 0" }}>
      {errors[0]}
    </p>
  );
}

// Interactive island for the login screen. Kept separate from the page so the
// surrounding static markup (illustration, logo, headings) stays a server
// component and never ships to the client.
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }

    setLoading(true);
    try {
      const { error } = await authClient.signIn.email({ email, password });
      if (error) {
        const nextFieldErrors = getResponseFieldErrors(error);
        setFieldErrors(nextFieldErrors);
        if (!Object.keys(nextFieldErrors).length) {
          setError(error.message ?? "Invalid email or password.");
        }
        return;
      }
      router.push("/feed");
    } catch {
      setError("Unable to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="_social_login_form" onSubmit={handleLogin}>
      <div className="row">
        <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
          <div className="_social_login_form_input _mar_b14">
            <label htmlFor="loginEmail" className="_social_login_label _mar_b8">
              Email
            </label>
            <input
              id="loginEmail"
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              className="form-control _social_login_input"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={
                fieldErrors.email ? "loginEmailError" : undefined
              }
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <FieldError id="loginEmailError" errors={fieldErrors.email} />
          </div>
        </div>
        <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
          <div className="_social_login_form_input _mar_b14">
            <label
              htmlFor="loginPassword"
              className="_social_login_label _mar_b8"
            >
              Password
            </label>
            <input
              id="loginPassword"
              name="password"
              type="password"
              autoComplete="current-password"
              className="form-control _social_login_input"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                fieldErrors.password ? "loginPasswordError" : undefined
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <FieldError id="loginPasswordError" errors={fieldErrors.password} />
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-lg-6 col-xl-6 col-md-6 col-sm-12">
          <div className="form-check _social_login_form_check">
            <input
              className="form-check-input _social_login_form_check_input"
              type="checkbox"
              name="rememberMe"
              id="rememberMe"
              defaultChecked
            />
            <label
              className="form-check-label _social_login_form_check_label"
              htmlFor="rememberMe"
            >
              Remember me
            </label>
          </div>
        </div>
        <div className="col-lg-6 col-xl-6 col-md-6 col-sm-12">
          <div className="_social_login_form_left">
            <button
              type="button"
              className="_social_login_form_left_para"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Forgot password?
            </button>
          </div>
        </div>
      </div>
      {error ? (
        <div className="row">
          <div className="col-lg-12 col-md-12 col-xl-12 col-sm-12">
            <p
              role="alert"
              className="_social_login_form_left_para"
              style={{ color: "#ff4d4f", marginTop: "10px" }}
            >
              {error}
            </p>
          </div>
        </div>
      ) : null}
      <div className="row">
        <div className="col-lg-12 col-md-12 col-xl-12 col-sm-12">
          <div className="_social_login_form_btn _mar_t40 _mar_b60">
            <button
              type="submit"
              className="_social_login_form_btn_link _btn1"
              disabled={loading}
            >
              {loading ? "Logging in…" : "Login now"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
