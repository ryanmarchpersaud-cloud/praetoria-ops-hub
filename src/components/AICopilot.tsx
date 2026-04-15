import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, Loader2, Sparkles, Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-copilot`;

const SUGGESTIONS = [
  'Any overdue invoices?',
  "What's on the schedule today?",
  'Summarize open incidents',
  'How many active jobs?',
];

/** Strip markdown to plain text for speech */
function stripMarkdown(md: string): string {
  return md
    .replace(/#{1,6}\s?/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[>\-|]/g, ' ')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function useSpeech() {
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeakingIdx(null);
    utteranceRef.current = null;
  }, []);

  const speak = useCallback((text: string, idx: number) => {
    stop();
    const plain = stripMarkdown(text);
    if (!plain) return;
    const utt = new SpeechSynthesisUtterance(plain);
    utt.rate = 1.05;
    utt.pitch = 1;
    // Prefer a natural-sounding voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Samantha'))
      || voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'))
      || voices.find(v => v.lang.startsWith('en') && v.localService);
    if (preferred) utt.voice = preferred;
    utt.onend = () => setSpeakingIdx(null);
    utt.onerror = () => setSpeakingIdx(null);
    setSpeakingIdx(idx);
    utteranceRef.current = utt;
    window.speechSynthesis.speak(utt);
  }, [stop]);

  // Cleanup on unmount
  useEffect(() => () => { window.speechSynthesis.cancel(); }, []);

  return { speak, stop, speakingIdx };
}

/** Hook: browser speech recognition for voice input */
function useSpeechRecognition(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  const toggle = useCallback(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (listening && recRef.current) {
      recRef.current.stop();
      setListening(false);
      return;
    }

    const rec = new SpeechRec();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) onResult(transcript);
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [listening, onResult]);

  useEffect(() => () => { recRef.current?.stop(); }, []);

  return { listening, toggle };
}

export function AICopilot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastSpokenRef = useRef<number>(-1);
  const sendRef = useRef<(text: string) => void>(() => {});
  const { speak, stop, speakingIdx } = useSpeech();

  // Voice input: when recognized, either auto-send or fill input
  const handleVoiceResult = useCallback((transcript: string) => {
    if (autoSpeak) {
      sendRef.current(transcript);
    } else {
      setInput(prev => (prev ? prev + ' ' : '') + transcript);
      inputRef.current?.focus();
    }
  }, [autoSpeak]);
  const { listening, toggle: toggleMic } = useSpeechRecognition(handleVoiceResult);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Auto-speak newest assistant message when streaming finishes
  useEffect(() => {
    if (!autoSpeak || isLoading) return;
    const lastIdx = messages.length - 1;
    const last = messages[lastIdx];
    if (last?.role === 'assistant' && lastIdx > lastSpokenRef.current) {
      lastSpokenRef.current = lastIdx;
      speak(last.content, lastIdx);
    }
  }, [messages, isLoading, autoSpeak, speak]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';
    const allMessages = [...messages, userMsg];

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok || !resp.body) {
        let errMsg = 'Something went wrong';
        try {
          const errData = await resp.json();
          errMsg = errData.error || errMsg;
        } catch {}
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${errMsg}` }]);
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              const snapshot = assistantSoFar;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: snapshot } : m);
                }
                return [...prev, { role: 'assistant', content: snapshot }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              const snapshot = assistantSoFar;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: snapshot } : m);
                }
                return [...prev, { role: 'assistant', content: snapshot }];
              });
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error('AI Copilot error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Network error. Please try again.' }]);
    }

    setIsLoading(false);
  }, [messages, isLoading]);

  // Keep sendRef in sync
  useEffect(() => { sendRef.current = send; }, [send]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <>
      {/* FAB */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          title="AI Co-pilot"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[540px] max-h-[calc(100vh-6rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-primary/5 shrink-0">
            <Bot className="h-5 w-5 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Praetoria AI Co-pilot</p>
              <p className="text-[10px] text-muted-foreground">Ask about invoices, jobs, schedule & more</p>
            </div>
            <Button
              variant={autoSpeak ? 'default' : 'ghost'}
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => { setAutoSpeak(!autoSpeak); if (autoSpeak) stop(); }}
              title={autoSpeak ? 'Auto-speak ON — click to mute' : 'Auto-speak OFF — click to enable'}
            >
              {autoSpeak ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { stop(); setOpen(false); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3 pt-4">
                <div className="text-center">
                  <Sparkles className="h-8 w-8 mx-auto text-primary/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Hi! I can help you with your operations.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Try one of these:</p>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-[11px] text-left px-3 py-2 rounded-lg border hover:bg-muted/50 transition-colors text-muted-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className="flex flex-col gap-1 max-w-[85%]">
                  <div className={cn(
                    'rounded-2xl px-3.5 py-2.5 text-sm',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted rounded-bl-md'
                  )}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1.5 [&>ul]:mb-1.5 [&>ol]:mb-1.5 [&>p:last-child]:mb-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                  {/* Speak button for assistant messages */}
                  {msg.role === 'assistant' && !isLoading && (
                    <button
                      onClick={() => speakingIdx === i ? stop() : speak(msg.content, i)}
                      className={cn(
                        'flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full w-fit transition-colors',
                        speakingIdx === i
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                      title={speakingIdx === i ? 'Stop speaking' : 'Read aloud'}
                    >
                      {speakingIdx === i ? (
                        <><VolumeX className="h-3 w-3" /> Stop</>
                      ) : (
                        <><Volume2 className="h-3 w-3" /> Listen</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t px-3 py-2.5 shrink-0">
            {listening && (
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                <span className="text-[11px] text-muted-foreground">Listening… speak now</span>
              </div>
            )}
            <div className="flex items-end gap-2">
              <Button
                variant={listening ? 'default' : 'ghost'}
                size="icon"
                className={cn('h-9 w-9 rounded-xl shrink-0', listening && 'bg-red-500 hover:bg-red-600 text-white')}
                onClick={toggleMic}
                disabled={isLoading}
                title={listening ? 'Stop listening' : 'Voice input'}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={listening ? 'Listening...' : 'Ask about your operations...'}
                rows={1}
                className="flex-1 resize-none bg-muted/50 border-0 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 max-h-24"
              />
              <Button
                size="icon"
                className="h-9 w-9 rounded-xl shrink-0"
                onClick={() => send(input)}
                disabled={!input.trim() || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
