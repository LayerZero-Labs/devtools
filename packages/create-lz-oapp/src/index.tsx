import React from "react";
import { render } from "ink";
import { Command } from "commander";
import { promptForConfig } from "@/utilities/prompts";
import { ConfigSummary } from "@/components/config";
import { Setup } from "@/components/setup";
import { promptToContinue } from "@layerzerolabs/io-devtools";
import { printLogo } from "@layerzerolabs/io-devtools/swag";
import { version } from "../package.json";
import {
  ciOption,
  destinationOption,
  exampleOption,
  packageManagerOption,
} from "./options";
import type { Config, Example, PackageManager } from "./types";
import { DefaultErrorMessage } from "./components/error";

interface Args {
  ci?: boolean;
  destination?: string;
  example?: Example;
  packageManager: PackageManager;
}

new Command("create-lz-oapp")
  .description("Create LayerZero OApp with one command")
  .version(version)
  .addOption(ciOption)
  .addOption(destinationOption)
  .addOption(exampleOption)
  .addOption(packageManagerOption)
  .action(async (args: Args) => {
    printLogo();

    // We'll provide a CI mode - a non-interctaive mode in which all input is taken
    // from the CLI arguments and if something is missing, an error is thrown
    const { ci } = args;

    // First we get the config
    const config = ci
      ? // In CI mode, we'll validate what we got from the arguments
        ensureConfigForCIMode(args)
      : // In interactive mode we'll ask for the config, using the arguments as defaults
        await promptForConfig(args);
    render(<ConfigSummary value={config} />).unmount();

    // Then we confirm with the user
    const continuePlease = ci
      ? // In CI mode we continue automatically, no questions asked
        true
      : // In interactive mode we'll confirm with the user
        await promptToContinue();
    if (!continuePlease) {
      return;
    }

    // Then the last step is to show the setup flow
    const setup = render(<Setup config={config} />);

    // And wait for it to exit
    await setup.waitUntilExit();
  })
  .parseAsync();

/**
 * Helper utility that will ensure that all the required CLI arguments
 * are present in CI mode
 *
 * @param {Partial<Config>} config Config coming from the CLI arguments
 * @returns {Config} config
 */
function ensureConfigForCIMode({
  destination,
  example,
  packageManager,
}: Partial<Config>): Config {
  if (destination == null) {
    render(
      <DefaultErrorMessage error="Destination must be specified in CI mode" />,
    ).unmount();

    process.exit(1);
  }

  if (example == null) {
    render(
      <DefaultErrorMessage error="Example must be specified in CI mode" />,
    ).unmount();

    process.exit(1);
  }

  if (packageManager == null) {
    render(
      <DefaultErrorMessage error="Package manager must be specified in CI mode" />,
    ).unmount();

    process.exit(1);
  }

  return { destination, example, packageManager };
}
