import React, { useEffect } from "react";
import type { Config } from "@/types";
import { Box, Newline, Text } from "ink";
import { cloneExample } from "@/utilities/cloning";
import { Progress } from "./progress";
import { installDependencies } from "@/utilities/installation";
import { useTask } from "@/utilities/tasks";
import { ErrorMessage } from "./error";

interface Props {
  config: Config;
}

export const Setup: React.FC<Props> = ({ config }) => {
  const clone = useTask(() => cloneExample(config));
  const install = useTask(() => installDependencies(config));
  const setup = useTask(async () => {
    await clone.run();
    await install.run();
  });

  useEffect(() => {
    setup.run().catch(() => {});
    // It's important to remember that setup as an object changes references, it's only the run method that's referentially stable
    //
    // Adding setup as dependency of this hook will result in an infinite loop
  }, [setup.run]);

  return (
    <Box flexDirection="column">
      <Progress
        message="Getting example source code"
        state={clone.state}
        error={({ error }) => <ErrorMessage config={config} error={error} />}
      />
      <Progress
        message="Installing dependencies"
        state={install.state}
        error={({ error }) => <ErrorMessage config={config} error={error} />}
      />

      {setup.state?.success ? <NextSteps config={config} /> : null}
    </Box>
  );
};

const NextSteps: React.FC<{ config: Config }> = ({ config }) => {
  // Check if the example is a Move VM example (Aptos or Initia)
  const isMoveVMExample = [
    "oft-aptos-move",
    "oft-adapter-aptos-move",
    "oapp-aptos-move",
    "oft-initia",
    "oft-adapter-initia",
  ].includes(config.example.id);

  console.log(`the example is ${config.example.id}`);

  return (
    <Box flexDirection="column">
      <Text>
        <Text color="green">✔</Text> All done!
      </Text>
      <Box
        margin={1}
        borderStyle="round"
        borderColor="gray"
        flexDirection="column"
      >
        <Text># Navigate to your project</Text>
        <Text color="cyan">cd {config.destination}</Text>
        <Newline />

        {isMoveVMExample ? (
          // Custom instructions for Move VM examples
          <>
            <Text>#</Text>
            <Text># - Follow the steps in the README.md file</Text>
            <Text>#</Text>
            <Newline />
          </>
        ) : (
          // Standard instructions for other examples
          <>
            <Text>#</Text>
            <Text># Follow the steps in hardhat.config.ts:</Text>
            <Text>#</Text>
            <Text># - Create an .env file based on the provided template</Text>
            <Text># - Adjust the contracts to your liking</Text>
            <Text>#</Text>
            <Newline />

            <Text># Deploy your contracts</Text>
            <Text color="cyan">npx hardhat lz:deploy</Text>
          </>
        )}
        {!config.packageManager.hasLockfile ? (
          <>
            <Newline />
            <Text bold>
              🚨 Your project dependencies are not pinned, please verify them.
            </Text>
          </>
        ) : null}
        <Newline />
        <Text bold>
          Visit our docs page at{" "}
          <Text underline color="cyan">
            https://docs.layerzero.network/
          </Text>{" "}
          for more info
        </Text>
      </Box>
    </Box>
  );
};
