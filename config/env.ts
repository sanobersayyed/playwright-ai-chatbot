// Central configuration for the U-Ask QA framework.
// All test files import from here instead of hard-coding values.
// Override any value using environment variables before running tests.
//
//   Example (PowerShell):
//     $env:BASE_URL = "https://staging.uask.ae"; npm test
//     $env:API_URL  = "https://api-staging.uask.ae"; npm run test:api

export const ENV = {
  // Browser base URL – the chatbot web app
  BASE_URL: process.env.BASE_URL ?? 'https://uask.ae',

  // Backend API base URL – the chatbot REST API
  API_URL: process.env.API_URL ?? 'https://api.uask.ae',

  // How long to wait for an AI response (ms)
  AI_RESPONSE_TIMEOUT: Number(process.env.AI_RESPONSE_TIMEOUT ?? 35000),
};
