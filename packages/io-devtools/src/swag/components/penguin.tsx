import { Box, Text } from "ink";
import React, { useEffect, useState } from "react";

export interface PenguinSpinnerProps {
  before?: string;
  after?: string;
  title?: string;
}

const PENGUIN_FRAMES = [
  [
    `     /*\\       `,
    `    /* *\\     `,
    `    ('-')    `,
    `   //-=-\\\\   `,
    `   (\\_=_/)   `,
    `    ^^ ^^    `,
  ],
  [
    ` *   /*\\   *   `,
    `    /* *\\     `,
    `    ('v')    `,
    `   //-=-\\\\-  `,
    `   (\\_=_/)   `,
    `  * ^^ ^^ *  `,
  ],
  [
    `   + /*\\ +     `,
    `    /* *\\     `,
    `    ('>')    `,
    `   //-=-\\\\/  `,
    `   (\\_=_/)   `,
    `  + ^^ ^^ +  `,
  ],
  [
    `  *  /*\\       `,
    `    /* *\\     `,
    `    ('^')  *`,
    `   //-=-\\\\/  `,
    `   (\\_=_/)   `,
    ` *  ^^ ^^  +  `,
  ],
  [
    `  +  /*\\       `,
    `    /* *\\   *`,
    `    ('<')  *`,
    `   //-=-\\\\/  `,
    `   (\\_=_/)   `,
    ` +  ^^ ^^  *  `,
  ],
  [
    `  *  /*\\     *`,
    `    /* *\\   *`,
    `    ('v')  *`,
    `   //-=-\\\\/  `,
    `   (\\_=_/)   `,
    ` *  ^^ ^^  +  `,
  ],
  [
    ` o*  /*\\     *`,
    `    /* *\\   *`,
    `    ('o')  *`,
    `   //-=-\\\\-  `,
    `   (\\_=_/)   `,
    `  + ^^ ^^ +  `,
  ],
];

export const PenguinSpinner: React.FC<PenguinSpinnerProps> = ({
  before = "",
  after = "",
  title = "Sending Transactions",
}) => {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % PENGUIN_FRAMES.length);
    }, 500);
    return () => clearInterval(id);
  }, []);

  const currentFrame = PENGUIN_FRAMES[frameIndex] || PENGUIN_FRAMES[0]!;

  return (
    <Box flexDirection="column">
      <Text bold>
        {before}
        {title}
        {after}
      </Text>
      <Box flexDirection="column" marginTop={1} marginBottom={1}>
        {currentFrame.map((line, index) => (
          <Text key={index}>{line}</Text>
        ))}
      </Box>
    </Box>
  );
};
