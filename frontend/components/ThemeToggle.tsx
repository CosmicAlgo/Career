"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="relative flex items-center justify-center p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors outline-none focus:ring-2 focus:ring-primary"
      aria-label="Toggle theme"
    >
      <Sun className="h-5 w-5 transition-all dark:-rotate-90 dark:opacity-0" />
      <Moon className="absolute h-5 w-5 rotate-90 opacity-0 transition-all dark:rotate-0 dark:opacity-100" />
    </button>
  );
}
