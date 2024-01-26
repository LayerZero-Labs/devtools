import React, { useEffect } from "react";
import type { Config } from "@/types";
import { Box } from "ink";
import { cloneExample } from "@/utilities/cloning";
import { Progress } from "./progress";
import { installDependencies } from "@/utilities/installation";
import { useTask } from "@/utilities/tasks";
import { ErrorMessage } from "./error";

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
