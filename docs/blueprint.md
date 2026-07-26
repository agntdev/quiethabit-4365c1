# Private Habit Helper — Bot specification

**Archetype:** custom

**Voice:** calm and encouraging — write every user-facing message, button label, error, and empty state in this voice.

A Telegram bot that helps users create and track personalized habits with daily/weekly schedules, gentle reminders, and private analytics. Users can mark habits as done/skipped, snooze reminders, view streaks, and receive weekly recaps with encouraging insights. Milestones and misses are framed supportively without social sharing.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- individual users
- privacy-conscious individuals

## Success criteria

- Users can create and manage habits with custom schedules
- Reminders are delivered at specified local times with snooze functionality
- Check-ins are recorded idempotently with status tracking
- Weekly recaps and milestone notifications are sent with configurable options
- Free tier limits 5 habits while paid tier unlocks unlimited tracking

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open the main menu
- **Add Habit** (button, actor: user, callback: habit:add) — Begin creating a new habit with schedule and reminder configuration
- **Edit Habit** (button, actor: user, callback: habit:edit) — Modify existing habit details like title, schedule, or reminders
- **Mark Day** (button, actor: user, callback: habit:mark_day) — Retroactively log a day's habit status up to 7 days back
- **View Stats** (button, actor: user, callback: stats:view) — Show current streaks, completion rates, and weekly summaries

## Flows

### onboarding_flow
_Trigger:_ /start

1. Display welcome message
2. Prompt for habit title
3. Select schedule type (daily/weekdays/N-times/week)
4. Choose 1-2 reminder times
5. Confirm time zone detection

_Data touched:_ User, Habit

### reminder_flow
_Trigger:_ scheduled_reminder

1. Send action-prompt message with habit title
2. Display Done/Skip/Snooze buttons
3. Handle snooze with 30min delay and single repeat

_Data touched:_ Habit, Occurrence

### weekly_recap_flow
_Trigger:_ every_monday_0800_utc

1. Generate per-habit completion rates
2. Calculate current/longest streaks
3. Send formatted recap with encouraging tip

_Data touched:_ Occurrence, Streaks & stats

### habit_management_flow
_Trigger:_ habit:add

1. Collect habit title
2. Configure schedule type and parameters
3. Set reminder times
4. Save habit with default settings

_Data touched:_ Habit

### retroactive_marking_flow
_Trigger:_ habit:mark_day

1. Request date selection (max 7 days back)
2. Show habit options for that day
3. Record selected status (done/skipped)

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User** _(retention: persistent)_ — Telegram account with private settings
  - fields: telegram_id, time_zone
- **Habit** _(retention: persistent)_ — User-defined habit with scheduling rules
  - fields: title, schedule_type, reminder_times, enabled, snooze_rules
- **Occurrence** _(retention: persistent)_ — Daily status records for habits
  - fields: habit_id, date, status, timestamp
- **Streaks & stats** _(retention: derived)_ — Derived analytics from occurrences
  - fields: current_streak, longest_streak, completion_rate

## Integrations

- **Telegram** (required) — Bot API messaging and notifications
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Disable milestone notifications
- Configure admin chat ID for internal analytics monitoring

## Notifications

- Scheduled reminders with action buttons
- Weekly recap summaries
- Milestone celebrations (7/30/90 days)
- Supportive messages for missed habits

## Permissions & privacy

- All user data is private to their Telegram chat
- No cross-user visibility or social sharing
- Data retention limited to 1-year history with automatic archiving

## Edge cases

- User changes time zone mid-tracking
- Snoozed reminder delivery when user is offline
- Retroactive marking beyond 7-day window (should be denied)

## Required tests

- End-to-end onboarding flow with habit creation
- Reminder snooze behavior with time zone changes
- Idempotent check-in taps don't double-count
- Weekly recap generation with 7-day retroactive edits
- Milestone notifications with optional disabling

## Assumptions

- Time zone detection uses Telegram's API by default
- Payment tier management handled externally
- Streak calculations use 7-day calendar windows
