"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { registerFormSchema } from "@/lib/validation";

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
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!agreed) {
      setError("Please agree to the terms & conditions.");
      return;
    }

    const parsed = registerFormSchema.safeParse({
      firstName,
      lastName,
      email,
      password,
      repeatPassword,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid details.");
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
        name: "",
      });
      if (error) {
        setError(error.message ?? "Unable to register. Please try again.");
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
              type="text"
              className="form-control _social_registration_input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
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
              type="text"
              className="form-control _social_registration_input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
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
              type="email"
              className="form-control _social_registration_input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
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
              type="password"
              className="form-control _social_registration_input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              type="password"
              className="form-control _social_registration_input"
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-lg-12 col-xl-12 col-md-12 col-sm-12">
          <div className="form-check _social_registration_form_check">
            <input
              className="form-check-input _social_registration_form_check_input"
              type="radio"
              name="flexRadioDefault"
              id="flexRadioDefault2"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <label
              className="form-check-label _social_registration_form_check_label"
              htmlFor="flexRadioDefault2"
            >
              I agree to terms & conditions
            </label>
          </div>
        </div>
      </div>
      {error ? (
        <div className="row">
          <div className="col-lg-12 col-xl-12 col-md-12 col-sm-12">
            <p
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
              {loading ? "Creating account..." : "Sign up"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
