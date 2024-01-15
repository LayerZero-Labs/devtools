import React from "react";
import { render } from "ink";
import { Command } from "commander";
import {
  promptForOptionType,
  promptForOptionType1,
  promptForOptionType2,
  promptForOptionType3,
} from "@/utilities/prompts";
import {
  ConfigSummary,
  Option1Summary,
  Option2Summary,
} from "@/components/config";
import {
  OutputOptionsType1,
  OutputOptionsType2,
  OutputOptionsType3,
} from "@/components/outputOptions";
import { printLogo } from "@layerzerolabs/io-devtools/swag";

new Command("build-lz-options")
  .description("Create LayerZero OApp options with one command")
  .action(async () => {
    printLogo();

    // First we get the config from the user
    const config = await promptForOptionType();
    render(<ConfigSummary value={config} />).unmount();

    switch (config.type.id) {
      case "1": {
        const options = await promptForOptionType1();
        render(
          <Option1Summary
            props={{
              gasLimit: options.gasLimit,
            }}
          />,
        ).unmount();
        render(
          <OutputOptionsType1
            props={{
              gasLimit: options.gasLimit,
            }}
          />,
        );
        break;
      }
      case "2": {
        const options = await promptForOptionType2();
        render(
          <Option2Summary
            props={{
              gasLimit: options.gasLimit,
              nativeDropAmount: options.nativeDropAmount,
              nativeDropAddress: options.nativeDropAddress,
            }}
          />,
        ).unmount();
        render(
          <OutputOptionsType2
            props={{
              gasLimit: options.gasLimit,
              nativeDropAmount: options.nativeDropAmount,
              nativeDropAddress: options.nativeDropAddress,
            }}
          />,
        );
        break;
      }
      case "3": {
        const options = await promptForOptionType3();
        render(
          <OutputOptionsType3
            props={{
              output: options.toHex(),
            }}
          />,
        );
      }
    }
  })
  .parseAsync();
