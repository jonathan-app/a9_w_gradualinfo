"use client";

import { useEffect, useRef, useState } from "react";
import siteMetadata from "@/src/utils/siteMetaData";

const preferDarkQuery = "(prefers-color-scheme: dark)";
const storageKey = "theme";

const toggleTheme = (theme) => {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  window.localStorage.setItem(storageKey, theme);
};

const getUserPreference = () => {
  const userPref = window.localStorage.getItem(storageKey);
  if (userPref === "dark" || userPref === "light") {
    return userPref;
  }
  if (siteMetadata.theme === "system") {
    return window.matchMedia(preferDarkQuery).matches ? "dark" : "light";
  }
  return siteMetadata.theme;
};

export function useThemeSwitch() {
  // Must match the pre-paint script in the root layout, otherwise the server
  // markup and the first client render disagree on the toggle icon.
  const [mode, setMode] = useState(siteMetadata.theme === "dark" ? "dark" : "light");

  useEffect(() => {
    const mediaQuery = window.matchMedia(preferDarkQuery);
    const handleChange = () => {
      const newMode = getUserPreference();
      setMode(newMode);
      toggleTheme(newMode);
    };

    handleChange();

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  // The mount effect above already applied the stored preference; re-applying the
  // initial state here would briefly flash the wrong theme before it corrects.
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    toggleTheme(mode);
  }, [mode]);

  return [mode, setMode];
}