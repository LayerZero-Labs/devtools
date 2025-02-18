import React from "react";
import { Box, Text } from "ink";
import { Config } from "@/types";
import { resolve } from "path";

interface Props {
  value: Config;
}

export const ConfigSummary: React.FC<Props> = ({ value }) => {
  return (
    <Box flexDirection="column" marginTop={1} marginBottom={1}>
      <Text>
        Will create a project in{" "}
        <Text bold>{value.destination || "current"}</Text> directory (
        <Text bold>{resolve(value.destination)}</Text>)
      </Text>
      <Text>
        Will use the <Text bold>{value.example.label}</Text> example
      </Text>
      <Text>
        Will use <Text bold>{value.packageManager.label}</Text> to install
        dependencies
      </Text>
    </Box>
  );
};
