import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const configured = Boolean(url && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  let status: 'ok' | 'error' | 'unconfigured' = 'unconfigured';
  let message = 'Add your Supabase keys to apps/web/.env.local';
  let wedding: { couple_name_1: string; couple_name_2: string; slug: string } | null = null;
  let guestCount = 0;

  if (configured) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('weddings')
        .select('couple_name_1, couple_name_2, slug')
        .eq('slug', 'aanya-vihaan')
        .single();

      if (error) throw error;
      wedding = data;

      const { count } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true });
      guestCount = count ?? 0;

      status = 'ok';
      message = 'Connected to Supabase 🎉';
    } catch (e) {
      status = 'error';
      // Supabase throws PostgrestError objects (not Error instances), so read .message defensively
      if (e instanceof Error) message = e.message;
      else if (e && typeof e === 'object' && 'message' in e) message = String((e as { message: unknown }).message);
      else message = 'Connection failed';
    }
  }

  const color = status === 'ok' ? '#16a34a' : status === 'error' ? '#dc2626' : '#d97706';

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        fontFamily: 'system-ui, sans-serif',
        background: 'linear-gradient(160deg,#fff,#ffeaf6)',
        padding: 24,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 22,
          padding: '36px 40px',
          maxWidth: 460,
          width: '100%',
          boxShadow: '0 24px 60px -28px rgba(214,46,126,.5)',
        }}
      >
        <h1 style={{ fontSize: 26, marginBottom: 4 }}>🎪 Wedding Carnival</h1>
        <p style={{ color: '#6b4760', marginBottom: 20 }}>Backend connection check</p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            borderRadius: 12,
            background: `${color}14`,
            color,
            fontWeight: 600,
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
          {message}
        </div>

        {status === 'ok' && wedding && (
          <div style={{ marginTop: 20, lineHeight: 1.8 }}>
            <div>
              <strong>Seeded wedding:</strong> {wedding.couple_name_1} &amp;{' '}
              {wedding.couple_name_2}
            </div>
            <div>
              <strong>Slug:</strong> <code>/{wedding.slug}</code>
            </div>
            <div>
              <strong>Guests so far:</strong> {guestCount}
            </div>
          </div>
        )}

        {status === 'unconfigured' && (
          <ol style={{ marginTop: 20, paddingLeft: 18, color: '#6b4760', lineHeight: 1.9 }}>
            <li>
              Copy <code>.env.local.example</code> → <code>.env.local</code>
            </li>
            <li>Paste your Project URL + anon key</li>
            <li>Run the migration in Supabase</li>
            <li>
              Restart <code>npm run dev</code>
            </li>
          </ol>
        )}
      </div>
    </main>
  );
}
