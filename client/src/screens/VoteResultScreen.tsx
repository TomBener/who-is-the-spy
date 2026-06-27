import { useTranslation } from 'react-i18next';
import type { RoomState, Role } from '@spy/shared';
import Screen from '@/components/Screen';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Stamp from '@/components/Stamp';
import PlayerList from '@/components/PlayerList';
import { socket } from '@/lib/socket';

interface Props {
  roomState: RoomState;
  isHost: boolean;
  selfId: string;
}

// Civilian reads "cleared" (paper); undercover / Mr.White are the catch (alert).
const roleTone: Record<Role, 'paper' | 'alert'> = {
  civilian: 'paper',
  undercover: 'alert',
  blank: 'alert',
};

export default function VoteResultScreen({ roomState, isHost, selfId }: Props) {
  const { t } = useTranslation();
  const { eliminated, players } = roomState;

  return (
    <Screen center>
      <div className="text-center">
        <span className="label">// {t('voteResult.title')}</span>
      </div>

      {eliminated ? (
        <Card className="flex flex-col items-center gap-4 text-center">
          <Stamp color={roleTone[eliminated.role]} className="animate-stamp-in">
            {t(`roles.${eliminated.role}`)}
          </Stamp>
          <p className="text-xl font-extrabold text-paper">
            {t('voteResult.eliminated', { name: eliminated.name })}
          </p>
          <div className="flex flex-col items-center gap-1.5">
            <span className="label text-paper-faint">{t('voteResult.wasRole')}</span>
            <span className="font-mono text-base font-bold text-amber">
              {eliminated.word
                ? eliminated.word
                : t('voteResult.noWord')}
            </span>
          </div>
        </Card>
      ) : (
        // Tie: server reports no elimination this round.
        <Card className="flex flex-col items-center gap-3 text-center">
          <Stamp color="paper" className="animate-stamp-in">
            {t('voteResult.tie')}
          </Stamp>
          <p className="text-sm text-paper-dim">{t('voteResult.tieBody')}</p>
        </Card>
      )}

      {/* Vote tally */}
      <Card>
        <h3 className="label mb-3 text-paper">{t('voteResult.title')}</h3>
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
