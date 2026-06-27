import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Lang } from '@spy/shared';
import { ROOM_CODE_LENGTH } from '@spy/shared';
import Screen from '@/components/Screen';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { createRoom, joinRoom } from '@/lib/socket';
import { useStore } from '@/store';

const NAME_KEY = 'spy:lastName';
const inputClass =
  'w-full rounded-2xl bg-ink-900/60 px-4 py-3 text-base text-white placeholder:text-slate-500 ' +
  'ring-1 ring-white/10 outline-none transition focus:ring-2 focus:ring-brand-400';

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const playerId = useStore((s) => s.playerId);
  const setError = useStore((s) => s.setError);

  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<null | 'create' | 'join'>(null);

  // Prefill the room code from ?code=XXXX (e.g. scanned QR / shared link).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('code');
    if (fromUrl) setCode(fromUrl.toUpperCase().slice(0, ROOM_CODE_LENGTH));
  }, []);

  const rememberName = (value: string) => {
    try {
      localStorage.setItem(NAME_KEY, value.trim());
    } catch {
      /* ignore */
    }
  };

  const lang: Lang = i18n.language?.startsWith('en') ? 'en' : 'zh';

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('nameRequired');
      return;
    }
    setBusy('create');
    rememberName(trimmed);
    const res = await createRoom({ playerId, name: trimmed, lang });
    setBusy(null);
    if (!res.ok && res.error) setError(res.error);
    // On success the server emits room:state, which flips the screen.
  };

  const handleJoin = async () => {
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedName) {
      setError('nameRequired');
      return;
    }
    if (trimmedCode.length < ROOM_CODE_LENGTH) {
      setError('codeRequired');
      return;
    }
    setBusy('join');
    rememberName(trimmedName);
    const res = await joinRoom({ playerId, code: trimmedCode, name: trimmedName });
    setBusy(null);
    if (!res.ok && res.error) setError(res.error);
  };

  return (
    <Screen center>
      <div className="text-center animate-fade-in">
        <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-3xl bg-brand-500 text-4xl shadow-xl shadow-brand-900/50">
          🕵️
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          {t('app.title')}
        </h2>
        <p className="mt-2 text-sm text-slate-400">{t('app.tagline')}</p>
      </div>

      {/* Shared name input */}
      <Card>
        <label className="mb-1.5 block text-xs font-medium text-slate-400">
          {t('home.namePlaceholder')}
        </label>
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('home.namePlaceholder')}
          maxLength={16}
          autoComplete="nickname"
          enterKeyHint="done"
        />
      </Card>

      {/* Create */}
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-slate-200">
          {t('home.createTitle')}
        </h3>
        <Button onClick={handleCreate} disabled={busy !== null}>
          {busy === 'create' ? t('common.loading') : t('home.createButton')}
        </Button>
      </Card>

      <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-slate-500">
        <span className="h-px flex-1 bg-white/10" />
        {t('home.orDivider')}
        <span className="h-px flex-1 bg-white/10" />
      </div>

      {/* Join */}
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-slate-200">
          {t('home.joinTitle')}
        </h3>
        <input
          className={`${inputClass} mb-3 text-center font-mono text-2xl font-bold tracking-[0.4em] uppercase`}
          value={code}
          onChange={(e) =>
            setCode(
              e.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
                .slice(0, ROOM_CODE_LENGTH),
            )
          }
          placeholder={t('home.codePlaceholder')}
          inputMode="text"
          autoCapitalize="characters"
          maxLength={ROOM_CODE_LENGTH}
          enterKeyHint="go"
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleJoin();
          }}
        />
        <Button variant="secondary" onClick={handleJoin} disabled={busy !== null}>
          {busy === 'join' ? t('common.loading') : t('home.joinButton')}
        </Button>
      </Card>

      <p className="px-4 text-center text-xs leading-relaxed text-slate-500">
        {t('home.hint')}
      </p>
    </Screen>
  );
}
