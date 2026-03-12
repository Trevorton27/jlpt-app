# KoeJLPT - Voice-First JLPT Preparation

A Next.js application for Japanese Language Proficiency Test (JLPT) preparation that combines level-based vocabulary study with interactive voice conversation and pronunciation practice.

**Tech Stack:** Next.js 16 (App Router) | TypeScript | Tailwind CSS | PostgreSQL

---

## External APIs & Integrations

### 1. Clerk Authentication

**Purpose:** User authentication, session management, and route protection.

**How it's used:**
- **Middleware** (`src/middleware.ts`) protects all `/dashboard`, `/vocab`, `/conversation`, `/pronunciation`, `/history`, `/settings`, `/onboarding`, and `/api/*` routes
- **Server components** use `auth()` and `currentUser()` to fetch the authenticated user and link them to an internal `UserProfile` record via `clerkId`
- **API routes** call `auth()` at the top of every handler to verify the request is authenticated before processing
- **Frontend** uses `<ClerkProvider>`, `<SignIn>`, and `<SignUp>` components for the auth UI
- User avatar images are loaded from `img.clerk.com` (configured in `next.config.ts`)

**Environment variables:**
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY   # Frontend auth key
CLERK_SECRET_KEY                    # Server-side verification
NEXT_PUBLIC_CLERK_SIGN_IN_URL       # /sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL       # /sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL # /dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL # /onboarding
```

**Package:** `@clerk/nextjs` v7

---

### 2. ElevenLabs (Text-to-Speech & Voice Agent)

**Purpose:** Japanese speech synthesis for vocabulary/pronunciation audio playback, and real-time AI voice conversation partner.

#### Text-to-Speech (TTS)

**How it's used:**
- Library at `src/lib/elevenlabs.ts` wraps the ElevenLabs REST API
- `generateSpeech()` sends Japanese text to the TTS endpoint, wrapping it in `<lang xml:lang="ja-JP">` tags for proper pronunciation
- API route at `src/app/api/elevenlabs/tts/route.ts` exposes this as `POST /api/elevenlabs/tts`
- Used on the **Vocabulary** page (listen to words), **Pronunciation** page (hear the target word before recording), and **Conversation** page (text chat mode)

**ElevenLabs endpoint called:**
```
POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}
```

**Configuration:**
- Voice: Sarah (`EXAVITQu4vr4xnSDxMaL`) — multilingual
- Model: `eleven_flash_v2_5`
- Voice settings: stability 0.5, similarity_boost 0.75, configurable speed

#### Voice Agent (Real-Time Conversation)

**How it's used:**
- `src/components/conversation/voice-agent.tsx` uses the `@elevenlabs/react` SDK to open a WebSocket connection to an ElevenLabs Conversational AI agent
- On session start, the agent receives a dynamic system prompt (built by `buildAgentContext()`) and a first message greeting — both tailored to the user's JLPT level and chosen topic
- The agent introduces itself, then leads the conversation by always ending responses with a question
- The agent handles real-time speech recognition, LLM response generation, and speech synthesis over the WebSocket
- Transcript entries are persisted to the database via `POST /api/conversation/message`
- For private agents, a signed WebSocket URL is fetched server-side from `GET https://api.elevenlabs.io/v1/convai/conversation/get-signed-url`

**Environment variables:**
```
ELEVENLABS_API_KEY                  # Server-side API key (xi-api-key header)
ELEVENLABS_AGENT_ID                 # Server-side agent ID (for signed URL fallback)
NEXT_PUBLIC_ELEVENLABS_AGENT_ID     # Client-side agent ID (direct WebSocket connection)
```

**Packages:** `@elevenlabs/react` v0.14

---

### 3. Google Cloud Speech-to-Text

**Purpose:** Automatic pronunciation grading — transcribes user-recorded audio and compares it against the expected Japanese text.

**How it's used:**
- Library at `src/lib/google-stt.ts` initializes a Google Cloud `SpeechClient` using base64-decoded service account credentials from the environment
- `transcribeAudio()` sends a WebM/Opus audio buffer to Google's `recognize` endpoint configured for Japanese (`ja-JP`) at 48kHz
- `gradeTranscription()` normalizes both the expected and transcribed text (strips punctuation/spaces), then computes a 0–100 similarity score using character-level Levenshtein distance
- Scoring thresholds: >= 80% = COMPLETED, 50–79% = IMPROVED, < 50% = NEEDS_RETRY
- API route at `src/app/api/pronunciation/grade/route.ts` accepts a `FormData` POST with `audio` (WebM file) and `expected` (text), returns `{ transcribed, score, status }`
- Used on the **Pronunciation** page — after the user records themselves saying a word, the audio is sent for grading and results are displayed inline (score percentage, what Google heard, status badge)

**Google Cloud API used:**
```
google.cloud.speech.v1.Speech.Recognize
```

**Environment variables:**
```
GOOGLE_APPLICATION_CREDENTIALS_JSON  # Base64-encoded service account JSON
```

**Package:** `@google-cloud/speech` v7

---

### 4. JLPT Vocabulary API

**Purpose:** Provides curated JLPT vocabulary word lists organized by level (N5–N1).

**How it's used:**
- Library at `src/lib/jlpt-api.ts` wraps the external API with three functions:
  - `fetchVocabByLevel(level, { offset, limit })` — paginated word list for a given JLPT level
  - `searchVocab(query)` — keyword search across all levels
  - `fetchRandomWords(level, count)` — fetches 100 words and returns a random subset
- Responses are normalized to handle field name variations (`word`/`japanese`, `meaning`/`english`, `furigana`/`reading`)
- Used on the **Vocabulary** page (browse and save words), **Pronunciation** page (load practice words for a level), and **Dashboard** (word of the day)
- Cached with Next.js ISR revalidation of 1 hour

**Endpoints called:**
```
GET https://jlpt-vocab-api.vercel.app/api/words?level={1-5}&offset={n}&limit={n}
GET https://jlpt-vocab-api.vercel.app/api/words?keyword={query}
```

**Environment variables:**
```
NEXT_PUBLIC_JLPT_API_URL  # Default: https://jlpt-vocab-api.vercel.app
```

---

### 5. Prisma + PostgreSQL (Neon)

**Purpose:** Application database for user data, saved vocabulary, study sessions, pronunciation attempts, and conversation history.

**How it's used:**
- Prisma client singleton at `src/lib/db.ts` (global instance to survive hot reloads in development)
- Schema at `prisma/schema.prisma` defines 7 models with full cascade delete from `UserProfile`
- All API routes and server components query the database through the Prisma client

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

**Environment variables:**
```
DATABASE_URL  # PostgreSQL connection string (e.g. Neon serverless)
```

**Package:** `@prisma/client` v6, `prisma` v6

---

## API Routes Summary

| Route | Methods | External APIs | Purpose |
|---|---|---|---|
| `/api/vocab` | GET, POST, PATCH, DELETE | Prisma | Manage saved vocabulary |
| `/api/sessions` | GET, POST, PATCH | Prisma | Manage study sessions |
| `/api/sessions/stats` | GET | Prisma | Dashboard statistics |
| `/api/sessions/preferences` | GET, POST | Prisma | User preferences |
| `/api/pronunciation` | GET, POST, PATCH | Prisma | Pronunciation attempt records |
| `/api/pronunciation/grade` | POST | Google Cloud STT | Grade recorded audio against expected text |
| `/api/conversation` | GET, POST, PATCH | Prisma | Conversation session management |
| `/api/conversation/message` | POST | Prisma | Save conversation messages |
| `/api/elevenlabs/tts` | POST | ElevenLabs | Generate Japanese speech audio |
| `/api/elevenlabs/signed-url` | GET | ElevenLabs | Get WebSocket URL for voice agent |

All routes require Clerk authentication.

---

## Data Flow

### Vocabulary Study
1. User selects JLPT level → words fetched from **JLPT Vocab API**
2. User clicks listen → audio generated by **ElevenLabs TTS**
3. User saves word → stored in **PostgreSQL** via Prisma
4. Study session tracked in `StudySession` table

### Pronunciation Practice
1. Words loaded from **JLPT Vocab API** for selected level
2. User listens to reference audio via **ElevenLabs TTS**
3. User records themselves → WebM audio captured via MediaRecorder API
4. Audio sent to **Google Cloud STT** → transcribed to Japanese text
5. Transcription compared against expected text → score calculated via Levenshtein distance
6. Result and status saved to `PronunciationAttempt` in **PostgreSQL**

### Voice Conversation
1. User selects topic and level → `ConversationSession` created in **PostgreSQL**
2. WebSocket connection opened to **ElevenLabs Voice Agent** with level-appropriate system prompt
3. Agent introduces itself and begins the conversation with a topic-relevant question
4. Real-time speech recognition, LLM generation, and TTS happen on ElevenLabs infrastructure
5. Transcript messages persisted to `ConversationMessage` in **PostgreSQL**

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
