// Add this to server.js as a test endpoint
app.get('/test-transcript/:videoId', async (req, res) => {
  const { videoId } = req.params;
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  try {
    console.log(`Direct test of transcript extraction for ${videoId}`);
    
    // Try to run the Python script directly
    const { stdout, stderr } = await execPromise(`python3 get_transcript.py ${videoId}`, {
      timeout: 15000,
      cwd: process.cwd()
    });
    
    console.log('Python stdout:', stdout);
    console.log('Python stderr:', stderr);
    
    const result = JSON.parse(stdout);
    res.json({
      success: true,
      videoId,
      pythonResult: result,
      stderr: stderr || null
    });
  } catch (error) {
    console.error('Test transcript error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr,
      cwd: process.cwd(),
      files: require('fs').readdirSync('.')
    });
  }
});