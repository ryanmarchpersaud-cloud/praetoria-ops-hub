import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Users, Maximize2, Minimize2, AlertCircle, PhoneMissed, Phone } from 'lucide-react';
import { useCreateVideoCall, useJoinVideoCall, useEndVideoCall, useActiveVideoCall } from '@/hooks/useVideoCall';
import { useSendMessage } from '@/hooks/useMessaging';
import { MeetingNotesPanel } from './MeetingNotesPanel';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type CallState = 'idle' | 'starting' | 'connecting' | 'active' | 'ended' | 'failed' | 'permission_denied' | 'missed';

interface Props {
  conversationId: string;
  onClose?: () => void;
}

export function VideoCallPanel({ conversationId, onClose }: Props) {
  const { data: activeCall } = useActiveVideoCall(conversationId);
  const createCall = useCreateVideoCall();
  const joinCall = useJoinVideoCall();
  const endCall = useEndVideoCall();
  const sendMessage = useSendMessage();

  const [callState, setCallState] = useState<CallState>('idle');
  const [room, setRoom] = useState<any>(null);
  const [localTracks, setLocalTracks] = useState<any[]>([]);
  const [remoteParticipants, setRemoteParticipants] = useState<Map<string, any>>(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [currentRoomName, setCurrentRoomName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Post a system message to the conversation thread
  const postCallEvent = useCallback((text: string) => {
    sendMessage.mutate({
      conversationId,
      body: text,
      messageType: 'system',
    });
  }, [conversationId, sendMessage]);

  const connectToRoom = useCallback(async (token: string, roomName: string) => {
    setCallState('connecting');
    try {
      const TwilioVideo = await import('twilio-video');
      const connectedRoom = await TwilioVideo.connect(token, {
        name: roomName,
        audio: true,
        video: { width: 640, height: 480 },
        dominantSpeaker: true,
      });

      setRoom(connectedRoom);
      setCallState('active');

      // Attach local tracks
      const localParticipant = connectedRoom.localParticipant;
      const tracks: any[] = [];
      localParticipant.tracks.forEach((publication: any) => {
        if (publication.track) {
          tracks.push(publication.track);
          if (publication.track.kind === 'video' && localVideoRef.current) {
            const el = publication.track.attach();
            el.style.width = '100%';
            el.style.height = '100%';
            el.style.objectFit = 'cover';
            el.style.borderRadius = '8px';
            localVideoRef.current.appendChild(el);
          }
        }
      });
      setLocalTracks(tracks);

      // Handle remote participants
      const handleParticipantConnected = (participant: any) => {
        setRemoteParticipants(prev => new Map(prev).set(participant.sid, participant));
        participant.on('trackSubscribed', () => {
          setRemoteParticipants(prev => new Map(prev).set(participant.sid, participant));
        });
      };

      connectedRoom.participants.forEach(handleParticipantConnected);
      connectedRoom.on('participantConnected', handleParticipantConnected);
      connectedRoom.on('participantDisconnected', (participant: any) => {
        setRemoteParticipants(prev => {
          const next = new Map(prev);
          next.delete(participant.sid);
          return next;
        });
      });

      connectedRoom.on('disconnected', () => {
        setCallState('ended');
        setRoom(null);
        setRemoteParticipants(new Map());
        setLocalTracks([]);
      });

      toast.success('Connected to video call');
    } catch (err: any) {
      console.error('Failed to connect:', err);
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
        setCallState('permission_denied');
        setErrorMessage('Camera/microphone access was denied. Please allow access in your browser settings and try again.');
      } else {
        setCallState('failed');
        setErrorMessage(err.message || 'Failed to connect to video call');
      }
    }
  }, []);

  const handleStartCall = async () => {
    setCallState('starting');
    setErrorMessage(null);
    try {
      const result = await createCall.mutateAsync(conversationId);
      setCurrentCallId(result.video_call_id);
      setCurrentRoomName(result.room_name);
      postCallEvent('📹 Video call started');
      await connectToRoom(result.token, result.room_name);
    } catch (err: any) {
      setCallState('failed');
      setErrorMessage(err.message || 'Failed to start call');
    }
  };

  const handleJoinCall = async () => {
    if (!activeCall) return;
    setCallState('connecting');
    setErrorMessage(null);
    try {
      const result = await joinCall.mutateAsync({
        roomName: activeCall.room_name,
        conversationId,
      });
      setCurrentCallId(activeCall.id);
      setCurrentRoomName(activeCall.room_name);
      postCallEvent('📹 Joined video call');
      await connectToRoom(result.token, result.room_name);
    } catch (err: any) {
      setCallState('failed');
      setErrorMessage(err.message || 'Failed to join call');
    }
  };

  const handleEndCall = async () => {
    if (room) {
      room.disconnect();
    }
    if (currentRoomName) {
      try {
        await endCall.mutateAsync({ roomName: currentRoomName, conversationId });
        postCallEvent('📹 Video call ended');
      } catch (err) {
        console.error('End call error:', err);
      }
    }
    setCallState('ended');
    setRoom(null);
    setCurrentCallId(null);
    setCurrentRoomName(null);
    if (localVideoRef.current) {
      localVideoRef.current.innerHTML = '';
    }
  };

  const handleRetry = () => {
    setCallState('idle');
    setErrorMessage(null);
  };

  const toggleMute = () => {
    localTracks.forEach(track => {
      if (track.kind === 'audio') {
        if (isMuted) track.enable(); else track.disable();
      }
    });
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    localTracks.forEach(track => {
      if (track.kind === 'video') {
        if (isVideoOff) track.enable(); else track.disable();
      }
    });
    setIsVideoOff(!isVideoOff);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (room) room.disconnect();
    };
  }, [room]);

  // Render state-specific content
  const renderPreCallContent = () => {
    if (callState === 'ended') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <PhoneOff className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Call ended</p>
            <p className="text-xs text-muted-foreground mt-1">The video call has been disconnected</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="gap-2">
              Close
            </Button>
            <Button onClick={handleRetry} className="gap-2">
              <Video className="h-4 w-4" /> New Call
            </Button>
          </div>
        </div>
      );
    }

    if (callState === 'failed' || callState === 'permission_denied') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {callState === 'permission_denied' ? 'Permission Denied' : 'Connection Failed'}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
              {errorMessage}
            </p>
          </div>
          <Button onClick={handleRetry} variant="outline" className="gap-2">
            Try Again
          </Button>
        </div>
      );
    }

    if (callState === 'starting' || callState === 'connecting') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <Video className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {callState === 'starting' ? 'Starting call...' : 'Connecting...'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Setting up your camera and microphone</p>
          </div>
        </div>
      );
    }

    // idle state
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Video className="h-8 w-8 text-primary" />
        </div>
        {activeCall ? (
          <>
            <div>
              <p className="text-sm font-medium">Call in progress</p>
              <p className="text-xs text-muted-foreground mt-1">Join the active video call</p>
            </div>
            <Button onClick={handleJoinCall} disabled={joinCall.isPending} className="gap-2">
              <Phone className="h-4 w-4" />
              {joinCall.isPending ? 'Connecting...' : 'Join Call'}
            </Button>
          </>
        ) : (
          <>
            <div>
              <p className="text-sm font-medium">Start a video call</p>
              <p className="text-xs text-muted-foreground mt-1">
                Great for safety meetings, job briefings, and team check-ins
              </p>
            </div>
            <Button onClick={handleStartCall} disabled={createCall.isPending} className="gap-2">
              <Video className="h-4 w-4" />
              {createCall.isPending ? 'Starting...' : 'Start Call'}
            </Button>
          </>
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col bg-background border rounded-lg overflow-hidden',
        isFullscreen ? 'fixed inset-0 z-50' : 'h-[500px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-card border-b shrink-0">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">
            {callState === 'active' ? '🔴 Live Call' :
             callState === 'ended' ? 'Call Ended' :
             callState === 'failed' || callState === 'permission_denied' ? '⚠️ Call Error' :
             'Video Call'}
          </span>
          {callState === 'active' && (
            <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
              {remoteParticipants.size + 1} participant{remoteParticipants.size > 0 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {callState === 'active' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowNotes(!showNotes)}
              title="Meeting Notes"
            >
              <Users className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Video area */}
        <div className={cn('flex-1 flex flex-col', showNotes && 'w-1/2')}>
          {callState !== 'active' ? (
            renderPreCallContent()
          ) : (
            /* In-call state */
            <div className="flex-1 flex flex-col">
              {/* Remote participants */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-1 p-1 bg-black/95">
                {remoteParticipants.size === 0 && (
                  <div className="flex items-center justify-center text-white/60 text-sm">
                    Waiting for others to join...
                  </div>
                )}
                {Array.from(remoteParticipants.values()).map((participant) => (
                  <RemoteParticipantView key={participant.sid} participant={participant} />
                ))}
              </div>

              {/* Local video (picture-in-picture) */}
              <div className="relative">
                <div
                  ref={localVideoRef}
                  className="absolute bottom-2 right-2 w-24 h-18 sm:w-32 sm:h-24 bg-muted rounded-lg overflow-hidden border-2 border-background shadow-lg z-10"
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-3 py-3 bg-card border-t">
                <Button
                  variant={isMuted ? 'destructive' : 'secondary'}
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={toggleMute}
                >
                  {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button
                  variant={isVideoOff ? 'destructive' : 'secondary'}
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={toggleVideo}
                >
                  {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  onClick={handleEndCall}
                >
                  <PhoneOff className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Meeting notes side panel */}
        {showNotes && callState === 'active' && currentCallId && (
          <div className="w-1/2 border-l overflow-hidden">
            <MeetingNotesPanel
              videoCallId={currentCallId}
              conversationId={conversationId}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Renders a remote participant's video/audio tracks */
function RemoteParticipantView({ participant }: { participant: any }) {
  const videoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = videoRef.current;
    if (!container) return;

    const attachTrack = (track: any) => {
      if (track.kind === 'video' || track.kind === 'audio') {
        const el = track.attach();
        if (track.kind === 'video') {
          el.style.width = '100%';
          el.style.height = '100%';
          el.style.objectFit = 'cover';
        }
        container.appendChild(el);
      }
    };

    participant.tracks.forEach((publication: any) => {
      if (publication.isSubscribed && publication.track) {
        attachTrack(publication.track);
      }
    });

    participant.on('trackSubscribed', attachTrack);
    participant.on('trackUnsubscribed', (track: any) => {
      track.detach().forEach((el: HTMLElement) => el.remove());
    });

    return () => {
      container.innerHTML = '';
    };
  }, [participant]);

  return (
    <div className="relative bg-muted/20 rounded overflow-hidden flex items-center justify-center min-h-[120px]">
      <div ref={videoRef} className="absolute inset-0" />
      <span className="absolute bottom-1 left-1 text-[10px] text-white bg-black/50 px-1.5 py-0.5 rounded">
        {participant.identity}
      </span>
    </div>
  );
}
