// Debug logging for Railway deployment
console.log('🟢 Server starting...');
console.log('📂 __dirname:', __dirname);
console.log('📄 process.cwd():', process.cwd());
console.log('📋 Files in current directory:', require('fs').readdirSync('.'));

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

// Don't fail if dotenv is missing in production
try {
  require('dotenv').config();
} catch (e) {
  console.log('dotenv not loaded (this is fine in production)');
}

const app = express();
const PORT = process.env.PORT || 3457;

console.log('Starting YouTube Transcript Service...');
console.log('PORT:', PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'YouTube Transcript Service - No API, No Auth, Just Works',
    endpoints: {
      '/channel': 'POST - Extract channel videos and transcripts'
    }
  });
});

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.send('OK');
});

// Single video endpoint for testing
app.post('/video', async (req, res) => {
  const { videoUrl } = req.body;
  
  if (!videoUrl) {
    return res.status(400).json({ error: 'Missing videoUrl' });
  }
  
  try {
    // Extract video ID from URL
    const videoIdMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (!videoIdMatch) {
      return res.status(400).json({ error: 'Invalid YouTube video URL' });
    }
    
    const videoId = videoIdMatch[1];
    console.log(`Processing single video: ${videoId}`);
    
    // Fetch transcript
    const transcript = await fetchTranscript(videoId);
    
    res.json({
      success: true,
      videoId,
      videoUrl,
      hasTranscript: !!transcript,
      transcript: transcript,
      transcriptLength: transcript ? transcript.length : 0
    });
    
  } catch (error) {
    console.error('Video processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process video',
      details: error.message 
    });
  }
});

// Diagnostic endpoint
app.get('/debug', async (req, res) => {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  const diagnostics = {
    node_version: process.version,
    platform: process.platform,
    cwd: process.cwd(),
    env_path: process.env.PATH,
    python_check: 'checking...',
    pip_check: 'checking...',
    youtube_api_check: 'checking...'
  };
  
  try {
    const { stdout: pythonVersion } = await execPromise('python3 --version');
    diagnostics.python_check = pythonVersion.trim();
  } catch (e) {
    diagnostics.python_check = 'Python3 not found: ' + e.message;
  }
  
  try {
    const { stdout: pipVersion } = await execPromise('pip3 --version');
    diagnostics.pip_check = pipVersion.trim();
  } catch (e) {
    diagnostics.pip_check = 'Pip3 not found: ' + e.message;
  }
  
  try {
    const { stdout: apiCheck } = await execPromise('python3 -c "import youtube_transcript_api; print(\'youtube-transcript-api installed\')"');
    diagnostics.youtube_api_check = apiCheck.trim();
  } catch (e) {
    diagnostics.youtube_api_check = 'youtube-transcript-api not installed: ' + e.message;
  }
  
  // Check Python path
  try {
    const { stdout: pythonPath } = await execPromise('python3 -c "import sys; print(sys.path)"');
    diagnostics.python_path = pythonPath.trim();
  } catch (e) {
    diagnostics.python_path = 'Could not get Python path';
  }
  
  // Check if script exists
  try {
    const { stdout: scriptCheck } = await execPromise('ls -la get_transcript.py');
    diagnostics.script_exists = scriptCheck.trim();
  } catch (e) {
    diagnostics.script_exists = 'Script not found';
  }
  
  res.json(diagnostics);
});

// Extract channel handle from various URL formats
function extractChannelIdentifier(url) {
  const patterns = {
    handle: /youtube\.com\/@([^\/\?]+)/,
    channelId: /youtube\.com\/channel\/([^\/\?]+)/,
    customUrl: /youtube\.com\/c\/([^\/\?]+)/,
    user: /youtube\.com\/user\/([^\/\?]+)/
  };
  
  for (const [type, pattern] of Object.entries(patterns)) {
    const match = url.match(pattern);
    if (match) {
      return { type, identifier: match[1] };
    }
  }
  
  return null;
}

// Scrape channel videos page
async function scrapeChannelVideos(channelUrl) {
  try {
    console.log(`Scraping channel: ${channelUrl}`);
    
    // Add sorting by popularity
    const videosUrl = channelUrl.includes('?') 
      ? `${channelUrl}&view=0&sort=p&flow=grid`
      : `${channelUrl}/videos?view=0&sort=p&flow=grid`;
    
    const response = await axios.get(videosUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });
    
    const $ = cheerio.load(response.data);
    const videos = [];
    
    // Extract video IDs from the page
    // YouTube embeds video data in JSON within script tags
    const scripts = $('script').toArray();
    
    for (const script of scripts) {
      const content = $(script).html();
      if (content && content.includes('var ytInitialData')) {
        try {
          // Extract the JSON data
          const jsonMatch = content.match(/var ytInitialData = ({.+?});/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[1]);
            
            // Navigate through the data structure to find videos
            const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs;
            if (tabs) {
              for (const tab of tabs) {
                const content = tab?.tabRenderer?.content;
                const items = content?.richGridRenderer?.contents || 
                             content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.gridRenderer?.items;
                
                if (items) {
                  for (const item of items) {
                    const videoRenderer = item?.richItemRenderer?.content?.videoRenderer || item?.gridVideoRenderer;
                    if (videoRenderer) {
                      videos.push({
                        videoId: videoRenderer.videoId,
                        title: videoRenderer.title?.runs?.[0]?.text || '',
                        thumbnail: videoRenderer.thumbnail?.thumbnails?.slice(-1)?.[0]?.url || '',
                        viewCount: videoRenderer.viewCountText?.simpleText || videoRenderer.viewCountText?.runs?.[0]?.text || '0 views',
                        publishedTime: videoRenderer.publishedTimeText?.simpleText || '',
                        duration: videoRenderer.lengthText?.simpleText || ''
                      });
                    }
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error('Error parsing ytInitialData:', e.message);
        }
      }
    }
    
    // Fallback: Try to extract from HTML links
    if (videos.length === 0) {
      $('a[href*="/watch?v="]').each((i, el) => {
        const href = $(el).attr('href');
        const match = href.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
        if (match) {
          const videoId = match[1];
          // Avoid duplicates
          if (!videos.find(v => v.videoId === videoId)) {
            videos.push({
              videoId,
              title: $(el).attr('title') || $(el).text().trim() || 'Untitled',
              thumbnail: '',
              viewCount: '',
              publishedTime: '',
              duration: ''
            });
          }
        }
      });
    }
    
    // Get channel name
    const channelName = $('meta[property="og:title"]').attr('content') || 
                       $('title').text().split(' - YouTube')[0] || 
                       'Unknown Channel';
    
    console.log(`Found ${videos.length} videos from ${channelName}`);
    return { channelName, videos: videos.slice(0, 20) }; // Limit to 20 videos
    
  } catch (error) {
    console.error('Scraping error:', error.message);
    throw error;
  }
}

// Fetch transcript using Python youtube-transcript-api
async function fetchTranscript(videoId) {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  try {
    console.log(`Fetching transcript for ${videoId} using youtube-transcript-api...`);
    
    // Call Python script - try different Python paths
    let stdout, stderr;
    try {
      // First try python3
      ({ stdout, stderr } = await execPromise(`python3 get_transcript.py ${videoId}`, {
        timeout: 10000 // 10 second timeout
      }));
    } catch (error) {
      // If python3 fails, try python
      try {
        ({ stdout, stderr } = await execPromise(`python get_transcript.py ${videoId}`, {
          timeout: 10000 // 10 second timeout
        }));
      } catch (error2) {
        // If both fail, try with full path
        ({ stdout, stderr } = await execPromise(`/usr/bin/python3 get_transcript.py ${videoId}`, {
          timeout: 10000 // 10 second timeout
        }));
      }
    }
    
    // ALWAYS log the output for debugging
    console.log(`Python stdout for ${videoId}:`, stdout);
    if (stderr) {
      console.error(`Python stderr for ${videoId}:`, stderr);
    }
    
    // Parse JSON response
    const result = JSON.parse(stdout);
    
    if (result.success && result.transcript) {
      console.log(`✓ Got transcript for ${videoId} (${result.length} chars)`);
      return result.transcript;
    } else {
      console.log(`✗ No transcript found for ${videoId}: ${result.error}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching transcript for ${videoId}:`, error.message);
    console.error(`Full error:`, error);
    return null;
  }
}

// Main endpoint - process channel
app.post('/channel', async (req, res) => {
  const { channelUrl } = req.body;
  
  if (!channelUrl) {
    return res.status(400).json({ error: 'Missing channelUrl' });
  }
  
  try {
    // Extract channel info
    const channelInfo = extractChannelIdentifier(channelUrl);
    if (!channelInfo) {
      return res.status(400).json({ error: 'Invalid YouTube channel URL' });
    }
    
    // Build proper channel URL
    let properChannelUrl;
    if (channelInfo.type === 'handle') {
      properChannelUrl = `https://www.youtube.com/@${channelInfo.identifier}`;
    } else if (channelInfo.type === 'channelId') {
      properChannelUrl = `https://www.youtube.com/channel/${channelInfo.identifier}`;
    } else {
      properChannelUrl = channelUrl;
    }
    
    // Scrape channel videos
    const { channelName, videos } = await scrapeChannelVideos(properChannelUrl);
    
    // Process each video
    const processedVideos = [];
    let transcriptsFound = 0;
    
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      console.log(`Processing ${i + 1}/${videos.length}: ${video.title}`);
      
      // Fetch transcript
      const transcript = await fetchTranscript(video.videoId);
      
      processedVideos.push({
        ...video,
        url: `https://www.youtube.com/watch?v=${video.videoId}`,
        hasTranscript: !!transcript,
        transcript: transcript
      });
      
      if (transcript) {
        transcriptsFound++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Generate response
    res.json({
      success: true,
      channel: {
        name: channelName,
        url: properChannelUrl
      },
      stats: {
        videosFound: videos.length,
        videosProcessed: processedVideos.length,
        transcriptsExtracted: transcriptsFound
      },
      videos: processedVideos
    });
    
  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process channel',
      details: error.message 
    });
  }
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`YouTube Transcript Service running on port ${PORT}`);
  console.log(`No API keys, no OAuth, just pure extraction!`);
  console.log(`Server is ready to accept connections`);
});

server.on('error', (err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});