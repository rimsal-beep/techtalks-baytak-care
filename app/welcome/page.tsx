import type { Metadata } from "next";
import { Geist_Mono, Instrument_Sans, Instrument_Serif } from "next/font/google";
import Landing from "./components/Landing";
import "./landing.css";

// Fonts are exposed as CSS variables that landing.css picks up (--bcl-sans / --bcl-serif / --bcl-mono).
const sans = Instrument_Sans({ subsets: ["latin"], style: ["normal", "italic"], variable: "--bcl-sans", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--bcl-serif", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--bcl-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Baytak Care — your home, cared for from anywhere",
  description:
    "One simple place to monitor, maintain and stay connected to your property in Lebanon, even when you're miles away.",
};

export default function WelcomePage() {
  return <Landing fontClassName={`${sans.variable} ${serif.variable} ${mono.variable}`} />;
}