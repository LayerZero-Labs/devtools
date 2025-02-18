import React from "react";
import type { OptionOutput } from "@/types";
import { Box, Text } from "ink";

interface OptionOutputProps {
  props: OptionOutput;
}

/**
 * Render the options output to the user.
 * @param {OptionOutputProps} props
 */
export const OutputOptions: React.FC<OptionOutputProps> = ({
  props,
}: OptionOutputProps) => {
  return (
    <Box flexDirection="column">
      {props.warning.map((warning) => (
        <Text color="yellow">
          <Text bold>Warning:</Text> {warning}
        </Text>
      ))}
      <Text>
        <Text bold>Result:</Text> <Text color="green">{props.hex}</Text>
      </Text>
    </Box>
  );
};
