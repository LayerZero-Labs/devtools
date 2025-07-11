import { Box, Text } from "ink";
import React, { useEffect, useState, useRef } from "react";

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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    const startAnimation = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(() => {
        if (mountedRef.current) {
          setFrameIndex((prev) => (prev + 1) % PENGUIN_FRAMES.length);
        }
      }, 500);
    };

    startAnimation();

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
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
