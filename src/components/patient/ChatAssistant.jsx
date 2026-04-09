import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/api/client';

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '¡Hola! Soy tu asistente SD-NEXUS. ¿Tienes alguna duda sobre tus estudios o preparaciones?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    const response = await api.integrations.Core.InvokeLLM({
      prompt: `Eres un asistente clínico amigable de SD-NEXUS (Salud Digna). Responde de forma breve y clara en español. Pregunta del paciente: "${userMsg}"`,
    });

    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    setLoading(false);
  };

  return (
    <>
      {/* FAB */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-50"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={!isOpen ? { boxShadow: ['0 0 0 0 hsla(275,100%,25%,0.4)', '0 0 0 16px hsla(275,100%,25%,0)'] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <MessageCircle className="w-6 h-6" />
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-6 right-6 w-[340px] h-[460px] bg-card border rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-primary/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-heading font-semibold text-sm">Asistente SD</p>
                  <p className="text-[10px] text-muted-foreground">En línea</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Escribe tu pregunta..."
                className="text-sm rounded-full"
              />
              <Button size="icon" onClick={handleSend} disabled={loading} className="rounded-full shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}