"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { signInSchema } from "@/lib/validation";
import { AuthShapes } from "../auth-shapes";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid details.");
      return;
    }

    setLoading(true);
    const { error } = await authClient.signIn.email({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message ?? "Invalid email or password.");
      return;
    }
    router.push("/feed");
  }

  return (
    <>
      {/*Login Section Start*/}
      <section className="_social_login_wrapper _layout_main_wrapper">
        <AuthShapes />
        <div className="_social_login_wrap">
          <div className="container">
            <div className="row align-items-center">
              <div className="col-xl-8 col-lg-8 col-md-12 col-sm-12">
                <div className="_social_login_left">
                  <div className="_social_login_left_image">
                    <img
                      src="/assets/images/login.png"
                      alt="Login illustration"
                      className="_left_img"
                    />
                  </div>
                </div>
              </div>
              <div className="col-xl-4 col-lg-4 col-md-12 col-sm-12">
                <div className="_social_login_content">
                  <div className="_social_login_left_logo _mar_b28">
                    <img
                      src="/assets/images/logo.svg"
                      alt="Buddy Script"
                      className="_left_logo"
                    />
                  </div>
                  <p className="_social_login_content_para _mar_b8">
                    Welcome back
                  </p>
                  <h4 className="_social_login_content_title _titl4 _mar_b50">
                    Login to your account
                  </h4>
                  <button
                    type="button"
                    className="_social_login_content_btn _mar_b40"
                  >
                    <img
                      src="/assets/images/google.svg"
                      alt="Google"
                      className="_google_img"
                    />{" "}
                    <span>Or sign-in with google</span>
                  </button>
                  <div className="_social_login_content_bottom_txt _mar_b40">
                    {" "}
                    <span>Or</span>
                  </div>
                  <form className="_social_login_form" onSubmit={handleLogin}>
                    <div className="row">
                      <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                        <div className="_social_login_form_input _mar_b14">
                          <label
                            htmlFor="loginEmail"
                            className="_social_login_label _mar_b8"
                          >
                            Email
                          </label>
                          <input
                            id="loginEmail"
                            type="email"
                            className="form-control _social_login_input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
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
                            type="password"
                            className="form-control _social_login_input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-lg-6 col-xl-6 col-md-6 col-sm-12">
                        <div className="form-check _social_login_form_check">
                          <input
                            className="form-check-input _social_login_form_check_input"
                            type="radio"
                            name="flexRadioDefault"
                            id="flexRadioDefault2"
                            defaultChecked
                          />
                          <label
                            className="form-check-label _social_login_form_check_label"
                            htmlFor="flexRadioDefault2"
                          >
                            Remember me
                          </label>
                        </div>
                      </div>
                      <div className="col-lg-6 col-xl-6 col-md-6 col-sm-12">
                        <div className="_social_login_form_left">
                          <p className="_social_login_form_left_para">
                            Forgot password?
                          </p>
                        </div>
                      </div>
                    </div>
                    {error ? (
                      <div className="row">
                        <div className="col-lg-12 col-md-12 col-xl-12 col-sm-12">
                          <p
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
                            {loading ? "Logging in..." : "Login now"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                  <div className="row">
                    <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                      <div className="_social_login_bottom_txt">
                        <p className="_social_login_bottom_txt_para">
                          Dont have an account?{" "}
                          <Link href="/register">Create New Account</Link>
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
      {/*Login Section End*/}
    </>
  );
}
