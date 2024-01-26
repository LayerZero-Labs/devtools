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
      <Text>
        Result: <Text color={"green"}>{props.hex}</Text>
      </Text>
    </Box>
  );
};
