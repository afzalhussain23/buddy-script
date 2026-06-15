"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
  type FieldErrors,
  getFieldErrors,
  getResponseFieldErrors,
  registerFormSchema,
} from "@/lib/validation";

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={id} role="alert" style={{ color: "#ff4d4f", margin: "6px 0 0" }}>
      {errors[0]}
    </p>
  );
}

// Interactive island for the register screen. Kept separate from the page so the
// surrounding static markup (illustration, logo, headings) stays a server
// component and never ships to the client.
export function RegisterForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const parsed = registerFormSchema.safeParse({
      firstName,
      lastName,
      email,
      password,
      repeatPassword,
      acceptedTerms: agreed,
    });
    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }

    setLoading(true);
    try {
      // `name` is required by the client type but is always overwritten by the
      // auth.ts before-hook (derived from first/last name), so the empty
      // placeholder is discarded server-side.
      const { error } = await authClient.signUp.email({
        email: parsed.data.email,
        password: parsed.data.password,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        acceptedTerms: parsed.data.acceptedTerms,
        name: "",
      });
      if (error) {
        const nextFieldErrors = getResponseFieldErrors(error);
        setFieldErrors(nextFieldErrors);
        if (!Object.keys(nextFieldErrors).length) {
          setError(error.message ?? "Unable to register. Please try again.");
        }
        return;
      }
      router.push("/feed");
    } catch {
      setError("Unable to register. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="_social_registration_form" onSubmit={handleRegister}>
      <div className="row">
        <div className="col-xl-6 col-lg-12 col-md-6 col-sm-12">
          <div className="_social_registration_form_input _mar_b14">
            <label
              htmlFor="registerFirstName"
              className="_social_registration_label _mar_b8"
            >
              First Name
            </label>
            <input
              id="registerFirstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              className="form-control _social_registration_input"
              aria-invalid={Boolean(fieldErrors.firstName)}
              aria-describedby={
                fieldErrors.firstName ? "firstNameError" : undefined
              }
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <FieldError id="firstNameError" errors={fieldErrors.firstName} />
          </div>
        </div>
        <div className="col-xl-6 col-lg-12 col-md-6 col-sm-12">
          <div className="_social_registration_form_input _mar_b14">
            <label
              htmlFor="registerLastName"
              className="_social_registration_label _mar_b8"
            >
              Last Name
            </label>
            <input
              id="registerLastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              className="form-control _social_registration_input"
              aria-invalid={Boolean(fieldErrors.lastName)}
              aria-describedby={
                fieldErrors.lastName ? "lastNameError" : undefined
              }
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <FieldError id="lastNameError" errors={fieldErrors.lastName} />
          </div>
        </div>
        <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
          <div className="_social_registration_form_input _mar_b14">
            <label
              htmlFor="registerEmail"
              className="_social_registration_label _mar_b8"
            >
              Email
            </label>
            <input
              id="registerEmail"
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              className="form-control _social_registration_input"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={
                fieldErrors.email ? "registerEmailError" : undefined
              }
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <FieldError id="registerEmailError" errors={fieldErrors.email} />
          </div>
        </div>
        <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
          <div className="_social_registration_form_input _mar_b14">
            <label
              htmlFor="registerPassword"
              className="_social_registration_label _mar_b8"
            >
              Password
            </label>
            <input
              id="registerPassword"
              name="password"
              type="password"
              autoComplete="new-password"
              className="form-control _social_registration_input"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                fieldErrors.password ? "registerPasswordError" : undefined
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <FieldError
              id="registerPasswordError"
              errors={fieldErrors.password}
            />
          </div>
        </div>
        <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
          <div className="_social_registration_form_input _mar_b14">
            <label
              htmlFor="registerRepeatPassword"
              className="_social_registration_label _mar_b8"
            >
              Repeat Password
            </label>
            <input
              id="registerRepeatPassword"
              name="repeatPassword"
              type="password"
              autoComplete="new-password"
              className="form-control _social_registration_input"
              aria-invalid={Boolean(fieldErrors.repeatPassword)}
              aria-describedby={
                fieldErrors.repeatPassword ? "repeatPasswordError" : undefined
              }
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
            />
            <FieldError
              id="repeatPasswordError"
              errors={fieldErrors.repeatPassword}
            />
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-lg-12 col-xl-12 col-md-12 col-sm-12">
          <div className="form-check _social_registration_form_check">
            <input
              className="form-check-input _social_registration_form_check_input"
              type="checkbox"
              name="agreeTerms"
              id="agreeTerms"
              checked={agreed}
              aria-invalid={Boolean(fieldErrors.acceptedTerms)}
              aria-describedby={
                fieldErrors.acceptedTerms ? "acceptedTermsError" : undefined
              }
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <label
              className="form-check-label _social_registration_form_check_label"
              htmlFor="agreeTerms"
            >
              I agree to terms & conditions
            </label>
            <FieldError
              id="acceptedTermsError"
              errors={fieldErrors.acceptedTerms}
            />
          </div>
        </div>
      </div>
      {error ? (
        <div className="row">
          <div className="col-lg-12 col-xl-12 col-md-12 col-sm-12">
            <p
              role="alert"
              className="_social_registration_content_para"
              style={{ color: "#ff4d4f", marginTop: "10px" }}
            >
              {error}
            </p>
          </div>
        </div>
      ) : null}
      <div className="row">
        <div className="col-lg-12 col-md-12 col-xl-12 col-sm-12">
          <div className="_social_registration_form_btn _mar_t40 _mar_b60">
            <button
              type="submit"
              className="_social_registration_form_btn_link _btn1"
              disabled={loading}
            >
              {loading ? "Creating account…" : "Sign up"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
