import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

// Initialize Google Cloud TTS client
let ttsClient: TextToSpeechClient | null = null;

function getTTSClient() {
  if (ttsClient) return ttsClient;

  // Try to get credentials from environment variable
  // Support both keyFilename (path to file) and direct JSON credentials
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  
  console.log('🔍 Initializing TTS client...');
  console.log('  GOOGLE_APPLICATION_CREDENTIALS:', credentialsPath ? 'SET (path)' : 'NOT SET');
  console.log('  GOOGLE_APPLICATION_CREDENTIALS_JSON:', credentialsJson ? 'SET (JSON)' : 'NOT SET');
  
  if (!credentialsPath && !credentialsJson) {
    const error = 'GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable must be set';
    console.error('❌', error);
    throw new Error(error);
  }

  try {
    if (credentialsJson) {
      // Use JSON credentials directly (for Vercel/serverless environments)
      console.log('  Using JSON credentials from environment variable...');
      console.log('  JSON length:', credentialsJson.length, 'characters');
      console.log('  JSON preview (first 200 chars):', credentialsJson.substring(0, 200));
      
      let credentials: any;
      try {
        // In Vercel, JSON might be stored as a string that needs parsing
        // It could be:
        // 1. Direct JSON object: {"type": "service_account", ...}
        // 2. JSON-escaped string: "{\"type\": \"service_account\", ...}"
        // 3. Already parsed object (unlikely but possible)
        
        if (typeof credentialsJson === 'string') {
          // Remove any leading/trailing whitespace
          let trimmedJson = credentialsJson.trim();
          
          console.log('  First character:', trimmedJson.charAt(0));
          console.log('  Last character:', trimmedJson.charAt(trimmedJson.length - 1));
          
          // Check if it's a JSON-escaped string (starts and ends with quotes)
          if (trimmedJson.startsWith('"') && trimmedJson.endsWith('"')) {
            console.log('  JSON appears to be double-quoted string, parsing first level...');
            try {
              // First parse: get the actual JSON string
              const firstParse = JSON.parse(trimmedJson);
              
              if (typeof firstParse === 'string') {
                console.log('  First parse returned string, parsing second level...');
                // Second parse: get the actual object
                credentials = JSON.parse(firstParse);
              } else {
                // First parse returned an object (shouldn't happen but handle it)
                console.log('  First parse returned object, using directly');
                credentials = firstParse;
              }
            } catch (firstParseError: any) {
              console.error('  First parse failed:', firstParseError.message);
              // If first parse fails, maybe it's not double-encoded, try direct parse
              console.log('  Trying direct parse instead...');
              credentials = JSON.parse(trimmedJson);
            }
          } else if (trimmedJson.startsWith('{') && trimmedJson.endsWith('}')) {
            // Direct JSON object
            console.log('  JSON appears to be direct object, parsing...');
            credentials = JSON.parse(trimmedJson);
          } else {
            // Try to parse anyway - might work
            console.log('  JSON format unclear, attempting direct parse...');
            credentials = JSON.parse(trimmedJson);
          }
        } else {
          // Already an object (shouldn't happen in Vercel, but handle it anyway)
          console.log('  Credentials already an object, using directly');
          credentials = credentialsJson;
        }
      } catch (parseError: any) {
        console.error('❌ Error parsing JSON credentials:', parseError.message);
        console.error('  Error position:', parseError.position);
        if (parseError.position !== undefined) {
          const start = Math.max(0, parseError.position - 100);
          const end = Math.min(credentialsJson.length, parseError.position + 100);
          console.error('  JSON snippet around error:', credentialsJson.substring(start, end));
          console.error('  Error marker position:', ' '.repeat(Math.min(100, parseError.position - start)) + '^');
        } else {
          console.error('  JSON preview:', credentialsJson.substring(0, 500));
        }
        throw new Error(`Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON: ${parseError.message}. The JSON might be double-encoded or invalid. Please check that you copied the entire JSON object from the credentials file, including the opening { and closing }.`);
      }
      
      console.log('  Credentials parsed. Type:', credentials.type, 'Project ID:', credentials.project_id);
      console.log('  Client email:', credentials.client_email);
      console.log('  Has private_key:', !!credentials.private_key, 'Length:', credentials.private_key?.length || 0);
      
      if (!credentials.type || !credentials.project_id || !credentials.private_key || !credentials.client_email) {
        const missingFields = [];
        if (!credentials.type) missingFields.push('type');
        if (!credentials.project_id) missingFields.push('project_id');
        if (!credentials.private_key) missingFields.push('private_key');
        if (!credentials.client_email) missingFields.push('client_email');
        console.error('❌ Invalid credentials structure. Missing fields:', missingFields.join(', '));
        throw new Error(`Invalid credentials structure. Missing required fields: ${missingFields.join(', ')}`);
      }
      
      // Process private_key: replace escaped newlines with actual newlines
      // This handles cases where JSON has \\n instead of \n
      let processedPrivateKey = credentials.private_key;
      if (typeof processedPrivateKey === 'string') {
        // Replace \\n with actual newlines (handle both escaped and double-escaped)
        processedPrivateKey = processedPrivateKey.replace(/\\n/g, '\n').replace(/\\\\n/g, '\n');
        // Ensure the private key starts with BEGIN and ends with END
        if (!processedPrivateKey.includes('BEGIN PRIVATE KEY')) {
          console.warn('⚠️  Private key format might be incorrect (missing BEGIN PRIVATE KEY)');
        }
      }
      
      console.log('  Credentials processed successfully. Project ID:', credentials.project_id);
      
      // Use the full credentials object with processed private_key
      const processedCredentials = {
        ...credentials,
        private_key: processedPrivateKey,
      };
      
      try {
        ttsClient = new TextToSpeechClient({
          credentials: processedCredentials,
          projectId: credentials.project_id,
        });
        console.log('✅ TTS client initialized successfully with JSON credentials');
      } catch (initError: any) {
        console.error('❌ Error creating TextToSpeechClient:', initError.message);
        console.error('  Error code:', initError.code);
        throw new Error(`Failed to create TextToSpeechClient: ${initError.message}. Check that credentials are valid and Text-to-Speech API is enabled.`);
      }
    } else if (credentialsPath) {
      // Use keyFilename (for local development)
      console.log('  Using keyFilename:', credentialsPath);
      try {
        ttsClient = new TextToSpeechClient({
          keyFilename: credentialsPath,
        });
        console.log('✅ TTS client initialized successfully with keyFilename');
      } catch (fileError: any) {
        console.error('❌ Error reading credentials file:', fileError.message);
        throw new Error(`Failed to read credentials file from ${credentialsPath}: ${fileError.message}`);
      }
    }
  } catch (error: any) {
    console.error('❌ Error initializing TTS client:', error);
    console.error('  Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    throw new Error(`Failed to initialize TTS client: ${error.message}`);
  }

  if (!ttsClient) {
    throw new Error('TTS client is null after initialization');
  }

  return ttsClient;
}

// European Portuguese voice (Female)
const VOICE_CONFIG = {
  languageCode: 'pt-PT',
  name: 'pt-PT-Wavenet-B',
  ssmlGender: 'FEMALE' as const,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      text: string;
      lessonId: string;
      taskId?: string;
      blockId?: string;
      itemId?: string;
    };
    const { text, lessonId, taskId, blockId, itemId } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (!lessonId) {
      return NextResponse.json(
        { error: 'lessonId is required' },
        { status: 400 }
      );
    }

    const textToGenerate = text.trim();

    // Generate audio using Google TTS
    let audioBuffer: Buffer;
    try {
      console.log('🎵 Generating audio for text:', textToGenerate.substring(0, 50) + '...');
      const client = getTTSClient();
      if (!client) {
        throw new Error('Failed to initialize TTS client - client is null');
      }
      
      const ttsRequest = {
        input: { text: textToGenerate },
        voice: VOICE_CONFIG,
        audioConfig: {
          audioEncoding: 'MP3' as const,
          speakingRate: 1.0,
        },
      };

      console.log('  Voice config:', VOICE_CONFIG);
      console.log('  Making TTS API call...');
      
      const [response] = await client.synthesizeSpeech(ttsRequest);
      
      if (!response.audioContent) {
        throw new Error('TTS API returned empty audio content');
      }
      
      audioBuffer = Buffer.from(response.audioContent as Uint8Array);
      console.log('✅ Audio generated successfully. Size:', audioBuffer.length, 'bytes');
    } catch (ttsError: any) {
      console.error('❌ Error generating TTS audio:', ttsError);
      console.error('  Error details:', {
        message: ttsError.message,
        code: ttsError.code,
        status: ttsError.status,
        details: ttsError.details,
        stack: ttsError.stack?.substring(0, 500),
      });
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Failed to generate audio using Google TTS';
      let hint = 'Check if GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is set correctly';
      
      if (ttsError.message?.includes('credentials') || ttsError.code === 'ENOENT' || ttsError.code === 'ENOTFOUND') {
        errorMessage = 'Google Cloud credentials are missing or invalid';
        hint = 'Please set GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable with your service account JSON credentials';
      } else if (ttsError.code === 'PERMISSION_DENIED' || ttsError.code === 7) {
        errorMessage = 'Permission denied. Check if the service account has Text-to-Speech API enabled';
        hint = 'Enable Text-to-Speech API for your Google Cloud project and grant permissions to the service account';
      } else if (ttsError.code === 'INVALID_ARGUMENT' || ttsError.code === 3) {
        errorMessage = 'Invalid request parameters';
        hint = `Check the text input and voice configuration. Error: ${ttsError.message}`;
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: ttsError.message,
          code: ttsError.code,
          hint,
        },
        { status: 500 }
      );
    }

    // Upload to Supabase Storage
    const supabase = getSupabaseAdmin();
    
    // CRITICAL: Try multiple bucket names and paths to support different configurations
    // Also support both new format (lessons/{lessonId}/audio/...) and old format (lesson-{lessonId}/word-{word}.mp3)
    let uploadData: any = null;
    let uploadError: any = null;
    let storagePath = '';
    let bucketName = 'lesson-audio';
    
    // Try new format first: lessons/{lessonId}/audio/...
    storagePath = `lessons/${lessonId}/audio/${blockId || 'block'}_${itemId || Date.now()}.mp3`;
    
    const uploadResult1 = await supabase.storage
      .from('lesson-audio')
      .upload(storagePath, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });
    
    if (uploadResult1.error) {
      console.warn('⚠️ Failed to upload to lesson-audio bucket, trying audio bucket...', uploadResult1.error);
      
      // Try old format: lesson-{lessonId}/word-{word}.mp3
      const sanitizeForUrl = (text: string) => {
        return text
          .toLowerCase()
          .trim()
          .replace(/[^\w\s\-àáâãäåèéêëìíîïòóôõöùúûüçñ]/g, '')
          .replace(/[àáâãäå]/g, 'a')
          .replace(/[èéêë]/g, 'e')
          .replace(/[ìíîï]/g, 'i')
          .replace(/[òóôõö]/g, 'o')
          .replace(/[ùúûü]/g, 'u')
          .replace(/[ç]/g, 'c')
          .replace(/[ñ]/g, 'n')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 100);
      };
      
      const wordSanitized = sanitizeForUrl(textToGenerate);
      storagePath = `lesson-${lessonId}/lesson-${lessonId}-word-${wordSanitized}.mp3`;
      bucketName = 'audio';
      
      const uploadResult2 = await supabase.storage
        .from('audio')
        .upload(storagePath, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true,
        });
      
      if (uploadResult2.error) {
        uploadError = uploadResult2.error;
        console.error('❌ Error uploading to audio bucket:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload audio', details: uploadError.message, hint: 'Check if storage buckets "lesson-audio" or "audio" exist and are configured correctly' },
          { status: 500 }
        );
      } else {
        uploadData = uploadResult2.data;
      }
    } else {
      uploadData = uploadResult1.data;
    }

    // Get public URL from the bucket that succeeded
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(storagePath);

    if (!publicUrl) {
      console.error('Failed to get public URL for uploaded audio');
      return NextResponse.json(
        { error: 'Failed to get public URL for audio file' },
        { status: 500 }
      );
    }

    // Save to audio_files table (optional - don't fail if this fails)
    let audioFile = null;
    try {
      const audioFileData: any = {
        lesson_id: parseInt(lessonId),
        text_pt: textToGenerate,
        audio_url: publicUrl,
        storage_path: storagePath,
        generation_method: 'tts',
        generated_at: new Date().toISOString(),
      };

      if (taskId) audioFileData.task_id = parseInt(taskId);
      if (blockId) audioFileData.block_id = blockId;
      if (itemId) audioFileData.item_id = itemId;

      const { data: audioFileResult, error: dbError } = await supabase
        .from('audio_files')
        .upsert(audioFileData, {
          onConflict: 'lesson_id,task_id,block_id,item_id',
        })
        .select()
        .maybeSingle();

      if (dbError) {
        console.error('Error saving audio file record (non-critical):', dbError);
      } else {
        audioFile = audioFileResult;
      }
    } catch (dbError) {
      console.error('Error saving audio file record (non-critical):', dbError);
      // Don't fail the request, audio is already uploaded
    }

    // CRITICAL: Update phrases table - this is how the frontend finds audio URLs
    // NOTE: phrases table does not have lesson_id column, so we save only portuguese_text and audio_url
    // If the same word appears in multiple lessons, they will share the same audio (which is correct)
    // First, check if phrase exists, then update or insert
    try {
      // Check if phrase with this text already exists
      const { data: existingPhrase, error: checkError } = await supabase
        .from('phrases')
        .select('id, audio_url')
        .eq('portuguese_text', textToGenerate)
        .limit(1)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found (OK)
        console.error('❌ Error checking existing phrase:', checkError);
      } else if (existingPhrase) {
        // Update existing phrase with new audio URL
        const { error: updateError } = await supabase
          .from('phrases')
          .update({ audio_url: publicUrl })
          .eq('id', existingPhrase.id);
        
        if (updateError) {
          console.error('❌ Error updating existing phrase:', updateError);
        } else {
          console.log('✅ Audio URL updated in phrases table for existing phrase');
        }
      } else {
        // Insert new phrase with audio URL
        const { error: insertError } = await supabase
          .from('phrases')
          .insert({
            portuguese_text: textToGenerate,
            audio_url: publicUrl,
          });
        
        if (insertError) {
          console.error('❌ Error inserting new phrase:', insertError);
        } else {
          console.log('✅ Audio URL saved to phrases table for new phrase');
        }
      }
    } catch (phraseError) {
      console.error('❌ Exception updating phrases table:', phraseError);
      // Don't fail the request - audio is already uploaded
    }

    console.log('✅ Audio generation complete!');
    console.log('   Public URL:', publicUrl);
    console.log('   Storage path:', storagePath);
    console.log('   Bucket:', bucketName);
    console.log('   Lesson ID:', lessonId);
    console.log('   Text:', textToGenerate);
    console.log('   Upload data:', uploadData);
    
    // CRITICAL: Log URL structure for debugging
    console.log('   URL structure check:');
    console.log('     - URL starts with https:', publicUrl.startsWith('https://'));
    console.log('     - URL contains supabase.co:', publicUrl.includes('supabase.co'));
    console.log('     - URL contains storage:', publicUrl.includes('storage'));
    console.log('     - URL contains bucket:', publicUrl.includes(bucketName));
    
    return NextResponse.json({
      success: true,
      audioUrl: publicUrl,
      storagePath,
      bucket: bucketName,
      audioFile,
      lessonId,
      text: textToGenerate,
      message: 'Audio generated and uploaded successfully',
    });
  } catch (error: any) {
    console.error('Error generating audio:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate audio', 
        details: error.message,
        hint: error.hint || 'Check server logs for more details'
      },
      { status: 500 }
    );
  }
}

