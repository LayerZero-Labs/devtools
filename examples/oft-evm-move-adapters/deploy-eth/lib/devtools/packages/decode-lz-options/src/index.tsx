import { Options } from "@layerzerolabs/lz-v2-utilities";
import React from "react";
import { render } from "ink";
import { Command } from "commander";
import { promptForRawOptions } from "@/utilities/prompts";
import { printLogo } from "@layerzerolabs/io-devtools/swag";
import { version } from "../package.json";
import { OutputError, OutputOptions } from "@/components/outputOptions";

new Command("decode-lz-options")
  .description("Decode Options for LayerZero OApps")
  .version(version)
  .action(async () => {
    printLogo();

    const rawOptions = await promptForRawOptions();
    try {
      const ops = Options.fromOptions(rawOptions.options);
      const composeOptions = ops.decodeExecutorComposeOption();
      const nativeDropOptions = ops.decodeExecutorNativeDropOption();
      const lzReceiveOption = ops.decodeExecutorLzReceiveOption();
      const orderedOption = ops.decodeExecutorOrderedExecutionOption();
      const config = {
        composeOptions,
        nativeDropOptions,
        lzReceiveOption,
        orderedOption,
      };

      render(<OutputOptions config={config} />);
    } catch (e) {
      render(
        <OutputError
          props={{
            error:
              (e as { [key: string]: unknown })?.reason ??
              "Fatal parsing error",
          }}
        />,
      );
    }
  })
  .parseAsync();
