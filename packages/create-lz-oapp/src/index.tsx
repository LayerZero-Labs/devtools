import React from "react"
import { render } from "ink"
import { Command } from "commander"
import { Placeholder } from "./components/placeholder.js"
import { altScreen } from "@/utilities/terminal.js"

new Command("create-lz-oapp")
    .description("Create LayerZero OApp with one command")
    .action(async () => {
        const exitAltScreen = await altScreen()

        try {
            const { waitUntilExit } = render(<Placeholder />)
            await waitUntilExit()
        } finally {
            await exitAltScreen()
        }
    })
    .parseAsync()
