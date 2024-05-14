import React from "react";
import { Box, Text } from "ink";
import { printJson } from "@layerzerolabs/io-devtools";
import {
  ComposeOption,
  ExecutorLzReceiveOption,
  ExecutorNativeDropOption,
} from "@layerzerolabs/lz-v2-utilities";

type OutputOptionsType = {
  composeOptions: ComposeOption;
  nativeDropOptions: ExecutorNativeDropOption;
  lzReceiveOption: ExecutorLzReceiveOption | undefined;
  orderedOption: boolean;
};

export const OutputOptions: React.FC<{ config: OutputOptionsType }> = ({
  config,
}) => {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Result:</Text>
      <Text color="green">{printJson(config)}</Text>
    </Box>
  );
};

export const OutputError: React.FC<{ props }> = ({ props }) => {
  const error = props.error;
  return (
    <Box flexDirection={"column"}>
      <Text>
        <Text bold>Error: </Text>
        <Text color="red">{error}</Text>
      </Text>
    </Box>
  );
};
