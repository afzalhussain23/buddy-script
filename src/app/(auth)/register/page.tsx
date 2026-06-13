"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { registerFormSchema } from "@/lib/validation";
import { AuthShapes } from "../auth-shapes";

export default function RegisterPage() {
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
    // `name` is required by the client type but is always overwritten by the
    // auth.ts before-hook (derived from first/last name), so we don't recompute
    // it here — the empty placeholder is discarded server-side.
    const { error } = await authClient.signUp.email({
      email: parsed.data.email,
      password: parsed.data.password,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      name: "",
    });
    setLoading(false);
    if (error) {
      // Covers duplicate email and any other server-side failure — shown
      // inline rather than crashing.
      setError(error.message ?? "Unable to register. Please try again.");
      return;
    }
    router.push("/feed");
  }

  return (
    <>
      {/*Registration Section Start*/}
      <section className="_social_registration_wrapper _layout_main_wrapper">
        <AuthShapes />
        <div className="_social_registration_wrap">
          <div className="container">
            <div className="row align-items-center">
              <div className="col-xl-8 col-lg-8 col-md-12 col-sm-12">
                <div className="_social_registration_right">
                  <div className="_social_registration_right_image">
                    <img
                      src="/assets/images/registration.png"
                      alt="Registration illustration"
                    />
                  </div>
                  <div className="_social_registration_right_image_dark">
                    <img
                      src="/assets/images/registration1.png"
                      alt="Registration illustration"
                    />
                  </div>
                </div>
              </div>
              <div className="col-xl-4 col-lg-4 col-md-12 col-sm-12">
                <div className="_social_registration_content">
                  <div className="_social_registration_right_logo _mar_b28">
                    <img
                      src="/assets/images/logo.svg"
                      alt="Buddy Script"
                      className="_right_logo"
                    />
                  </div>
                  <p className="_social_registration_content_para _mar_b8">
                    Get Started Now
                  </p>
                  <h4 className="_social_registration_content_title _titl4 _mar_b50">
                    Registration
                  </h4>
                  <button
                    type="button"
                    className="_social_registration_content_btn _mar_b40"
                  >
                    <img
                      src="/assets/images/google.svg"
                      alt="Google"
                      className="_google_img"
                    />{" "}
                    <span>Register with google</span>
                  </button>
                  <div className="_social_registration_content_bottom_txt _mar_b40">
                    {" "}
                    <span>Or</span>
                  </div>
                  <form
                    className="_social_registration_form"
                    onSubmit={handleRegister}
                  >
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
                  <div className="row">
                    <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                      <div className="_social_registration_bottom_txt">
                        <p className="_social_registration_bottom_txt_para">
                          Already have an account?{" "}
                          <Link href="/login">Login now</Link>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/*Registration Section End*/}
    </>
  );
}
