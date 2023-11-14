import React from "react"
import { render } from "ink"
import { Command } from "commander"
import { Placeholder } from "./components/placeholder.js"

new Command("create-lz-oapp")
    .description("Create LayerZero OApp with one command")
    .action(async () => {
        const { waitUntilExit } = render(<Placeholder />)

        await waitUntilExit()
    })
    .parseAsync()
