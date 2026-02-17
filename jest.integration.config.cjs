/** @type {import("jest").Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/integration"],
  testMatch: ["**/__tests__/**/*.test.(ts|tsx)"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.jest.json",
      },
    ],
  },
  clearMocks: true,
  testTimeout: 5 * 60 * 1000,
};
