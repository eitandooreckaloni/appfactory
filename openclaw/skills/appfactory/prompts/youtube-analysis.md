# YouTube Video Analysis (Gemini API)

You have access to YouTube video analysis via Google's Gemini API. Use this to extract visual design inspiration, product concepts, and UX patterns from YouTube videos.

## When to Use

- The user includes a YouTube URL in their message
- You find a relevant YouTube video during web search
- You want visual/product reference material for your task

## How to Call

Make an HTTP request using curl:

```bash
curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [
        {
          "fileData": {
            "fileUri": "<YOUTUBE_URL>",
            "mimeType": "video/*"
          }
        },
        {
          "text": "<YOUR_ANALYSIS_PROMPT>"
        }
      ]
    }],
    "generationConfig": {
      "temperature": 0.4,
      "maxOutputTokens": 4096
    }
  }'
```

The response text is at `response.candidates[0].content.parts[0].text`.

## Analysis Prompts by Context

### For product/idea research:
```
Watch this video and extract: What product or app is shown? What problem does it solve? Who is the target user? What's the core UX flow? What features are demonstrated? What's clever or unique about the approach? Be specific and concrete.
```

### For visual/design inspiration:
```
Analyze the visual design in this video. Extract: Overall aesthetic, color palette (hex estimates), typography style, layout patterns (cards/grids/lists/sidebar), key UI components, micro-interactions and animations, loading states, and the emotional feeling the interface evokes. Be specific — give hex colors, exact patterns, not vague descriptions.
```

### For general inspiration:
```
Analyze this video as a product designer and developer. Extract: What product is shown, its visual design language, color palette (hex estimates), typography, layout patterns, key UI components, animations, UX flow, standout design moments worth stealing, and overall mood. Be specific and actionable.
```

## Error Handling

If the API returns an error (video unavailable, quota exceeded), note the failure and continue with your task using other available information. Do not block on a failed video analysis.
