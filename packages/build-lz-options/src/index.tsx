import { makeBytes32 } from "@layerzerolabs/devtools";
import { optionsType1, optionsType2 } from "@layerzerolabs/lz-v2-utilities";
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
import { OutputOptions } from "@/components/outputOptions";
import { printLogo } from "@layerzerolabs/io-devtools/swag";
import { version } from "../package.json";

new Command("build-lz-options")
  .description("Build Options for LayerZero OApps")
  .version(version)
  .action(async () => {
    printLogo();

    const config = await promptForOptionType();
    render(<ConfigSummary value={config} />).unmount();

    let output: string = "";

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
        output = optionsType1(options.gasLimit);
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
        output = optionsType2(
          options.gasLimit,
          options.nativeDropAmount,
          makeBytes32(options.nativeDropAddress),
        );
        break;
      }
      case "3": {
        const options = await promptForOptionType3();
        output = options.toHex();
        break;
      }
    }
    render(<OutputOptions props={{ hex: output }} />);
  })
  .parseAsync();
