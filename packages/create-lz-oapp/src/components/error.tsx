import React from "react";
import type { Config } from "@/types";
import { Box, Newline, Text } from "ink";
import {
  BadGitRefError,
  DestinationNotEmptyError,
  DownloadError,
  MissingGitRefError,
} from "@/utilities/cloning";
import { InstallationError } from "@/utilities/installation";

interface ErrorMessageProps {
  config: Config;
  error?: unknown;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  config,
  error,
}) => {
  if (error == null) {
    return null;
  }

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

    case error instanceof InstallationError:
      return (
        <Box flexDirection="column">
          <Text color="red">
            There was a problem installing NPM dependencies:
          </Text>

          <Box margin={1} borderStyle="round" borderColor="gray">
            <Text>{error.stdout}</Text>
          </Box>

          <Text bold>To try again:</Text>

          <Box
            margin={1}
            borderStyle="round"
            borderColor="gray"
            flexDirection="column"
          >
            <Text># Navigate to your project</Text>
            <Text color="cyan">cd {config.destination}</Text>
            <Newline />
            <Text># Reattempt the installation</Text>
            <Text color="cyan">
              {config.packageManager.executable}{" "}
              {config.packageManager.args.join(" ")}
            </Text>
          </Box>
        </Box>
      );

    case error instanceof Error:
      return <DefaultErrorMessage error={error} />;

    default:
      return <DefaultErrorMessage error={String(error)} />;
  }
};

export const DefaultErrorMessage: React.FC<{ error: Error | string }> = ({
  error,
}) => {
  return (
    <Text color="red">
      <Text bold>{String(error)}</Text>
    </Text>
  );
};
