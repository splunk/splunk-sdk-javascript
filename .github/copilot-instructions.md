# Splunk Enterprise SDK for JavaScript - AI Coding Agent Instructions

This document provides guidance for AI coding agents working on the Splunk Enterprise SDK for JavaScript.

## Architecture Overview

The SDK is designed to be used in both Node.js and browser environments.

- **Core Logic (`lib/`)**: The main SDK logic resides in the `lib/` directory.
  - `lib/context.js`: Manages the connection and authentication with the Splunk server.
  - `lib/service.js`: Provides a high-level API for interacting with Splunk services and endpoints. This is the primary interface for most operations.
  - `lib/http.js`: A low-level HTTP client for making requests to the Splunk REST API.
  - `lib/utils.js`: Contains utility functions used throughout the SDK.

- **Platform-Specific Implementations (`lib/platform/`)**:
  - `lib/platform/node/`: Contains Node.js-specific code.
  - `lib/platform/client/`: Contains browser-specific code.

- **Entry Points (`lib/entries/`)**: These files are used by Browserify to create bundles for different environments.
  - `browser.entry.js`: The main entry point for the browser bundle.

- **UI Components (`lib/ui/`)**: Reusable UI components.
  - `charting.js`: For creating charts.
  - `timeline.js`: For creating timelines.

## Developer Workflow

- **Installation**: To install dependencies, run:

  ```bash
  npm install
  ```

- **Testing**: To run the test suite, use:

  ```bash
  npm test
  ```

  This command executes the tests located in the `tests/` directory using Mocha. The test configuration is in `package.json`.

- **Building**: The project uses a `Makefile` for build tasks. The primary build process uses `browserify` to create browser-compatible bundles from the entry points in `lib/entries/`.

## Key Conventions and Patterns

- **Asynchronous Operations**: The SDK uses Promises for all asynchronous operations. When adding new functionality, prefer `async/await` over callbacks.

- **Error Handling**: Errors from the API are returned as standard JavaScript `Error` objects in the `catch` block of a Promise chain.

- **Modularity**: The SDK is modular. When adding new features, consider if they can be implemented as separate modules.

## Important Files and Directories

- `package.json`: Defines project metadata, dependencies, and scripts.
- `tests/`: Contains all the tests for the SDK.
- `lib/`: The core of the SDK.
- `examples/`: Contains example usage of the SDK.
- `Makefile`: Contains build scripts.
