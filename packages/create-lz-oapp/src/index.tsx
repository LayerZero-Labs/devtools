import React from "react";
import { render } from "ink";
import { Command } from "commander";
import { promptForConfig } from "@/utilities/prompts";
import { ConfigSummary } from "@/components/config";
import { Setup } from "@/components/setup";
import {
  LogLevel,
  promptToContinue,
  setDefaultLogLevel,
} from "@layerzerolabs/io-devtools";
import { printLogo } from "@layerzerolabs/io-devtools/swag";
import { version } from "../package.json";
import {
  ciOption,
  createExampleOption,
  createPackageManagerOption,
  destinationOption,
  logLevelOption,
  branchOption,
} from "./options";
import type { Config, Example, PackageManager } from "./types";
import { DefaultErrorMessage } from "./components/error";
import { getExamples } from "./config";

interface Args {
  ci?: boolean;
  destination?: string;
  example?: Example;
  logLevel?: LogLevel;
  packageManager: PackageManager;
  branch?: string;
}

const createCommand = async () => {
  const examples = await getExamples();

  return new Command("create-lz-oapp")
    .description("Create LayerZero OApp with one command")
    .version(version)
    .addOption(ciOption)
    .addOption(destinationOption)
    .addOption(createExampleOption(examples))
    .addOption(logLevelOption)
    .addOption(createPackageManagerOption())
    .addOption(branchOption)
    .addOption(logLevelOption)
    .action(async (args: Args) => {
      printLogo();

      // We'll provide a CI mode - a non-interctaive mode in which all input is taken
      // from the CLI arguments and if something is missing, an error is thrown
      const { ci, logLevel } = args;

      // We'll set a default log level for any loggers created past this point
      setDefaultLogLevel(logLevel ?? "info");

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
    .configureOutput({
      outputError: handleError,
    });
};

createCommand().then((command) => command.parseAsync());

/**
 * Helper utility for pretty printing any erros we might encounter
 *
 * @param {unknown} error
 */
function handleError(error: unknown) {
  if (error instanceof Error) {
    render(<DefaultErrorMessage error={error} />).unmount();
  } else {
    render(<DefaultErrorMessage error={String(error)} />).unmount();
  }
}

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
  branch,
}: Partial<Config>): Config {
  if (destination == null) {
    render(
      <DefaultErrorMessage error="Missing argument: --destination must be specified in CI mode" />,
    ).unmount();

    process.exit(1);
  }

  if (example == null) {
    render(
      <DefaultErrorMessage error="Missing argument: --example must be specified in CI mode" />,
    ).unmount();

    process.exit(1);
  }

  if (packageManager == null) {
    render(
      <DefaultErrorMessage error="Missing argument: --package-manager must be specified in CI mode" />,
    ).unmount();

    process.exit(1);
  }

  return { destination, example, packageManager, branch };
}
