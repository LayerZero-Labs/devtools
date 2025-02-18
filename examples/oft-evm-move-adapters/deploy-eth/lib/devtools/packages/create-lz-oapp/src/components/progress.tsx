import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { TaskState } from "@/utilities/tasks";

type ErrorComponent = React.ComponentType<{ error: unknown }>;

interface Props {
  error: ErrorComponent;
  message: string;
  state: TaskState<unknown> | undefined;
}

export const Progress: React.FC<Props> = ({ state, message, error: Error }) => {
  return (
    <Box flexDirection="column">
      <Box>
        {state?.loading ? (
          <Spinner />
        ) : state?.success ? (
          <Text color="green">✔</Text>
        ) : state?.failure ? (
          <Text color="red">𐄂</Text>
        ) : (
          <Text color="yellow">○</Text>
        )}
        <Text> {message}</Text>
      </Box>

      {state?.failure ? (
        <Box marginLeft={2}>
          <Error error={state.error} />
        </Box>
      ) : null}
    </Box>
  );
};
