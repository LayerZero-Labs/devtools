import React, { useEffect } from "react";
import type { Config } from "@/types";
import { Box, Text } from "ink";
import {
  BadGitRefError,
  DestinationNotEmptyError,
  DownloadError,
  MissingGitRefError,
  cloneExample,
} from "@/utilities/cloning";
import { Progress } from "./progress";
import { installDependencies } from "@/utilities/installation";
import { useTask } from "@/utilities/tasks";

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
    </Box>
  );
};

interface ErrorMessageProps {
  config: Config;
  error?: unknown;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ config, error }) => {
  if (error == null) return null;

  switch (true) {
    case error instanceof DestinationNotEmptyError:
      return (
        <Text color="red">
          Destination directory <Text bold>{config.destination}</Text> is not
          empty
        </Text>
      );

    case error instanceof BadGitRefError:
      return (
        <Text color="red">
          The example <Text bold>{config.example.label}</Text> has its
          repository URL malformed: '
          <Text bold>{config.example.repository}</Text>' does not look like a
          valid repository
        </Text>
      );

    case error instanceof MissingGitRefError:
      return (
        <Text color="red">
          The example <Text bold>{config.example.label}</Text> does not seem to
          exist in the repository
        </Text>
      );

    case error instanceof DownloadError:
      return (
        <Box flexDirection="column">
          <Text color="red">There was a problem downloading the example</Text>
          <Text>○ Please check your internet connection</Text>
          <Text>
            ○ Please check that the example exists (
            <Text bold>{config.example.repository}</Text>)
          </Text>
        </Box>
      );

    default:
      return (
        <Text color="red">
          An unknown error happened: <Text bold>{String(error)}</Text>
        </Text>
      );
  }
};
