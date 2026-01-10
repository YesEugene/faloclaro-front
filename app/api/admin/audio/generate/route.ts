import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

// Initialize Google Cloud TTS client
let ttsClient: TextToSpeechClient | null = null;

function getTTSClient() {
  if (ttsClient) return ttsClient;

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable is not set');
  }

  ttsClient = new TextToSpeechClient({
    keyFilename: credentialsPath,
  });

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
    const client = getTTSClient();
    const ttsRequest = {
      input: { text: textToGenerate },
      voice: VOICE_CONFIG,
      audioConfig: {
        audioEncoding: 'MP3' as const,
        speakingRate: 1.0,
      },
    };

    const [response] = await client.synthesizeSpeech(ttsRequest);
    const audioBuffer = Buffer.from(response.audioContent as Uint8Array);

    // Upload to Supabase Storage
    const supabase = getSupabaseAdmin();
    const storagePath = `lessons/${lessonId}/audio/${blockId || 'block'}_${itemId || Date.now()}.mp3`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('lesson-audio')
      .upload(storagePath, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading audio:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload audio', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('lesson-audio')
      .getPublicUrl(storagePath);

    // Save to audio_files table
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

    const { data: audioFile, error: dbError } = await supabase
      .from('audio_files')
      .upsert(audioFileData, {
        onConflict: 'lesson_id,task_id,block_id,item_id',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error saving audio file record:', dbError);
      // Don't fail the request, audio is already uploaded
    }

    // Also update phrases table for compatibility
    await supabase
      .from('phrases')
      .upsert({
        portuguese_text: textToGenerate,
        audio_url: publicUrl,
        lesson_id: lessonId,
      }, {
        onConflict: 'portuguese_text',
      });

    return NextResponse.json({
      success: true,
      audioUrl: publicUrl,
      storagePath,
      audioFile,
    });
  } catch (error) {
    console.error('Error generating audio:', error);
    return NextResponse.json(
      { error: 'Failed to generate audio', details: (error as Error).message },
      { status: 500 }
    );
  }
}

