import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AuthShapes } from "../auth-shapes";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Register",
};

export default function RegisterPage() {
  return (
    <section className="_social_registration_wrapper _layout_main_wrapper">
      <AuthShapes />
      <div className="_social_registration_wrap">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-xl-8 col-lg-8 col-md-12 col-sm-12">
              <div className="_social_registration_right">
                <div className="_social_registration_right_image">
                  <Image
                    src="/assets/images/registration.png"
                    alt="Registration illustration"
                    width={1928}
                    height={1422}
                    sizes="(max-width: 991px) 100vw, 66vw"
                  />
                </div>
                <div className="_social_registration_right_image_dark">
                  <Image
                    src="/assets/images/registration1.png"
                    alt="Registration illustration"
                    width={1928}
                    height={1422}
                    sizes="(max-width: 991px) 100vw, 66vw"
                  />
                </div>
              </div>
            </div>
            <div className="col-xl-4 col-lg-4 col-md-12 col-sm-12">
              <div className="_social_registration_content">
                <div className="_social_registration_right_logo _mar_b28">
                  <Image
                    src="/assets/images/logo.svg"
                    alt="Buddy Script"
                    className="_right_logo"
                    width={158}
                    height={33}
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
                  <Image
                    src="/assets/images/google.svg"
                    alt="Google"
                    className="_google_img"
                    width={20}
                    height={20}
                  />{" "}
                  <span>Register with google</span>
                </button>
                <div className="_social_registration_content_bottom_txt _mar_b40">
                  {" "}
                  <span>Or</span>
                </div>
                <RegisterForm />
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
  );
}
