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
      {/* Dossier masthead */}
      <div className="animate-fade-in">
        <div className="mb-3 flex items-center justify-between">
          <span className="label">// DOSSIER</span>
          <span className="label text-paper-faint">№ ████–██</span>
        </div>
        <div className="border-y border-noir-700 py-5 text-center">
          <span className="mb-3 inline-flex animate-flicker text-amber">
            <svg
              viewBox="0 0 24 24"
              className="h-11 w-11"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              aria-hidden
            >
              <circle cx="12" cy="12" r="8" />
              <path d="M12 1v5M12 18v5M1 12h5M18 12h5" />
              <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <h2 className="text-3xl font-extrabold tracking-[0.08em] text-paper">{t('app.title')}</h2>
          <p className="label mt-2 normal-case tracking-[0.15em]">{t('app.tagline')}</p>
        </div>
      </div>

      {/* Codename */}
      <Card>
        <label className="label mb-2 block">{t('home.namePlaceholder')}</label>
        <input
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('home.namePlaceholder')}
          maxLength={16}
          autoComplete="nickname"
          enterKeyHint="done"
        />
      </Card>

      {/* Open a new case */}
      <Card>
        <h3 className="label mb-3 text-paper">{t('home.createTitle')}</h3>
        <Button onClick={handleCreate} disabled={busy !== null}>
          {busy === 'create' ? t('common.loading') : t('home.createButton')}
        </Button>
      </Card>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-noir-700" />
        <span className="label">{t('home.orDivider')}</span>
        <span className="h-px flex-1 bg-noir-700" />
      </div>

      {/* Join by case № */}
      <Card>
        <h3 className="label mb-3 text-paper">{t('home.joinTitle')}</h3>
        <input
          className="field mb-3 text-center text-2xl font-bold uppercase tracking-[0.4em] text-amber"
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

      <p className="label px-2 text-center normal-case leading-relaxed text-paper-faint">
        {t('home.hint')}
      </p>
    </Screen>
  );
}
