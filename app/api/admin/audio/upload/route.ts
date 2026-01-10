import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const lessonId = formData.get('lessonId') as string;
    const taskId = formData.get('taskId') as string | null;
    const blockId = formData.get('blockId') as string | null;
    const itemId = formData.get('itemId') as string | null;
    const textPt = formData.get('textPt') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    if (!lessonId) {
      return NextResponse.json(
        { error: 'lessonId is required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      return NextResponse.json(
        { error: 'File must be an audio file' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const supabase = getSupabaseAdmin();
    const fileExt = file.name.split('.').pop() || 'mp3';
    const storagePath = `lessons/${lessonId}/audio/${blockId || 'block'}_${itemId || Date.now()}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('lesson-audio')
      .upload(storagePath, buffer, {
        contentType: file.type,
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
      text_pt: textPt || file.name,
      audio_url: publicUrl,
      storage_path: storagePath,
      generation_method: 'upload',
      uploaded_at: new Date().toISOString(),
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

    // Also update phrases table for compatibility if textPt is provided
    if (textPt) {
      await supabase
        .from('phrases')
        .upsert({
          portuguese_text: textPt,
          audio_url: publicUrl,
          lesson_id: lessonId,
        }, {
          onConflict: 'portuguese_text',
        });
    }

    return NextResponse.json({
      success: true,
      audioUrl: publicUrl,
      storagePath,
      audioFile,
    });
  } catch (error) {
    console.error('Error uploading audio:', error);
    return NextResponse.json(
      { error: 'Failed to upload audio', details: (error as Error).message },
      { status: 500 }
    );
  }
}

