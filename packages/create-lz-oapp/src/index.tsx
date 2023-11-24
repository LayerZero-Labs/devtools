import React from "react";
import { render } from "ink";
import { Command } from "commander";
import { promptForConfig, promptForContinue } from "@/utilities/prompts.js";
import { Header } from "@/components/branding.js";
import { ConfigSummary } from "@/components/config.js";
import { Setup } from "@/components/setup.js";
import { Providers } from "@/components/providers.js";

new Command("create-lz-oapp")
  .description("Create LayerZero OApp with one command")
  .action(async () => {
    // const exitAltScreen = await altScreen()

    try {
      render(<Header />).unmount();

      // First we get the config from the user
      const config = await promptForConfig();
      render(<ConfigSummary value={config} />).unmount();

      // Then we confirm we want to do this after showing the user what they have specified
      const continuePlease = await promptForContinue();
      if (!continuePlease) {
        return;
      }

      // Then the last step is to show the setup flow
      const setup = render(
        <Providers>
          <Setup config={config} />
        </Providers>,
      );

      // And wait for it to exit
      await setup.waitUntilExit();
    } finally {
      // await exitAltScreen()
    }
  })
  .parseAsync();
