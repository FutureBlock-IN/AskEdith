import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Supabase is OPTIONAL - if not configured, file uploads will be disabled
const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn('Supabase not configured - file uploads will be disabled');
}

// Create Supabase client only if configured
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// File upload utility function
export const uploadFile = async (file: File, bucket: string = 'uploads'): Promise<{ url: string; error: null } | { url: null; error: string }> => {
  try {
    if (!supabase) {
      return { url: null, error: 'Supabase is not configured. File uploads are disabled.' };
    }

    // Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    // Upload file to Supabase storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return { url: null, error: error.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return { url: publicUrl, error: null };
  } catch (error) {
    console.error('Upload exception:', error);
    return { 
      url: null, 
      error: error instanceof Error ? error.message : 'Unknown upload error'
    };
  }
};

// Optional: Additional Supabase utilities
export const deleteFile = async (fileName: string, bucket: string = 'uploads'): Promise<{ success: boolean; error: string | null }> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    const { error } = await supabase.storage
      .from(bucket)
      .remove([fileName]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown delete error'
    };
  }
};

export const listFiles = async (bucket: string = 'uploads', folder?: string): Promise<{ files: any[]; error: string | null }> => {
  try {
    if (!supabase) {
      return { files: [], error: 'Supabase is not configured' };
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder);

    if (error) {
      return { files: [], error: error.message };
    }

    return { files: data || [], error: null };
  } catch (error) {
    return { 
      files: [], 
      error: error instanceof Error ? error.message : 'Unknown list error'
    };
  }
};