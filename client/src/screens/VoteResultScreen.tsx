import { useTranslation } from 'react-i18next';
import type { RoomState, Role } from '@spy/shared';
import Screen from '@/components/Screen';
import Card from '@/components/Card';
import Button from '@/components/Button';
import PlayerList from '@/components/PlayerList';
import { socket } from '@/lib/socket';

interface Props {
  roomState: RoomState;
  isHost: boolean;
  selfId: string;
}

const roleEmoji: Record<Role, string> = {
  civilian: '🧑',
  undercover: '🕵️',
  blank: '🎭',
};

export default function VoteResultScreen({ roomState, isHost, selfId }: Props) {
  const { t } = useTranslation();
  const { eliminated, players } = roomState;

  return (
    <Screen center>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">{t('voteResult.title')}</h2>
      </div>

      {eliminated ? (
        <Card className="flex flex-col items-center gap-3 text-center animate-pop-in">
          <span className="text-5xl">{roleEmoji[eliminated.role]}</span>
          <p className="text-xl font-extrabold text-white">
            {t('voteResult.eliminated', { name: eliminated.name })}
          </p>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs uppercase tracking-widest text-slate-400">
              {t('voteResult.wasRole')}
            </span>
            <span className="rounded-full bg-brand-500/20 px-3 py-1 text-sm font-bold text-brand-200">
              {t(`roles.${eliminated.role}`)}
            </span>
          </div>
          <p className="text-sm text-slate-300">
            {eliminated.word
              ? t('voteResult.theirWord', { word: eliminated.word })
              : t('voteResult.noWord')}
          </p>
        </Card>
      ) : (
        // Tie: server reports no elimination this round.
        <Card className="flex flex-col items-center gap-2 text-center animate-pop-in">
          <span className="text-5xl">🤝</span>
          <p className="text-xl font-bold text-white">{t('voteResult.tie')}</p>
          <p className="text-sm text-slate-400">{t('voteResult.tieBody')}</p>
        </Card>
      )}

      {/* Vote tally */}
      <Card>
        <PlayerList players={players} selfId={selfId} showVotesReceived />
      </Card>

      {isHost && (
        <Button onClick={() => socket.emit('phase:next')}>
          {t('voteResult.continue')}
        </Button>
      )}
    </Screen>
  );
}
