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

  const fieldSelect =
    'field cursor-pointer appearance-none pr-9 text-sm';

  return (
    <Screen>
      {/* Masthead */}
      <div className="flex items-center justify-between">
        <span className="label">// BRIEFING</span>
        <span className="label text-paper-faint">{t('lobby.title')}</span>
      </div>

      {/* Case № + clearance pass */}
      <Card className="flex flex-col items-center gap-4 text-center">
        <div>
          <span className="label text-paper-faint">№ · {t('common.roomCode')}</span>
          <p className="code mt-1.5 text-5xl font-extrabold">{roomState.code}</p>
        </div>
        <QRCode value={joinUrl} size={172} />
        <p className="label normal-case text-paper-dim">{t('lobby.scanToJoin')}</p>
        <Button variant="secondary" size="md" onClick={handleCopy}>
          {copied ? (
            <span className="inline-flex items-center gap-2">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <path d="M3 8.5l3.2 3.2L13 4.5" />
              </svg>
              {t('common.copied')}
            </span>
          ) : (
            t('lobby.copyLink')
          )}
        </Button>
      </Card>

      {/* Roster */}
      <Card>
        <h3 className="label mb-3 text-paper">
          {t('lobby.playersCount', { count: playerCount })}
        </h3>
        <PlayerList players={roomState.players} selfId={selfId} />
      </Card>

      {/* Host config */}
      {isHost ? (
        <>
          <Card>
            <h3 className="label mb-4 text-paper">// PARAMETERS</h3>
            <div className="flex flex-col gap-4">
              <NumberStepper
                label={t('lobby.undercover')}
                value={config.undercoverCount}
                min={1}
                max={Math.max(1, specialMax - config.blankCount)}
                onChange={(v) => patchConfig({ undercoverCount: v })}
              />
              <NumberStepper
                label={t('lobby.blank')}
                value={config.blankCount}
                min={0}
                max={Math.max(0, specialMax - config.undercoverCount)}
                onChange={(v) => patchConfig({ blankCount: v })}
              />

              <span className="h-px bg-noir-700" />

              {/* Category */}
              <div className="flex items-center justify-between gap-3">
                <span className="label text-paper-dim">{t('lobby.category')}</span>
                <div className="relative">
                  <select
                    className={fieldSelect}
                    value={config.category}
                    onChange={(e) => patchConfig({ category: e.target.value })}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label[lang]}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-amber">
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                      <path d="M4 6l4 4 4-4" />
                    </svg>
                  </span>
                </div>
              </div>

              {/* Timer */}
              <div className="flex items-center justify-between gap-3">
                <span className="label text-paper-dim">{t('lobby.timer')}</span>
                <div className="relative">
                  <select
                    className={fieldSelect}
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
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-amber">
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                      <path d="M4 6l4 4 4-4" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-2">
            <Button onClick={() => socket.emit('game:start')} disabled={!canStart}>
              {t('lobby.start')}
            </Button>
            {playerCount < MIN_PLAYERS && (
              <p className="label text-center normal-case text-amber">
                {t('lobby.needMore', { min: MIN_PLAYERS, remaining })}
              </p>
            )}
            {playerCount >= MIN_PLAYERS && specialUsed >= playerCount && (
              <p className="label text-center normal-case text-amber">
                {t('lobby.tooManySpecial')}
              </p>
            )}
          </div>
        </>
      ) : (
        <Card className="text-center">
          <span className="label text-amber">待命 · STANDBY</span>
          <p className="mt-2 text-paper">{t('lobby.waitingHost')}</p>
          <p className="mt-1 text-sm text-paper-dim">{t('lobby.waitingHostHint')}</p>
        </Card>
      )}
    </Screen>
  );
}
