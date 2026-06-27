import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { RoomState } from '@spy/shared';
import Screen from '@/components/Screen';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { socket } from '@/lib/socket';

interface Props {
  roomState: RoomState;
  isHost: boolean;
}

export default function ResultScreen({ roomState, isHost }: Props) {
  const { t } = useTranslation();
  const { winner, revealWords, eliminated } = roomState;

  const civiliansWin = winner === 'civilians';
  // If an eliminated 白板 ended the game, they pulled off the comeback.
  const blankComeback = winner === 'undercover' && eliminated?.role === 'blank';

  return (
    <Screen center>
      <Card
        className={clsx(
          'flex flex-col items-center gap-3 text-center animate-pop-in',
          civiliansWin
            ? 'bg-gradient-to-br from-emerald-600 to-teal-700'
            : 'bg-gradient-to-br from-rose-600 to-brand-700',
        )}
      >
        <span className="text-6xl">{civiliansWin ? '🎉' : '🕵️'}</span>
        <h2 className="text-3xl font-extrabold text-white">
          {civiliansWin ? t('result.civiliansWin') : t('result.undercoverWin')}
        </h2>
        <p className="text-sm text-white/90">
          {civiliansWin
            ? t('result.civiliansWinBody')
            : blankComeback
              ? t('result.blankWinBody')
              : t('result.undercoverWinBody')}
        </p>
      </Card>

      {revealWords && (
        <Card>
          <h3 className="mb-3 text-center text-sm font-semibold text-slate-200">
            {t('result.words')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-emerald-500/15 p-3 text-center ring-1 ring-emerald-400/30">
              <p className="text-xs uppercase tracking-widest text-emerald-300/90">
                {t('result.civilianWord')}
              </p>
              <p className="mt-1 break-all text-lg font-bold text-white">
                {revealWords.civilian}
              </p>
            </div>
            <div className="rounded-2xl bg-rose-500/15 p-3 text-center ring-1 ring-rose-400/30">
              <p className="text-xs uppercase tracking-widest text-rose-300/90">
                {t('result.undercoverWord')}
              </p>
              <p className="mt-1 break-all text-lg font-bold text-white">
                {revealWords.undercover}
              </p>
            </div>
          </div>
        </Card>
      )}

      {isHost && (
        <Button onClick={() => socket.emit('game:restart')}>
          {t('result.playAgain')}
        </Button>
      )}
    </Screen>
  );
}
