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
  
  if (!credentialsPath && !credentialsJson) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable must be set');
  }

  try {
    if (credentialsJson) {
      // Use JSON credentials directly (for Vercel/serverless environments)
      const credentials = JSON.parse(credentialsJson);
      ttsClient = new TextToSpeechClient({
        credentials,
      });
    } else if (credentialsPath) {
      // Use keyFilename (for local development)
      ttsClient = new TextToSpeechClient({
        keyFilename: credentialsPath,
      });
    }
  } catch (error: any) {
    console.error('Error initializing TTS client:', error);
    throw new Error(`Failed to initialize TTS client: ${error.message}`);
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
      const client = getTTSClient();
      if (!client) {
        throw new Error('Failed to initialize TTS client');
      }
      
      const ttsRequest = {
        input: { text: textToGenerate },
        voice: VOICE_CONFIG,
        audioConfig: {
          audioEncoding: 'MP3' as const,
          speakingRate: 1.0,
        },
      };

      const [response] = await client.synthesizeSpeech(ttsRequest);
      audioBuffer = Buffer.from(response.audioContent as Uint8Array);
    } catch (ttsError: any) {
      console.error('Error generating TTS audio:', ttsError);
      return NextResponse.json(
        { 
          error: 'Failed to generate audio using Google TTS', 
          details: ttsError.message,
          hint: 'Check if GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is set correctly'
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

    // Also update phrases table for compatibility (optional - don't fail if this fails)
    try {
      await supabase
        .from('phrases')
        .upsert({
          portuguese_text: textToGenerate,
          audio_url: publicUrl,
          lesson_id: lessonId,
        }, {
          onConflict: 'portuguese_text',
        });
    } catch (phraseError) {
      console.error('Error updating phrases table (non-critical):', phraseError);
      // Don't fail the request
    }

    return NextResponse.json({
      success: true,
      audioUrl: publicUrl,
      storagePath,
      bucket: bucketName,
      audioFile,
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

