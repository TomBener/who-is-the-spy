import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Toast from '@/components/Toast';
import HomeScreen from '@/screens/HomeScreen';
import LobbyScreen from '@/screens/LobbyScreen';
import RevealScreen from '@/screens/RevealScreen';
import DescribeScreen from '@/screens/DescribeScreen';
import VoteScreen from '@/screens/VoteScreen';
import VoteResultScreen from '@/screens/VoteResultScreen';
import BlankGuessScreen from '@/screens/BlankGuessScreen';
import ResultScreen from '@/screens/ResultScreen';
import { resumeSession } from '@/lib/socket';
import { bindSocket, useStore } from '@/store';

export default function App() {
  const { i18n } = useTranslation();
  const connected = useStore((s) => s.connected);
  const playerId = useStore((s) => s.playerId);
  const roomState = useStore((s) => s.roomState);
  const secret = useStore((s) => s.secret);

  // Idempotent — bindSocket() also runs from main.tsx; guarded internally.
  useEffect(() => {
    bindSocket();
  }, []);

  // On a fresh page load, silently re-join the room from the last session
  // (reload / PWA relaunch) so mid-game players don't land back on Home.
  useEffect(() => {
    void resumeSession(playerId);
    // Boot-time only: playerId is stable for the life of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep <html lang> in sync with the active language.
  useEffect(() => {
    const lng = i18n.language?.startsWith('en') ? 'en' : 'zh';
    document.documentElement.lang = lng;
  }, [i18n.language]);

  const me = roomState?.players.find((p) => p.id === playerId);
  const isHost = !!me?.isHost;

  const renderScreen = () => {
    if (!roomState) return <HomeScreen />;

    switch (roomState.phase) {
      case 'lobby':
        return <LobbyScreen roomState={roomState} isHost={isHost} selfId={playerId} />;
      case 'reveal':
        return <RevealScreen secret={secret} isHost={isHost} />;
      case 'describe':
        return (
          <DescribeScreen
            roomState={roomState}
            secret={secret}
            isHost={isHost}
            selfId={playerId}
          />
        );
      case 'vote':
        return (
          <VoteScreen
            roomState={roomState}
            secret={secret}
            isHost={isHost}
            selfId={playerId}
          />
        );
      case 'voteResult':
        return (
          <VoteResultScreen roomState={roomState} isHost={isHost} selfId={playerId} />
        );
      case 'blankGuess':
        return <BlankGuessScreen roomState={roomState} selfId={playerId} />;
      case 'ended':
        return <ResultScreen roomState={roomState} isHost={isHost} />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <>
      <Header />
      {/* Subtle reconnecting banner — only meaningful once we're in a room
          (on Home there is no socket to reconnect). */}
      {!connected && roomState && (
        <div className="safe-x z-10">
          <div className="mx-auto -mt-1 mb-1 w-full max-w-md">
            <ReconnectBanner />
          </div>
        </div>
      )}
      {renderScreen()}
      <footer className="safe-x safe-bottom pt-1 text-center">
        <span className="label normal-case tracking-[0.14em] text-paper-dim">
          Built by Fable 5
        </span>
      </footer>
      <Toast />
    </>
  );
}

function ReconnectBanner() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center gap-2 rounded-full bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-200 ring-1 ring-amber-400/30">
      <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
      {t('common.offline')}
    </div>
  );
}
