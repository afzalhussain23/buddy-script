import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AuthShapes } from "../auth-shapes";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Log In",
};

export default function LoginPage() {
  return (
    <>
      <section className="_social_login_wrapper _layout_main_wrapper">
        <AuthShapes />
        <div className="_social_login_wrap">
          <div className="container">
            <div className="row align-items-center">
              <div className="col-xl-8 col-lg-8 col-md-12 col-sm-12">
                <div className="_social_login_left">
                  <div className="_social_login_left_image">
                    <Image
                      src="/assets/images/login.png"
                      alt="Login illustration"
                      className="_left_img"
                      width={1269}
                      height={1240}
                      sizes="(max-width: 991px) 100vw, 66vw"
                    />
                  </div>
                </div>
              </div>
              <div className="col-xl-4 col-lg-4 col-md-12 col-sm-12">
                <div className="_social_login_content">
                  <div className="_social_login_left_logo _mar_b28">
                    <Image
                      src="/assets/images/logo.svg"
                      alt="Buddy Script"
                      className="_left_logo"
                      width={158}
                      height={33}
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
                    <Image
                      src="/assets/images/google.svg"
                      alt="Google"
                      className="_google_img"
                      width={20}
                      height={20}
                    />{" "}
                    <span>Or sign-in with google</span>
                  </button>
                  <div className="_social_login_content_bottom_txt _mar_b40">
                    {" "}
                    <span>Or</span>
                  </div>
                  <LoginForm />
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
    </>
  );
}
