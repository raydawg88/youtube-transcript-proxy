from youtube_transcript_api import YouTubeTranscriptApi

# Test with Rick Astley
video_id = "dQw4w9WgXcQ"

try:
    api = YouTubeTranscriptApi()
    transcript_list = api.list(video_id)
    
    print(f"Available transcripts: {len(transcript_list)}")
    for t in transcript_list:
        print(f"- {t.language_code}: {t.language}")
    
    # Get first transcript
    if transcript_list:
        transcript = transcript_list[0]
        data = transcript.fetch()
        print(f"\nTranscript type: {type(data)}")
        print(f"First entry: {data[0] if data else 'No data'}")
        
except Exception as e:
    print(f"Error: {e}")