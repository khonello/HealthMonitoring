export const Animations = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
  spring: {
    gentle: {
      damping: 18,
      stiffness: 200,
      mass: 1,
    },
    snappy: {
      damping: 14,
      stiffness: 300,
      mass: 0.8,
    },
    bouncy: {
      damping: 10,
      stiffness: 250,
      mass: 1,
    },
  },
} as const;
