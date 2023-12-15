import React, { useEffect } from "react";
import type { Config } from "@/types";
import { Box, Text } from "ink";
import { useMutation } from "@tanstack/react-query";
import {
  BadGitRefError,
  DestinationNotEmptyError,
  DownloadError,
  MissingGitRefError,
  cloneExample,
} from "@/utilities/cloning";
import { Progress } from "./progress";
import { installDependencies } from "@/utilities/installation";

interface Props {
  config: Config;
}

export const Setup: React.FC<Props> = ({ config }) => {
  const clone = useMutation({
    mutationKey: ["setup", "clone"],
    mutationFn: () => cloneExample(config),
  });

  const install = useMutation({
    mutationKey: ["setup", "install"],
    mutationFn: () => installDependencies(config),
  });

  const { mutate: setup } = useMutation({
    mutationKey: ["setup", "flow"],
    mutationFn: async () => {
      await clone.mutateAsync();
      await install.mutateAsync();
    },
  });

  useEffect(() => setup(), [setup]);

  return (
    <Box flexDirection="column">
      <Progress
        message="Getting example source code"
        mutation={clone}
        error={({ error }) => <ErrorMessage config={config} error={error} />}
      />
      <Progress
        message="Installing dependencies"
        mutation={install}
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
