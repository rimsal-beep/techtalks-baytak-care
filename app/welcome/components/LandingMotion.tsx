"use client";

import { useEffect } from "react";
import { initLandingMotion } from "../motion";

/**
 * Renders nothing. After the page has loaded it switches on the scroll / reveal / pointer
 * effects defined in motion.ts. Everything on the page is still plain server-rendered markup.
 */
export default function LandingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".bcl");
    if (!root) return;
    return initLandingMotion(root);
  }, []);
  return null;
}