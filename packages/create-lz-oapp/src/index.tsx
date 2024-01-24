import React from "react";
import { render } from "ink";
import { Command } from "commander";
import { promptForConfig } from "@/utilities/prompts";
import { ConfigSummary } from "@/components/config";
import { Setup } from "@/components/setup";
import { promptToContinue } from "@layerzerolabs/io-devtools";
import { printLogo } from "@layerzerolabs/io-devtools/swag";

interface Args {
  version?: boolean;
}

new Command("create-lz-oapp")
  .description("Create LayerZero OApp with one command")
  .option("-v,--version", "Output version information", false)
  .action(async ({ version }: Args) => {
    // If the user only asked for a version, we'll print that out and exit
    if (version === true) {
      const pkg = await import("../package.json");

      return console.log(pkg.version);
    }

    printLogo();

    // First we get the config from the user
    const config = await promptForConfig();
    render(<ConfigSummary value={config} />).unmount();

    // Then we confirm we want to do this after showing the user what they have specified
    const continuePlease = await promptToContinue();
    if (!continuePlease) {
      return;
    }

    // Then the last step is to show the setup flow
    const setup = render(<Setup config={config} />);

    // And wait for it to exit
    await setup.waitUntilExit();
  })
  .parseAsync();
