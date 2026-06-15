import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Buddy Script",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* Poppins is self-hosted via next/font in the root layout (--font-poppins). */}
      <link rel="stylesheet" href="/assets/css/bootstrap.min.css" />
      <link rel="stylesheet" href="/assets/css/common.css" />
      <link rel="stylesheet" href="/assets/css/main.css" />
      <link rel="stylesheet" href="/assets/css/responsive.css" />

      {children}

      <Script
        src="/assets/js/bootstrap.bundle.min.js"
        strategy="afterInteractive"
      />
    </>
  );
}
