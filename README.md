# KoeJLPT - Voice-First JLPT Preparation

A Next.js application for Japanese Language Proficiency Test (JLPT) preparation that combines level-based vocabulary study, AI-powered voice conversations, and pronunciation grading — all tailored to the learner's target JLPT level (N5–N1).

**Tech Stack:** Next.js 16 (App Router) | React 19 | TypeScript | Tailwind CSS v4 | PostgreSQL (Neon) | Prisma v6

---

## Features

### Dashboard
- Personalized greeting with current JLPT level
- Quick-action cards linking to vocabulary, pronunciation, conversation, and difficult words review
- Statistics overview: total sessions, saved words, pronunciation attempts, conversation count, study streak
- Recent activity feed across all study modes

### Vocabulary Study
- Browse JLPT-curated word lists by level (N5–N1) with pagination
- Search vocabulary across all levels by keyword
- Listen to native pronunciation via ElevenLabs TTS
- Save words to a personal collection with status tracking: SAVED → STUDYING → DIFFICULT → MASTERED
- Track study count and last-studied date per word

### Voice Conversation
- Real-time voice conversation with an AI partner powered by ElevenLabs Conversational AI (WebRTC)
- 15 level-appropriate conversation topics (self-introduction, shopping, travel, work, current events, etc.)
- Agent speaks entirely in Japanese, adapted to the user's JLPT level
- Live transcript with Japanese/English separation — English translations are hidden by default and togglable
- Play English translations via TTS for listening practice
- Post-call transcript review screen persists after the call ends
- Full conversation transcripts saved to database for future review in History
- Dynamic system prompts instruct the agent to lead conversations, correct mistakes, and always ask follow-up questions

### Pronunciation Practice
- Three study modes: **Words** (random JLPT vocabulary), **Phrases** (level-appropriate example sentences), **Difficult** (user's marked-difficult words)
- Listen to reference pronunciation via TTS before recording
- Record voice via browser microphone (WebM/Opus, 48kHz)
- Automatic grading via Google Cloud Speech-to-Text: audio is transcribed and compared against expected text using character-level Levenshtein distance
- Score 0–100 with status thresholds: COMPLETED (80+), IMPROVED (50–79), NEEDS_RETRY (<50)
- Retry or skip to next word, with running scoreboard

### Study History
- Three tabs: **Vocabulary** (saved words with status), **Conversations** (session list), **Pronunciation** (attempt records)
- Click any conversation to open a full transcript detail view with English translation toggle and TTS playback
- All history data persisted across sessions

### Settings
- Select target JLPT level (N5–N1)
- Configure daily word goal, TTS voice speed, romaji display, and auto-play audio
- View profile info synced from Clerk

### Onboarding
- First-time user flow to select target JLPT level with descriptions and study-hour estimates
- Stores preference and redirects to dashboard

### Landing Page
- Public splash page with feature overview, JLPT level badges, and sign-in/sign-up
- "What is the JLPT?" modal explaining all five levels and the test structure
- Authenticated users auto-redirect to dashboard

---

## External APIs & Integrations

### 1. Clerk Authentication

**Purpose:** User authentication, session management, and route protection.

- **Middleware** (`src/middleware.ts`) protects all `/dashboard`, `/vocab`, `/conversation`, `/pronunciation`, `/history`, `/settings`, `/onboarding`, and `/api/*` routes
- **Server components** use `auth()` and `currentUser()` to fetch the authenticated user and link them to an internal `UserProfile` record via `clerkId`
- **API routes** call `requireUserProfile()` to verify authentication before processing
- **Frontend** uses `<ClerkProvider>`, `<SignIn>`, and `<SignUp>` components for the auth UI
- User avatar images loaded from `img.clerk.com` (configured in `next.config.ts`)

**Package:** `@clerk/nextjs` v7

---

### 2. ElevenLabs (Text-to-Speech & Voice Agent)

**Purpose:** Japanese speech synthesis for audio playback across all pages, and real-time AI voice conversation partner.

#### Text-to-Speech (TTS)

- Library at `src/lib/elevenlabs.ts` wraps the ElevenLabs REST API
- `generateSpeech()` sends Japanese text to the TTS endpoint, wrapping it in `<lang xml:lang="ja-JP">` tags for correct pronunciation
- API route at `POST /api/elevenlabs/tts` exposes this to the client
- Used on **Vocabulary** (listen to words), **Pronunciation** (hear reference audio), **Conversation** (play English translations), and **History** (replay translations from past conversations)

**Configuration:**
- Voice: Sarah (`EXAVITQu4vr4xnSDxMaL`) — multilingual
- Model: `eleven_flash_v2_5`
- Voice settings: stability 0.5, similarity_boost 0.75, configurable speed

#### Voice Agent (Real-Time Conversation)

- `src/components/conversation/voice-agent.tsx` uses the `@elevenlabs/react` SDK to open a WebRTC connection to an ElevenLabs Conversational AI agent
- On session start, the agent receives a dynamic system prompt (built by `buildAgentContext()`) tailored to the user's JLPT level and chosen topic
- The agent introduces itself in Japanese, leads the conversation, corrects mistakes, and always ends with a follow-up question
- English translations are appended in parentheses for the text transcript only (not spoken aloud)
- Transcript entries are persisted to the database via `POST /api/conversation/message`
- Connection lifecycle managed with state machine: idle → connecting → connected → disconnecting
- For private agents, a signed URL is fetched server-side from `GET /api/elevenlabs/signed-url`

**Packages:** `@elevenlabs/react` v0.14, `@elevenlabs/client` v0.15

---

### 3. Google Cloud Speech-to-Text

**Purpose:** Automatic pronunciation grading — transcribes user-recorded audio and compares it against the expected Japanese text.

- Library at `src/lib/google-stt.ts` initializes a Google Cloud `SpeechClient` using base64-decoded service account credentials
- `transcribeAudio()` sends a WebM/Opus audio buffer to Google's `recognize` endpoint configured for Japanese (`ja-JP`) at 48kHz
- `gradeTranscription()` normalizes both expected and transcribed text (strips punctuation/spaces), then computes a 0–100 similarity score using character-level Levenshtein distance
- Scoring thresholds: >= 80% = COMPLETED, 50–79% = IMPROVED, < 50% = NEEDS_RETRY
- API route at `POST /api/pronunciation/grade` accepts `FormData` with `audio` (WebM) and `expected` (text), returns `{ transcribed, score, status }`

**Package:** `@google-cloud/speech` v7

---

### 4. JLPT Vocabulary API

**Purpose:** Curated JLPT vocabulary word lists organized by level (N5–N1).

- Library at `src/lib/jlpt-api.ts` wraps the external API:
  - `fetchVocabByLevel(level, { offset, limit })` — paginated word list
  - `searchVocab(query)` — keyword search across all levels
  - `fetchRandomWords(level, count)` — random subset for pronunciation practice
- Responses normalized to handle field name variations (`word`/`japanese`, `meaning`/`english`, `furigana`/`reading`)
- Used on **Vocabulary** (browse/save), **Pronunciation** (load practice words), and **Dashboard**
- Cached with Next.js ISR revalidation of 1 hour

**Endpoints:**
```
GET https://jlpt-vocab-api.vercel.app/api/words?level={1-5}&offset={n}&limit={n}
GET https://jlpt-vocab-api.vercel.app/api/words?keyword={query}
```

---

### 5. Prisma + PostgreSQL (Neon)

**Purpose:** Application database for user data, saved vocabulary, study sessions, pronunciation attempts, and conversation history.

- Prisma client singleton at `src/lib/db.ts` (global instance to survive hot reloads in development)
- Schema at `prisma/schema.prisma` defines 7 models with full cascade delete from `UserProfile`

**Database models:**

| Model | Purpose |
|---|---|
| `UserProfile` | Links Clerk auth to app data (email, name, image) |
| `UserPreferences` | Per-user settings (JLPT level, daily goal, voice speed, romaji toggle) |
| `SavedVocabulary` | Words saved by the user with status tracking (SAVED → STUDYING → DIFFICULT → MASTERED) |
| `StudySession` | Tracks vocabulary, pronunciation, and conversation practice sessions |
| `PronunciationAttempt` | Individual word pronunciation records with attempt count and status |
| `ConversationSession` | Conversation practice metadata (topic, mode, message count, duration) |
| `ConversationMessage` | Individual messages within a conversation (user/assistant/system) |

**Package:** `@prisma/client` v6, `prisma` v6

---

## API Routes

| Route | Methods | External Service | Purpose |
|---|---|---|---|
| `/api/vocab` | GET, POST, PATCH, DELETE | Prisma | Manage saved vocabulary |
| `/api/sessions` | GET, POST, PATCH | Prisma | Manage study sessions |
| `/api/sessions/stats` | GET | Prisma | Dashboard statistics (totals, streak) |
| `/api/sessions/preferences` | GET, POST | Prisma | User preferences (JLPT level, goals) |
| `/api/pronunciation` | GET, POST, PATCH | Prisma | Pronunciation attempt records |
| `/api/pronunciation/grade` | POST | Google Cloud STT | Grade recorded audio against expected text |
| `/api/conversation` | GET, POST, PATCH | Prisma | Conversation session management |
| `/api/conversation/message` | POST | Prisma | Save conversation messages |
| `/api/elevenlabs/tts` | POST | ElevenLabs | Generate Japanese speech audio |
| `/api/elevenlabs/signed-url` | GET | ElevenLabs | Get WebRTC signed URL for voice agent |

All routes require Clerk authentication.

---

## Data Flow

### Vocabulary Study
1. User selects JLPT level → words fetched from **JLPT Vocab API**
2. User clicks listen → audio generated by **ElevenLabs TTS**
3. User saves word → stored in **PostgreSQL** via Prisma
4. Study session tracked in `StudySession` table

### Pronunciation Practice
1. Words loaded from **JLPT Vocab API** for selected level (or user's difficult words)
2. User listens to reference audio via **ElevenLabs TTS**
3. User records themselves → WebM/Opus audio captured via MediaRecorder API
4. Audio sent to **Google Cloud STT** → transcribed to Japanese text
5. Transcription compared against expected text → score calculated via Levenshtein distance
6. Result and status saved to `PronunciationAttempt` in **PostgreSQL**

### Voice Conversation
1. User selects topic and level → `ConversationSession` created in **PostgreSQL**
2. WebRTC connection opened to **ElevenLabs Voice Agent** with level-appropriate system prompt
3. Agent introduces itself in Japanese and begins with a topic-relevant question
4. Real-time speech recognition, LLM generation, and TTS happen on ElevenLabs infrastructure
5. Live transcript displays with Japanese/English parsing and optional translation toggle
6. Transcript messages persisted to `ConversationMessage` in **PostgreSQL**
7. After call ends, transcript remains visible for review
8. Past conversations accessible from **History** page with full transcript replay

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                          # Landing page
│   ├── layout.tsx                        # Root layout (ClerkProvider, fonts)
│   ├── (auth)/                           # Sign-in, sign-up pages
│   ├── (protected)/                      # Authenticated pages
│   │   ├── layout.tsx                    # Sidebar, mobile nav, topbar
│   │   ├── dashboard/                    # Dashboard with stats + quick actions
│   │   ├── vocab/                        # Vocabulary browser + save/manage
│   │   ├── pronunciation/                # Pronunciation practice + grading
│   │   ├── conversation/                 # Topic selection + voice/text chat
│   │   ├── history/                      # Review past sessions + transcripts
│   │   ├── settings/                     # User preferences
│   │   └── onboarding/                   # First-time JLPT level selection
│   └── api/
│       ├── vocab/                        # CRUD for saved vocabulary
│       ├── sessions/                     # Study sessions, stats, preferences
│       ├── pronunciation/                # Attempts + grading
│       ├── conversation/                 # Sessions + messages
│       └── elevenlabs/                   # TTS + signed URL
├── components/
│   ├── ui/                               # Button, Card, Badge, LevelSelector, etc.
│   ├── layout/                           # Sidebar, MobileNav, TopBar
│   └── conversation/                     # VoiceAgent component
├── lib/
│   ├── db.ts                             # Prisma client singleton
│   ├── user.ts                           # Auth helpers (getOrCreateUserProfile)
│   ├── utils.ts                          # Formatting, JLPT helpers
│   ├── jlpt-api.ts                       # External JLPT vocab API wrapper
│   ├── elevenlabs.ts                     # TTS + system prompt generation
│   ├── google-stt.ts                     # Speech-to-text + grading
│   └── conversation-utils.ts             # parseTranslation (JP/EN separation)
├── types/
│   ├── vocab.ts                          # JlptWord interface
│   └── conversation.ts                   # ConversationTopic + 15 topic definitions
└── middleware.ts                          # Clerk route protection
```

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# ElevenLabs
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_AGENT_ID=agent_...
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=agent_...

# Google Cloud Speech-to-Text
GOOGLE_APPLICATION_CREDENTIALS_JSON=<base64-encoded service account JSON>

# JLPT Vocab API
NEXT_PUBLIC_JLPT_API_URL=https://jlpt-vocab-api.vercel.app
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in all required values

# Initialize database
npx prisma generate
npx prisma db push

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
