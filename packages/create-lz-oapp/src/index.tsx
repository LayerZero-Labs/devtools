import React from "react";
import { render } from "ink";
import { Command } from "commander";
import { promptForConfig } from "@/utilities/prompts";
import { ConfigSummary } from "@/components/config";
import { Setup } from "@/components/setup";
import { promptToContinue } from "@layerzerolabs/io-utils";
import { printLogo } from "@layerzerolabs/io-utils/swag";

new Command("create-lz-oapp")
  .description("Create LayerZero OApp with one command")
  .action(async () => {
    // const exitAltScreen = await altScreen()

    try {
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
    } finally {
      // await exitAltScreen()
    }
  })
  .parseAsync();
