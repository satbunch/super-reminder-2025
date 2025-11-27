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
- `npm test -- parser.basic.test.ts`: Run a specific test file

### Code Quality
- `npm run lint`: Run ESLint on TypeScript files
- `npm run deploy`: Build, lint, and deploy to Firebase

### Deployment

Firebase automatically runs lint and build checks before deployment (configured in firebase.json).

**Manual deployment to specific environment:**
```bash
# Development environment
firebase deploy --only functions --project dev

# Production environment
firebase deploy --only functions --project prod
```

**View function logs:**
```bash
npm run logs
```

**Firebase project setup:**
The project is configured with two environments (dev and prod) via `.firebaserc`. Switch projects using:
```bash
firebase use dev
firebase use prod
```

## User Conversation State Machine

The bot manages user state through a state machine with three states defined in `session.ts`:

1. **idle**: Default state when no reminder is being set
2. **waiting_for_task**: User has triggered reminder mode, waiting for the task description
3. **waiting_for_time**: User has provided a task, waiting for the desired reminder time

### State Transitions in `api.ts`

- **idle → waiting_for_task**: User sends "リマインド" or selects "askReminder" postback action
- **waiting_for_task → waiting_for_time**: User sends task text (stored in `session.task`)
- **waiting_for_time → idle**: User sends valid time → reminder saved and session cleared
- **Any state → idle**: User sends "キャンセル" → cancels reminder and clears session

The session is stored in Firestore with `createdAt` timestamp for potential cleanup strategies.

## Reminder Flow in Detail

1. User sends "リマインド" or selects "リマインド一覧" (view reminders)
2. Bot transitions to `waiting_for_task`, prompts for reminder content
3. User provides task text
4. Bot transitions to `waiting_for_time`, echoes task and prompts for time
5. User provides time expression (supports multiple formats)
6. `parseReminderMessage()` parses the time input:
   - First attempts chrono-node (primary, handles complex Japanese expressions)
   - Falls back to regex patterns if chrono-node fails
7. Valid reminder is stored in Firestore with UTC-normalized `remindAt` timestamp
8. Session is cleared, user receives confirmation with formatted reminder time (JST)
9. Every minute, `checkReminders` (scheduled function) queries reminders where `remindAt <= now`
10. Matching reminders are sent via pushMessage and deleted from Firestore

## Time Parsing (`parser.ts`)

The parser supports multiple time input formats with dual-strategy approach:

### chrono-node Strategy (Primary)
- Handles complex Japanese expressions: "来週の金曜日の午後3時", "3日後の夜", etc.
- Preprocesses common time words: 朝→9:00, 昼→12:00, 夕方→18:00, 夜→21:00, 深夜→23:00
- Uses `forwardDate: true` to resolve ambiguous times to future dates

### Regex Fallback Strategy
- 相対表現: "1時間後", "30分後"
- 明日の時刻: "明日9時", "明日15時30分"
- 今日の時刻: "今日の朝", "今日15時30分" (auto-forwards to tomorrow if time has passed)
- 時刻のみ: "9時", "15時30分" (auto-forwards to tomorrow if time has passed)
- 時刻のみ（時間と分）: "9時30分"

### Timezone Handling
⚠️ **Important timezone behavior**:
- Firebase Cloud Functions run in UTC
- chrono-node parses assuming local timezone (not UTC)
- The code corrects this by subtracting 9 hours from chrono-node result to get proper UTC value
- Stored `remindAt` is in UTC; display converts back to JST for user confirmation
- This ensures reminders trigger at the correct user-intended time despite UTC execution environment

## Secret Management

The application uses Google Cloud Secret Manager for secure environment variable management:
- Functions declare required secrets in the `secrets` array parameter
- `lineWebhook` requires: `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`
- `checkReminders` requires: `LINE_CHANNEL_ACCESS_TOKEN`
- Secrets are accessed via `process.env` after declaration

## Error Handling and Logging

- Uses Firebase Functions logger for structured logging
- Proper error handling in webhook processing
- HTTP method validation (POST only)
- Parser includes debug logging for timezone conversions (helpful for troubleshooting time parsing issues)
- Comprehensive error messages for debugging

## Database Collections

- `sessions`: User conversation states
  - Indexed by userId
  - Fields: `status` (idle|waiting_for_task|waiting_for_time), `task` (optional), `createdAt`
- `reminders`: Scheduled reminders
  - Indexed by userId and remindAt for efficient querying
  - Fields: `userId`, `message`, `remindAt` (Firestore Timestamp in UTC)

## LINE Bot Postback Actions

The bot supports postback actions (buttons) in Flex messages:
- `action=askReminder`: Starts the reminder flow (same as "リマインド" text)
- `action=deleteReminder&id={docId}`: Deletes a specific reminder by document ID

Postback handlers are in `api.ts` lines 48-84.

## Testing Strategy

Test files are in `__tests__/` directory:
- `parser.basic.test.ts`: Core parser functionality tests
- `parser.simple.test.ts`: Simple/edge case parser tests

Tests focus on time parsing since it's the most complex logic. Run tests before committing changes to parser.

## Key Changes from v1 to v2

- Updated to Firebase Functions v2 with `onRequest` and `onSchedule`
- Added Secret Manager integration for secure environment variables
- Enhanced error handling and logging
- Proper middleware usage for LINE webhook validation
- Changed main entry point from `lib/index.js` to `lib/src/index.js`