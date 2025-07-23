# YouTube Transcript Proxy

A simple proxy service that extracts transcripts from YouTube channels without requiring API keys.

## Features
- Extract transcripts from any YouTube channel
- No API keys or authentication required
- Clean JSON/Markdown/Text export formats
- Built for AI training data collection

## Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/YOUR_USERNAME/youtube-transcript-proxy)

## Local Development

```bash
npm install
npm start
```

Server runs on port 3457 by default.

## API Endpoints

- `GET /` - Health check
- `GET /health` - Health status
- `POST /channel` - Extract channel transcripts
  - Body: `{ "channelUrl": "https://youtube.com/@channelname" }`

## Environment Variables

- `PORT` - Server port (default: 3457)