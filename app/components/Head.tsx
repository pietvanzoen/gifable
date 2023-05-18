import { Links, Meta } from "@remix-run/react";
import type { LinkHTMLAttributes } from "react";
import type { Theme } from "./ThemeStyles";
import ThemeStyles from "./ThemeStyles";

const LINKS = [
  { rel: "stylesheet", href: "/css/simple.min.css" },
  { rel: "manifest", href: "/site.webmanifest" },
  {
    rel: "preload",
    href: "/fonts/fira-sans-v16-latin-regular.woff2",
    as: "font",
    type: "font/woff2",
    crossOrigin:
      "anonymous" as LinkHTMLAttributes<HTMLLinkElement>["crossOrigin"],
  },
  {
    rel: "preload",
    href: "/fonts/fira-sans-v16-latin-800.woff2",
    as: "font",
    type: "font/woff2",
    crossOrigin:
      "anonymous" as LinkHTMLAttributes<HTMLLinkElement>["crossOrigin"],
  },
  {
    rel: "preload",
    href: "/images/loading.gif",
    as: "image",
    crossOrigin:
      "anonymous" as LinkHTMLAttributes<HTMLLinkElement>["crossOrigin"],
  },
  {
    rel: "apple-touch-icon",
    sizes: "180x180",
    href: "/images/apple-touch-icon.png",
  },
  {
    rel: "icon",
    type: "image/png",
    sizes: "32x32",
    href: "/images/favicon-32x32.png",
  },
  {
    rel: "icon",
    type: "image/png",
    sizes: "16x16",
    href: "/images/favicon-16x16.png",
  },
  {
    href: "/images/iphone5_splash.png",
    media:
      "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)",
    rel: "apple-touch-startup-image",
  },
  {
    href: "/images/iphone6_splash.png",
    media:
      "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
    rel: "apple-touch-startup-image",
  },
  {
    href: "/images/iphoneplus_splash.png",
    media:
      "(device-width: 621px) and (device-height: 1104px) and (-webkit-device-pixel-ratio: 3)",
    rel: "apple-touch-startup-image",
  },
  {
    href: "/images/iphonex_splash.png",
    media:
      "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
    rel: "apple-touch-startup-image",
  },
  {
    href: "/images/iphonexr_splash.png",
    media:
      "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)",
    rel: "apple-touch-startup-image",
  },
  {
    href: "/images/iphonexsmax_splash.png",
    media:
      "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)",
    rel: "apple-touch-startup-image",
  },
  {
    href: "/images/ipad_splash.png",
    media:
      "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)",
    rel: "apple-touch-startup-image",
  },
  {
    href: "/images/ipadpro1_splash.png",
    media:
      "(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)",
    rel: "apple-touch-startup-image",
  },
  {
    href: "/images/ipadpro3_splash.png",
    media:
      "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)",
    rel: "apple-touch-startup-image",
  },
  {
    href: "/images/ipadpro2_splash.png",
    media:
      "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)",
    rel: "apple-touch-startup-image",
  },
];

export default function Head({ theme }: { theme: Theme }) {
  return (
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content="Gifable" />

      {LINKS.map((link, i) => (
        <link key={i} {...link} />
      ))}
      <Meta />
      <Links />
      <ThemeStyles theme={theme || "system"} />
    </head>
  );
}
