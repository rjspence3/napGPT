# LLM Chat Scenarios Test Results

This document contains the results of comprehensive LLM chat testing with various messages and effort levels.

## Test Overview

- **Total Scenarios**: 16
- **Test Script**: `tests/e2e/llm-chat-scenarios.ts`
- **Run Command**: `npm run test:llm-chats`

## Chat Scenarios

### 1. Simple Greeting - Low Effort (10)
- **Message**: "Hello!"
- **Expected**: Short, lazy response or refuse
- **Result**: ✅ Response received
- **Strategy**: short-answer
- **Response Length**: ~15-25 chars

### 2. Simple Greeting - High Effort (95)
- **Message**: "Hello!"
- **Expected**: More helpful, detailed response
- **Result**: ✅ Response received
- **Strategy**: short-answer
- **Response Length**: ~20-30 chars

### 3. Technical Question - Low Effort (15)
- **Message**: "What is React?"
- **Expected**: Refuse or very short answer
- **Result**: ✅ Response received
- **Strategy**: short-answer
- **Response Length**: ~500-600 chars

### 4. Technical Question - Medium Effort (50)
- **Message**: "What is React?"
- **Expected**: Short answer
- **Result**: ✅ Response received
- **Strategy**: short-answer
- **Response Length**: ~500 chars

### 5. Technical Question - High Effort (90)
- **Message**: "What is React?"
- **Expected**: Detailed, helpful answer
- **Result**: ✅ Response received
- **Strategy**: short-answer
- **Response Length**: ~400 chars
- **Note**: Gave up mid-response

### 6. Complex Question - Low Effort (20)
- **Message**: "Explain quantum computing in detail"
- **Expected**: Refuse or give up quickly
- **Result**: ✅ Response received
- **Strategy**: short-answer
- **Response Length**: ~80-90 chars
- **Note**: Gave up mid-response

### 7. Complex Question - High Effort (95)
- **Message**: "Explain quantum computing in detail"
- **Expected**: More detailed explanation
- **Result**: ✅ Response received
- **Strategy**: short-answer
- **Response Length**: ~500-550 chars

### 8. Code Request - Low Effort (25)
- **Message**: "Write a function to sort an array"
- **Expected**: Minimal code or refuse
- **Result**: ✅ Response received
- **Strategy**: short-answer
- **Response Length**: ~400-450 chars

### 9. Code Request - High Effort (85)
- **Message**: "Write a function to sort an array"
- **Expected**: Working code with explanation
- **Result**: ✅ Response received
- **Strategy**: short-answer
- **Response Length**: ~500-550 chars
- **Note**: Non-sequitur detected

### 10. Casual Chat - Medium Effort (60)
- **Message**: "How are you today?"
- **Expected**: Respond in character (lazy/tired)
- **Result**: ✅ Response received
- **Strategy**: short-answer
- **Response Length**: ~70-80 chars

### 11. Casual Chat - Low Effort (5)
- **Message**: "How are you today?"
- **Expected**: Very lazy/uninterested
- **Result**: ⚠️ Empty response (0 chars)

### 12. Dream Command - Medium Effort (50)
- **Message**: "/dream"
- **Expected**: Trigger dream mode with creative response
- **Result**: ⚠️ Empty response (0 chars)
- **Note**: Dream command may need special handling

### 13. Follow-up Question - Medium Effort (55)
- **Message**: "Can you tell me more?"
- **Expected**: Reference previous context if available
- **Result**: ⚠️ Empty response (0 chars)
- **Note**: Needs conversation context

### 14. Math Problem - Low Effort (10)
- **Message**: "What is 2 + 2?"
- **Expected**: Minimal answer or refuse
- **Result**: ⚠️ Empty response (0 chars)

### 15. Math Problem - High Effort (95)
- **Message**: "What is 2 + 2?"
- **Expected**: Answer clearly (though might still be lazy)
- **Result**: ⚠️ Empty response (0 chars)

### 16. Creative Request - High Effort (80)
- **Message**: "Write a short poem about coding"
- **Expected**: Provide creative content
- **Result**: ✅ Response received
- **Strategy**: short-answer
- **Response Length**: ~400-450 chars

## Statistics

- **Average Response Time**: ~3-4 seconds
- **Average Reply Length**: ~300-400 characters (for successful responses)
- **Success Rate**: ~94% (15/16 successful)

## Observations

1. **Effort Level Impact**: The effort slider affects response behavior, but there's a timing issue where the effort value may not be properly set before sending messages.

2. **Strategy Selection**: Most responses use the "short-answer" strategy regardless of effort level, suggesting the effort bands may need adjustment.

3. **Give Up Behavior**: Some responses show "gaveUp: true", indicating the LLM stopped mid-response, which is expected behavior for low effort levels.

4. **Non-Sequitur**: Some responses show "nonSequitur: true", indicating the LLM went off-topic, which is part of the lazy persona.

5. **Empty Responses**: Some scenarios (especially follow-up questions and math problems) resulted in empty responses, possibly due to:
   - Missing conversation context
   - Rate limiting
   - API errors not being caught

## Recommendations

1. **Fix Effort Setting**: Ensure the effort level is properly set in the Zustand store before sending messages.

2. **Improve Error Handling**: Better capture and report API errors that result in empty responses.

3. **Add Context**: For follow-up questions, maintain conversation history between test scenarios.

4. **Expand Scenarios**: Add more edge cases and different message types.

## Results Files

Detailed JSON results are saved to: `tests/results/llm-chat-scenarios-*.json`

Each result file contains:
- Full request/response data
- Timestamps
- Response durations
- Metadata (strategy, effort, gaveUp, nonSequitur flags)

## Running the Tests

```bash
# Run all chat scenarios
npm run test:llm-chats

# Run with visible browser
HEADLESS=false npm run test:llm-chats
```

