#!/usr/bin/env python3
import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi

def get_transcript(video_id):
    """
    Fetches the transcript for the given video ID using youtube-transcript-api.
    Tries English first, then any available transcript.
    Returns JSON with transcript data or error.
    """
    try:
        # Create API instance and list all available transcripts
        api = YouTubeTranscriptApi()
        transcript_list = api.list(video_id)

        # Try to find an English transcript
        transcript = None
        for t in transcript_list:
            if t.language_code.startswith('en'):
                transcript = t
                break

        # Fallback: use the first transcript if no English found
        if not transcript:
            transcript = transcript_list[0]

        # Fetch actual transcript text
        transcript_data = transcript.fetch()

        # Join text pieces
        text_parts = [entry.text for entry in transcript_data]
        full_text = ' '.join(text_parts)

        return {
            "success": True,
            "videoId": video_id,
            "transcript": full_text,
            "length": len(full_text),
            "language": transcript.language_code
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No video ID provided"}))
        sys.exit(1)

    video_id = sys.argv[1]
    result = get_transcript(video_id)
    print(json.dumps(result))