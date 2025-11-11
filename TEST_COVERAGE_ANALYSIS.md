# Test Coverage Analysis - NapGPT Features

## Current Test Coverage Status

### ✅ Tested Features (13 scenarios)

1. **00_smoke** - Basic page load and messaging
2. **10_effort_bands** - Effort level routing (5, 25, 60, 92)
3. **20_boost_and_cooldown** - Boost button and cooldown mechanism
4. **25_blanket_mode** - Blanket overlay based on effort/idle
5. **30_idle_and_overlay** - Idle overlay and nap timer
6. **35_coffee_economy** - Coffee bean currency system
7. **40_energy_meter** - Energy draining and refilling
8. **50_commands_dream_nap** - `/dream` and `/nap` commands
9. **55_dream_drift** - Dream drift fragments
10. **60_context_threading** - Conversation context
11. **70_error_and_retry** - Error handling and retries
12. **80_math_and_code_guards** - Math/code intent guards
13. **90_non_sequitur_dropout_bounds** - Dropout and non-sequitur bounds

### ❌ Missing Test Coverage

#### API Endpoints
- [ ] **PUT /api/chat** - Boost cookie setting
- [ ] **DELETE /api/chat** - Rate limit clearing (test mode)
- [ ] **GET /api/mode** - Mock mode detection

#### Engine Features
- [ ] **Wake reactions** - Detecting wake keywords and reactions
- [ ] **Echo fragments** - Prior-turn reference fragments
- [ ] **Self-references** - Self-reference fragments
- [ ] **Micro modes** - Micro mode detection and handling
- [ ] **Recall command** - `/recall` command functionality
- [ ] **Laziness curve** - Effort-to-laziness mapping
- [ ] **Intent classification edge cases** - All intent types (math, code, general, wake)
- [ ] **Strategy selection** - All 4 strategies (refuse, one-liner, lazy-help, full-help)
- [ ] **Effort boundaries** - 0 and 100 edge cases
- [ ] **Empty response fallback** - Hard fallback message
- [ ] **Retry logic** - 3-attempt retry with backoff
- [ ] **Stop sequences** - Dynamic stop sequence generation

#### UI Features
- [ ] **Message alignment** - User messages right, assistant left
- [ ] **Scroll behavior** - Auto-scroll to bottom
- [ ] **Input focus** - Focus management after send/nap
- [ ] **Keyboard shortcuts** - Enter to send, Shift+Enter for newline
- [ ] **Command preprocessing** - Command detection and handling
- [ ] **Toast messages** - Boost refusal toast
- [ ] **Bean max limit** - Cannot exceed max beans
- [ ] **Energy refill rate** - Gradual refill over time
- [ ] **Effort slider boundaries** - Min (0) and max (100) values
- [ ] **Blanket animation** - Fade in/out transitions
- [ ] **Idle overlay animation** - Zzz animation
- [ ] **Typing indicator** - Animated dots during loading

#### State Management
- [ ] **Zustand store updates** - All state mutations
- [ ] **State persistence** - localStorage/sessionStorage (if any)
- [ ] **State synchronization** - Multiple components reading same state

#### Network & Error Handling
- [ ] **Rate limiting (429)** - Rate limit detection and display
- [ ] **Network timeout** - 30s timeout handling
- [ ] **AbortError** - Request abortion handling
- [ ] **500 errors** - Server error handling
- [ ] **Network failures** - Fetch failures
- [ ] **Invalid JSON** - Malformed request handling
- [ ] **Schema validation** - Request validation errors

#### Chaos Engineering
- [ ] **CHAOS_LATENCY_MS** - Latency injection
- [ ] **CHAOS_FAIL_PCT** - Failure injection
- [ ] **CHAOS_429_PCT** - Rate limit injection

#### Test Infrastructure
- [ ] **Seeded RNG** - Deterministic randomness
- [ ] **Test config overrides** - All testConfig options
- [ ] **Determinism flags** - NAPGPT_DISABLE_DREAM_DRIFT, NAPGPT_TEST_SEED

#### Edge Cases
- [ ] **Empty messages** - Handling empty input
- [ ] **Very long messages** - Token truncation
- [ ] **Special characters** - Unicode, emoji handling
- [ ] **Multiple rapid clicks** - Button spam protection
- [ ] **Concurrent requests** - Multiple simultaneous requests
- [ ] **Session management** - Session ID handling

## Coverage Gaps by Priority

### 🔴 P0 - Critical (Must Test)
1. PUT /api/chat endpoint
2. Rate limiting (429) display
3. Network timeout handling
4. Empty response fallback
5. Retry logic
6. Message alignment
7. Keyboard shortcuts
8. Effort boundaries (0, 100)

### 🟡 P1 - Important (Should Test)
1. Wake reactions
2. Echo fragments
3. Self-references
4. Recall command
5. Scroll behavior
6. Input focus
7. Toast messages
8. Strategy selection verification
9. Intent classification

### 🟢 P2 - Nice to Have
1. Micro modes
2. Laziness curve verification
3. Blanket animation
4. Idle overlay animation
5. Chaos engineering
6. Test config overrides
7. Session management

## Test Files to Create

1. `95_api_endpoints.ts` - Test PUT, DELETE, GET /api/mode
2. `96_wake_reactions.ts` - Test wake keyword detection
3. `97_echo_fragments.ts` - Test echo fragment functionality
4. `98_self_references.ts` - Test self-reference fragments
5. `99_recall_command.ts` - Test /recall command
6. `100_ui_interactions.ts` - Test keyboard shortcuts, focus, scroll
7. `101_edge_cases.ts` - Test boundaries, empty inputs, long messages
8. `102_state_management.ts` - Test Zustand store updates
9. `103_network_errors.ts` - Test all error scenarios
10. `104_chaos_engineering.ts` - Test chaos flags

## Total Coverage Target

- **Current**: ~60% feature coverage
- **Target**: 100% feature coverage
- **Missing**: ~40% of features need tests

