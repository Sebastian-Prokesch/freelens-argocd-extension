/** @type {import("jest").Config} */
module.exports = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.(ts|tsx)"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.jest.json",
      },
    ],
  },
  moduleNameMapper: {
    "^@freelensapp/extensions$": "<rootDir>/__mocks__/@freelensapp/extensions.tsx",
    // CSS modules
    "\\.module\\.(css|scss)$": "identity-obj-proxy",
    // `import stylesInline from \"./file.scss?inline\"`
    "^(.*)\\?inline$": "<rootDir>/src/test/styleInlineMock.cjs",
    // other styles
    "\\.(css|scss)$": "<rootDir>/src/test/styleMock.cjs",
    // static assets
    "\\.(svg|png|jpg|jpeg|gif|webp)$": "<rootDir>/src/test/fileMock.cjs",
  },
  setupFilesAfterEnv: ["<rootDir>/src/test/jest.setup.ts"],
  clearMocks: true,
};

