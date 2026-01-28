import { useState, useRef, useEffect } from 'react';
import { AstroShivaAPI } from '../services/astroApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Sparkles, 
  Moon, 
  User, 
  MoreHorizontal,
  Loader2
} from 'lucide-react';

interface Props {
  api: AstroShivaAPI;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export function ChatInterface({ api }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: 'Welcome, seeker. I am your Vedic astrology guide. Ask me about your planetary positions, doshas, career path, relationships, or any aspect of your cosmic journey.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { 
      role: 'user', 
      content: input,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const result = await api.sendMessage(input, sessionId || undefined);
      
      if (result.success) {
        const aiMessage: Message = { 
          role: 'assistant', 
          content: result.data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        
        if (result.data.sessionId) {
          setSessionId(result.data.sessionId);
        }
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'I apologize, but I encountered an error interpreting the cosmic energies. Please try again.',
          timestamp: new Date()
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'The cosmic connection has been disrupted. Please check your connection and try again.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="glass-card border-b border-mystic-gold/20 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-mystic-purple to-mystic-blue flex items-center justify-center animate-pulse-glow">
            <Moon className="w-6 h-6 text-mystic-gold" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-gradient-gold">
              Astro Shiva
            </h1>
            <p className="text-xs text-muted-foreground font-body">
              {sessionId ? `Session: ${sessionId.slice(0, 8)}...` : 'New Session'}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-mystic-gold">
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </header>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4 md:px-8 py-6" ref={scrollRef}>
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* Avatar */}
              <Avatar className={`w-10 h-10 shrink-0 ${msg.role === 'assistant' ? 'bg-gradient-to-br from-mystic-purple to-mystic-blue' : 'bg-gradient-to-br from-mystic-gold/30 to-mystic-gold/10'} border border-mystic-gold/30`}>
                <AvatarFallback className="text-foreground">
                  {msg.role === 'assistant' ? (
                    <Sparkles className="w-5 h-5 text-mystic-gold" />
                  ) : (
                    <User className="w-5 h-5 text-mystic-gold" />
                  )}
                </AvatarFallback>
              </Avatar>

              {/* Message Bubble */}
              <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[80%]`}>
                <div
                  className={`px-5 py-3 rounded-2xl ${
                    msg.role === 'user'
                      ? 'message-bubble-user text-white rounded-br-md'
                      : 'message-bubble-assistant text-foreground rounded-bl-md'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap font-body">
                    {msg.content}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground mt-1 px-1">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex gap-4 animate-in fade-in duration-300">
              <Avatar className="w-10 h-10 shrink-0 bg-gradient-to-br from-mystic-purple to-mystic-blue border border-mystic-gold/30">
                <AvatarFallback>
                  <Sparkles className="w-5 h-5 text-mystic-gold" />
                </AvatarFallback>
              </Avatar>
              <div className="message-bubble-assistant text-foreground rounded-2xl rounded-bl-md px-5 py-4 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-mystic-gold/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-mystic-gold/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-mystic-gold/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm text-muted-foreground ml-2">Consulting the stars...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="glass-card border-t border-mystic-gold/20 px-4 md:px-8 py-4 shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your astrology, career, relationships, or life path..."
                disabled={loading}
                className="mystic-input min-h-[56px] py-4 pr-12 text-foreground placeholder:text-muted-foreground/50 resize-none"
              />
            </div>
            <Button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="mystic-button h-14 w-14 rounded-full bg-gradient-to-r from-mystic-purple to-mystic-blue hover:from-mystic-purple-light hover:to-mystic-blue-light border border-mystic-gold/30 transition-all duration-300 hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] disabled:opacity-50 shrink-0"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground/50 mt-3 font-body">
            Astro Shiva provides guidance based on Vedic astrology principles
          </p>
        </div>
      </div>
    </div>
  );
}