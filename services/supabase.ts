export const checkSupabaseConnection = async () => {
  try {
    const response = await fetch('/api/supabase-status');
    if (!response.ok) throw new Error('Failed to fetch status');
    return await response.json();
  } catch (err: any) {
    return { connected: false, error: err.message || 'Unknown error' };
  }
};
