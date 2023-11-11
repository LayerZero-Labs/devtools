import React from "react"
import { render } from "ink"
import { Command } from "commander"
import { Logo } from "./components/branding.js"

new Command("create-oapp")
    .description("Create LayerZero OApp with one command")
    .action(async () => {
        const { waitUntilExit } = render(<Logo />)

        await waitUntilExit()
    })
    .parseAsync()
