# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a LINE bot reminder application built with Firebase Functions. The bot allows users to set reminders through a conversational interface in Japanese and uses Firebase Firestore to store reminders and user sessions.

## Architecture

- **Firebase Functions v2**: Cloud functions for handling webhook requests and scheduled tasks
- **TypeScript**: Primary language for the source code
- **LINE Bot SDK**: For handling LINE webhook events and messaging
- **Firestore**: Database for storing user sessions and reminders
- **chrono-node**: Advanced date/time parsing library for Japanese text
- **Secret Manager**: Google Cloud Secret Manager for secure environment variable management

### Core Components

- `api.ts`: Main webhook handler (`lineWebhook`) for LINE bot interactions with proper error handling and logging
- `parser.ts`: Date/time parsing logic with chrono-node and fallback regex patterns
- `reminder.ts`: Scheduled function (`checkReminders`) to check and send reminders every minute
- `session.ts`: User session management (idle, waiting_for_task, waiting_for_time states)
- `index.ts`: Exports both `lineWebhook` and `checkReminders` functions

## Development Commands

All commands should be run from the `functions/` directory:

```bash
cd functions
```

### Build and Development
- `npm run build`: Compile TypeScript to JavaScript
- `npm run build:watch`: Watch mode compilation
- `npm run serve`: Build and start local Firebase emulator
- `npm run start`: Build and start Firebase shell

### Testing
- `npm run test`: Run Jest tests
- `npm run test:watch`: Run tests in watch mode
- `npm run test:coverage`: Run tests with coverage report

### Code Quality
- `npm run lint`: Run ESLint on TypeScript files
- `npm run deploy`: Build, lint, and deploy to Firebase

### Deployment
Firebase automatically runs lint and build checks before deployment (configured in firebase.json).

## Bot Flow

1. User sends "リマインド" → Bot asks for task
2. User provides task → Bot asks for time
3. User provides time → Bot parses and stores reminder
4. Scheduled function runs every minute to check and send reminders

## Secret Management

The application uses Google Cloud Secret Manager for secure environment variable management:
- Functions declare required secrets in the `secrets` array parameter
- `lineWebhook` requires: `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`
- `checkReminders` requires: `LINE_CHANNEL_ACCESS_TOKEN`
- Secrets are accessed via `process.env` after declaration

## Time Parsing

The parser supports both chrono-node (primary) and custom regex patterns (fallback):
- Japanese time expressions: 朝 (9:00), 昼 (12:00), 夕方 (18:00), 夜 (21:00)
- Relative times: "1時間後", "30分後"
- Absolute times: "明日9時", "今日15時30分"

## Error Handling and Logging

- Uses Firebase Functions logger for structured logging
- Proper error handling in webhook processing
- HTTP method validation (POST only)
- Comprehensive error messages for debugging

## Database Collections

- `sessions`: User conversation states
- `reminders`: Scheduled reminders with userId, message, and remindAt timestamp

## Key Changes from v1 to v2

- Updated to Firebase Functions v2 with `onRequest` and `onSchedule`
- Added Secret Manager integration for secure environment variables
- Enhanced error handling and logging
- Proper middleware usage for LINE webhook validation
- Changed main entry point from `lib/index.js` to `lib/src/index.js`