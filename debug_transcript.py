#!/usr/bin/env python3
from youtube_transcript_api import YouTubeTranscriptApi

video_id = "dQw4w9WgXcQ"
api = YouTubeTranscriptApi()

# List all available transcripts
transcript_list = api.list(video_id)

# Get first transcript
for t in transcript_list:
    print(f"Found transcript: {t.language_code}")
    transcript_data = t.fetch()
    print(f"Type of transcript_data: {type(transcript_data)}")
    print(f"Is it a list?: {isinstance(transcript_data, list)}")
    
    # Try to iterate
    for i, entry in enumerate(transcript_data):
        print(f"Entry {i} type: {type(entry)}")
        print(f"Entry {i}: {entry}")
        if hasattr(entry, '__dict__'):
            print(f"Entry attributes: {entry.__dict__}")
        break
    break