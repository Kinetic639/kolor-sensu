import { reactConfig } from "@repo/config/eslint/react";

export default [...reactConfig, { ignores: ["storybook-static/**"] }];
