import React from "react";
import { Box, Text } from "ink";
import { OptionType1, OptionConfig, OptionType2 } from "@/types";

interface Props {
  value: OptionConfig;
}

interface OptionType1Props {
  props: OptionType1;
}

interface OptionType2Props extends OptionType1Props {
  props: OptionType2;
}

export const ConfigSummary: React.FC<Props> = ({ value }) => {
  return (
    <Box flexDirection="column" marginTop={1} marginBottom={1}>
      <Text>
        Creating LayerZero options <Text bold>{value.type.label}</Text>
      </Text>
    </Box>
  );
};

export const Option1Summary: React.FC<OptionType1Props> = ({ props }) => {
  return (
    <Box flexDirection="column" marginTop={1} marginBottom={1}>
      <Text>
        Gas Limit: <Text bold>{props.gasLimit}</Text>
      </Text>
    </Box>
  );
};

export const Option2Summary: React.FC<OptionType2Props> = ({ props }) => {
  return (
    <Box flexDirection="column" marginTop={1} marginBottom={1}>
      <Text>
        Gas Limit: <Text bold>{props.gasLimit}</Text>
        Native Drop Amount: <Text bold>{props.nativeDropAmount}</Text>
        Native Drop Address: <Text bold>{props.nativeDropAddress}</Text>
      </Text>
    </Box>
  );
};
