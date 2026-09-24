"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { PaletteProvider } from "@/components/palette-provider"

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <PaletteProvider>{children}</PaletteProvider>
    </NextThemesProvider>
  )
}
