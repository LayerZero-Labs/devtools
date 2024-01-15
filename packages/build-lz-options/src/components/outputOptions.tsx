import { makeBytes32 } from "@layerzerolabs/devtools-evm";
import React, { useEffect } from "react";
import type { OptionType1, OptionType2, OptionType3 } from "@/types";
import { Box } from "ink";
import { useTask } from "@/utilities/tasks";
import { optionsType1, optionsType2 } from "@layerzerolabs/lz-utility-v2";

interface Props {
  props: OptionType1;
}

export const outputOptionsType1 = async (gasLimit: OptionType1) => {
  console.log(optionsType1(gasLimit.gasLimit));
};

export const OutputOptionsType1: React.FC<Props> = ({ props }) => {
  const output = useTask(() => outputOptionsType1(props));

  useEffect(() => {
    output.run().catch(() => {});
  }, [output.run]);

  return <Box flexDirection="column"></Box>;
};

interface OptionsType2Props {
  props: OptionType2;
}

const outputOptionsType2 = async (options: OptionType2) => {
  console.log(
    optionsType2(
      options.gasLimit,
      options.nativeDropAmount,
      makeBytes32(options.nativeDropAddress),
    ),
  );
};

export const OutputOptionsType2: React.FC<OptionsType2Props> = ({ props }) => {
  const output = useTask(() => outputOptionsType2(props));

  useEffect(() => {
    output.run().catch(() => {});
  }, [output.run]);

  return <Box flexDirection="column"></Box>;
};

interface OptionsType3Props {
  props: OptionType3;
}

const outputOptionsType3 = async (options: OptionType3) => {
  console.log(options.output);
};

export const OutputOptionsType3: React.FC<OptionsType3Props> = ({ props }) => {
  const output = useTask(() => outputOptionsType3(props));

  useEffect(() => {
    output.run().catch(() => {});
  }, [output.run]);

  return <Box flexDirection="column"></Box>;
};
