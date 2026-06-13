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
      {/* Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@100;300;400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      {/* Bootstrap */}
      <link rel="stylesheet" href="/assets/css/bootstrap.min.css" />
      {/* Common Css */}
      <link rel="stylesheet" href="/assets/css/common.css" />
      {/* Custom Css */}
      <link rel="stylesheet" href="/assets/css/main.css" />
      {/* Responsive Css */}
      <link rel="stylesheet" href="/assets/css/responsive.css" />

      {children}

      <Script
        src="/assets/js/bootstrap.bundle.min.js"
        strategy="afterInteractive"
      />
      <Script src="/assets/js/custom.js" strategy="afterInteractive" />
    </>
  );
}
