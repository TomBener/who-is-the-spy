import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameConfig, RoomState } from '@spy/shared';
import { CATEGORIES, MIN_PLAYERS } from '@spy/shared';
import Screen from '@/components/Screen';
import Card from '@/components/Card';
import Button from '@/components/Button';
import QRCode from '@/components/QRCode';
import PlayerList from '@/components/PlayerList';
import NumberStepper from '@/components/NumberStepper';
import { socket } from '@/lib/socket';

interface Props {
  roomState: RoomState;
  isHost: boolean;
  selfId: string;
}

const TIMER_OPTIONS = [0, 30, 60, 90];

export default function LobbyScreen({ roomState, isHost, selfId }: Props) {
  const { t, i18n } = useTranslation();
  const [copied, setCopied] = useState(false);

  const lang: 'zh' | 'en' = i18n.language?.startsWith('en') ? 'en' : 'zh';
  const joinUrl = `${window.location.origin}/?code=${roomState.code}`;
  const playerCount = roomState.players.length;
  const config = roomState.config;

  // Roles must leave at least one civilian, so cap specials at total - 1.
  const specialMax = Math.max(0, playerCount - 1);
  const specialUsed = config.undercoverCount + config.blankCount;

  const canStart = playerCount >= MIN_PLAYERS && specialUsed < playerCount;
  const remaining = Math.max(0, MIN_PLAYERS - playerCount);

  const patchConfig = (patch: Partial<GameConfig>) => {
    socket.emit('game:config', { config: patch });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the code is shown on screen anyway */
    }
  };

  return (
    <Screen>
      {/* Room code + QR */}
      <Card className="flex flex-col items-center gap-4 text-center">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">
            {t('common.roomCode')}
          </p>
          <p className="mt-1 font-mono text-5xl font-extrabold tracking-[0.3em] text-brand-200">
            {roomState.code}
          </p>
        </div>
        <div className="rounded-3xl bg-white p-3 shadow-lg">
          <QRCode value={joinUrl} size={184} />
        </div>
        <p className="text-xs text-slate-400">{t('lobby.scanToJoin')}</p>
        <Button variant="secondary" size="md" onClick={handleCopy}>
          {copied ? `✓ ${t('common.copied')}` : t('lobby.copyLink')}
        </Button>
      </Card>

      {/* Players */}
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-slate-200">
          {t('lobby.playersCount', { count: playerCount })}
        </h3>
        <PlayerList players={roomState.players} selfId={selfId} />
      </Card>

      {/* Host config */}
      {isHost ? (
        <>
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-slate-200">
              {t('lobby.configTitle')}
            </h3>
            <div className="flex flex-col gap-4">
              <NumberStepper
                label={t('lobby.undercover')}
                value={config.undercoverCount}
                min={0}
                max={Math.max(0, specialMax - config.blankCount)}
                onChange={(v) => patchConfig({ undercoverCount: v })}
              />
              <NumberStepper
                label={t('lobby.blank')}
                value={config.blankCount}
                min={0}
                max={Math.max(0, specialMax - config.undercoverCount)}
                onChange={(v) => patchConfig({ blankCount: v })}
              />

              {/* Category */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-200">{t('lobby.category')}</span>
                <select
                  className="rounded-xl bg-ink-700 px-3 py-2 text-sm text-white ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-brand-400"
                  value={config.category}
                  onChange={(e) => patchConfig({ category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label[lang]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Timer */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-200">{t('lobby.timer')}</span>
                <select
                  className="rounded-xl bg-ink-700 px-3 py-2 text-sm text-white ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-brand-400"
                  value={config.descriptionTimer}
                  onChange={(e) =>
                    patchConfig({ descriptionTimer: Number(e.target.value) })
                  }
                >
                  {TIMER_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s === 0 ? t('lobby.timerOff') : t('lobby.timerSeconds', { count: s })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-2">
            <Button onClick={() => socket.emit('game:start')} disabled={!canStart}>
              {t('lobby.start')}
            </Button>
            {playerCount < MIN_PLAYERS && (
              <p className="text-center text-xs text-amber-300/90">
                {t('lobby.needMore', { min: MIN_PLAYERS, remaining })}
              </p>
            )}
            {playerCount >= MIN_PLAYERS && specialUsed >= playerCount && (
              <p className="text-center text-xs text-amber-300/90">
                {t('lobby.tooManySpecial')}
              </p>
            )}
          </div>
        </>
      ) : (
        <Card className="text-center">
          <p className="text-base font-semibold text-slate-100">
            {t('lobby.waitingHost')}
          </p>
          <p className="mt-1 text-sm text-slate-400">{t('lobby.waitingHostHint')}</p>
        </Card>
      )}
    </Screen>
  );
}
