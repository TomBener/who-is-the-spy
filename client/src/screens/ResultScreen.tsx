import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { RoomState } from '@spy/shared';
import Screen from '@/components/Screen';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Stamp from '@/components/Stamp';
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
      <Card className="flex flex-col items-center gap-4 text-center">
        <Stamp color={civiliansWin ? 'amber' : 'alert'} className="animate-stamp-in text-base">
          结案 · CASE CLOSED
        </Stamp>
        <h2
          className={clsx(
            'text-3xl font-extrabold tracking-[0.06em]',
            civiliansWin ? 'text-paper' : 'text-alert',
          )}
        >
          {civiliansWin ? t('result.civiliansWin') : t('result.undercoverWin')}
        </h2>
        <p className="text-sm text-paper-dim">
          {civiliansWin
            ? t('result.civiliansWinBody')
            : blankComeback
              ? t('result.blankWinBody')
              : t('result.undercoverWinBody')}
        </p>
      </Card>

      {revealWords && (
        <Card>
          <h3 className="label mb-3 text-center text-paper">{t('result.words')}</h3>
          <div className="grid grid-cols-2 gap-px bg-noir-700">
            <div className="bg-noir-850 p-4 text-center">
              <p className="label text-paper-faint">{t('result.civilianWord')}</p>
              <p className="mt-2 break-all font-mono text-lg font-bold text-paper">
                {revealWords.civilian}
              </p>
            </div>
            <div className="bg-noir-850 p-4 text-center">
              <p className="label text-alert/80">{t('result.undercoverWord')}</p>
              <p className="mt-2 break-all font-mono text-lg font-bold text-alert">
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
