
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Power, ChevronDown, StopCircle, Mic, Send, Wrench, Activity, Volume2, AlertCircle, MapPin, Search as SearchIcon, Building2, UserPlus, Trash2, RefreshCw, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { companyService } from '../services/supabase';

interface Message {
    role: 'user' | 'model' | 'tool';
    text?: string;
    toolName?: string;
    toolArgs?: any;
    isError?: boolean;
}

const outputSampleRate = 24000;

function base64ToFloat32(base64: string): Float32Array {
    const binary = atob(base64);
    const buffer = new ArrayBuffer(binary.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
    const int16 = new Int16Array(buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0;
    return float32;
}

function float32ToBase64(data: Float32Array): string {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        const s = Math.max(-1, Math.min(1, data[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    let binary = '';
    const bytes = new Uint8Array(int16.buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

const SYSTEM_INSTRUCTION = `Tu es Lexia Copilot, l'assistant CRM intelligent de SAPRO. 
TU RÉPONDS TOUJOURS EN FRANÇAIS.

TON RÔLE : Tu es un agent capable d'exécuter TOUTES les actions du CRM à la place de l'utilisateur. 

RÈGLE DE CONVERSATION CRITIQUE (CRÉATION CONTACT) :
Pour éviter de créer des doublons ou des fiches incomplètes, tu DOIS collecter les informations du contact UNE PAR UNE dans cet ordre précis :
1. Demande d'abord le NOM complet.
2. Une fois le nom obtenu, demande l'ADRESSE EMAIL.
3. Enfin, demande le RÔLE.

Page actuelle : `;

const toolsDef: FunctionDeclaration[] = [
    {
        name: 'navigateTo',
        description: 'Naviguer vers une page spécifique du CRM.',
        parameters: { 
            type: Type.OBJECT, 
            properties: { 
                page: { type: Type.STRING, enum: ['dashboard', 'kanban', 'directory', 'people_directory', 'inbox', 'toolbox', 'settings', 'company_detail'] },
                id: { type: Type.STRING }
            }, 
            required: ['page'] 
        }
    },
    {
        name: 'searchCompanies',
        description: 'Rechercher des entreprises par mot-clé.',
        parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING } }, required: ['query'] }
    },
    {
        name: 'logActivity',
        description: 'Enregistrer une activité client.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                companyId: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['email', 'meeting', 'note', 'call'] },
                title: { type: Type.STRING },
                description: { type: Type.STRING }
            },
            required: ['companyId', 'type', 'title']
        }
    }
];

export const VoiceAssistant: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTextLoading, setIsTextLoading] = useState(false);
  
  const [isConnected, setIsConnected] = useState(false);
  const isConnectedRef = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeAction, setActiveAction] = useState<{ label: string, icon: React.ElementType } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const activeSessionRef = useRef<any>(null);
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTimeRef = useRef<number>(0);
  const conversationHistory = useRef<any[]>([]);

  useEffect(() => {
      if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTextLoading]);

  useEffect(() => {
      return () => { disconnect(); };
  }, []);

  const triggerAction = (label: string, icon: React.ElementType) => {
      setActiveAction({ label, icon });
      setTimeout(() => setActiveAction(null), 3000);
      window.dispatchEvent(new Event('companies-updated'));
  };

  const executeTool = async (name: string, args: any) => {
      let result: any = { error: "Outil inconnu" };
      try {
          switch(name) {
              case 'navigateTo':
                  triggerAction(`Navigation`, MapPin);
                  const routes: any = { dashboard: '/', kanban: '/kanban', directory: '/directory', people_directory: '/annuaire', inbox: '/inbox', toolbox: '/toolbox', settings: '/settings', company_detail: `/company/${args.id}` };
                  if (routes[args.page]) navigate(routes[args.page]);
                  result = { success: true };
                  break;
              case 'searchCompanies':
                  triggerAction(`Recherche: ${args.query}`, SearchIcon);
                  result = await companyService.search(args.query);
                  break;
              case 'logActivity':
                  triggerAction(`Activité logguée`, Activity);
                  await companyService.addActivity(args.companyId, args);
                  result = { success: true };
                  break;
          }
      } catch (e: any) { result = { error: e.message || "Erreur outil" }; }
      setMessages(prev => [...prev, { role: 'tool', toolName: name, toolArgs: args }]);
      return result;
  };

  const connect = async () => {
      const apiKey = process.env.API_KEY;
      if (!apiKey) return;
      
      try {
          const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
          if (!AudioContextClass) {
            console.error("AudioContext not supported");
            return;
          }

          const outCtx = new AudioContextClass({ sampleRate: outputSampleRate });
          const inCtx = new AudioContextClass({ sampleRate: 16000 });
          
          if (outCtx.state === 'suspended') await outCtx.resume();
          if (inCtx.state === 'suspended') await inCtx.resume();

          outputAudioContextRef.current = outCtx;
          inputAudioContextRef.current = inCtx;

          const ai = new GoogleGenAI({ apiKey });
          setIsConnected(true);
          isConnectedRef.current = true;
          
          const sessionPromise = ai.live.connect({
              model: 'gemini-2.5-flash-native-audio-preview-12-2025',
              config: {
                  tools: [{ functionDeclarations: toolsDef }],
                  systemInstruction: SYSTEM_INSTRUCTION + location.pathname,
                  responseModalalities: [Modality.AUDIO],
                  speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
              },
              callbacks: {
                  onmessage: async (msg: LiveServerMessage) => {
                      const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                      if (audioData && outputAudioContextRef.current) {
                          setIsSpeaking(true);
                          const ctx = outputAudioContextRef.current;
                          const float32Data = base64ToFloat32(audioData);
                          const buffer = ctx.createBuffer(1, float32Data.length, outputSampleRate);
                          buffer.copyToChannel(float32Data, 0);
                          const source = ctx.createBufferSource();
                          source.buffer = buffer;
                          source.connect(ctx.destination);
                          const start = Math.max(ctx.currentTime, nextStartTimeRef.current);
                          source.start(start);
                          nextStartTimeRef.current = start + buffer.duration;
                          scheduledSourcesRef.current.push(source);
                          source.onended = () => { if (ctx.currentTime >= nextStartTimeRef.current - 0.1) setIsSpeaking(false); };
                      }
                      if (msg.toolCall) {
                           const functionResponses = [];
                           for (const fc of msg.toolCall.functionCalls) {
                               const result = await executeTool(fc.name, fc.args);
                               functionResponses.push({ id: fc.id, name: fc.name, response: { result } });
                           }
                           sessionPromise.then(session => session.sendToolResponse({ functionResponses }));
                      }
                  },
                  onerror: (e: any) => { console.error(e); disconnect(); },
                  onclose: () => disconnect(),
              }
          });

          sessionPromise.then(s => activeSessionRef.current = s);

          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = stream;

          const source = inCtx.createMediaStreamSource(stream);
          const processor = inCtx.createScriptProcessor(4096, 1, 1);
          processorNodeRef.current = processor;

          processor.onaudioprocess = (e) => {
              if (!isConnectedRef.current) return;
              const inputData = e.inputBuffer.getChannelData(0);
              sessionPromise.then(s => {
                  if (isConnectedRef.current) {
                      s.sendRealtimeInput({ media: { mimeType: "audio/pcm;rate=16000", data: float32ToBase64(inputData) } });
                  }
              });
          };
          source.connect(processor);
          processor.connect(inCtx.destination);
      } catch (error) { 
          console.error("Connection error:", error); 
          disconnect(); 
      }
  };

  const disconnect = async () => {
      setIsConnected(false);
      isConnectedRef.current = false;
      setIsSpeaking(false);
      
      if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach(track => track.stop());
          micStreamRef.current = null;
      }

      if (processorNodeRef.current) {
          processorNodeRef.current.onaudioprocess = null;
          processorNodeRef.current.disconnect();
          processorNodeRef.current = null;
      }

      if (inputAudioContextRef.current) {
          try { await inputAudioContextRef.current.close(); } catch(e) {}
          inputAudioContextRef.current = null;
      }
      if (outputAudioContextRef.current) {
          try { await outputAudioContextRef.current.close(); } catch(e) {}
          outputAudioContextRef.current = null;
      }

      if (activeSessionRef.current) {
          try { activeSessionRef.current.close(); } catch(e) {}
          activeSessionRef.current = null;
      }

      scheduledSourcesRef.current.forEach(s => { try { s.stop(); } catch (e) {} });
      scheduledSourcesRef.current = [];
      nextStartTimeRef.current = 0;
  };

  const handleTextSubmit = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!inputText.trim()) return;
      const apiKey = process.env.API_KEY;
      if (!apiKey) return;
      
      const userText = inputText;
      setMessages(prev => [...prev, { role: 'user', text: userText }]);
      setInputText(""); setIsTextLoading(true);
      
      try {
          const ai = new GoogleGenAI({ apiKey });
          conversationHistory.current.push({ role: 'user', parts: [{ text: userText }] });
          
          let loop = true, count = 0;
          while (loop && count < 5) {
              count++;
              const response = await ai.models.generateContent({
                  model: 'gemini-3-flash-preview', 
                  contents: conversationHistory.current,
                  config: { systemInstruction: SYSTEM_INSTRUCTION + location.pathname, tools: [{ functionDeclarations: toolsDef }] }
              });
              
              const cand = response.candidates?.[0];
              if (!cand) break;
              conversationHistory.current.push(cand.content);
              
              if (cand.content.parts.some(p => p.functionCall)) {
                  const functionResponses = [];
                  for (const part of cand.content.parts) {
                      if (part.functionCall) {
                          const result = await executeTool(part.functionCall.name, part.functionCall.args);
                          functionResponses.push({ id: part.functionCall.id, name: part.functionCall.name, response: { result } });
                      }
                  }
                  conversationHistory.current.push({ role: 'user', parts: functionResponses.map(fr => ({ functionResponse: fr })) });
              } else {
                  if (response.text) setMessages(prev => [...prev, { role: 'model', text: response.text }]);
                  loop = false;
              }
          }
      } catch (error: any) { 
          setMessages(prev => [...prev, { role: 'model', text: "Erreur de communication avec l'IA.", isError: true }]);
      } finally { setIsTextLoading(false); }
  };

  return (
    <>
    {activeAction && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[110] animate-in slide-in-from-top-4 duration-500 pointer-events-none">
            <div className="bg-slate-900/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10">
                <div className="bg-orange-500/20 p-2 rounded-xl">
                    {React.createElement(activeAction.icon, { className: "h-5 w-5 text-orange-400 animate-pulse" })}
                </div>
                <span className="font-bold text-sm">{activeAction.label}</span>
            </div>
        </div>
    )}

    <div className="fixed z-50 flex flex-col items-end gap-4 bottom-4 right-4 sm:bottom-6 sm:right-6">
      {isOpen && (
        <div className="flex flex-col overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 shadow-2xl animate-in slide-in-from-bottom-10 origin-bottom-right fixed inset-0 w-full h-full rounded-none sm:static sm:w-[380px] sm:h-[600px] sm:rounded-[2rem]">
          <div className="h-16 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-orange-500 to-red-600 p-2 rounded-xl"><Sparkles className="h-5 w-5 text-white" /></div>
                <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100">Lexia Copilot</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">{isConnected ? "Agent Actif" : "Assistant IA"}</span>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <button onClick={() => isConnected ? disconnect() : connect()} className={cn("p-2 rounded-lg transition-all", isConnected ? "text-emerald-500 bg-emerald-50" : "text-slate-400 hover:bg-slate-50")}><Power className="h-4 w-4" /></button>
                <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg"><ChevronDown className="h-5 w-5" /></button>
            </div>
          </div>

          <div className="flex-1 bg-white/50 dark:bg-slate-950/50 p-5 overflow-y-auto scrollbar-hide">
             {messages.length === 0 && !isConnected ? (
                 <div className="h-full flex flex-col items-center justify-center text-center px-6 space-y-4">
                    <Sparkles className="h-10 w-10 text-orange-200" />
                    <p className="text-sm text-slate-500">Pose-moi une question ou demande-moi une action CRM.</p>
                 </div>
             ) : messages.map((msg, i) => (
                <div key={i} className={cn("flex w-full mb-4", msg.role === 'user' ? "justify-end" : "justify-start")}>
                    {msg.role === 'tool' ? (
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2 text-[9px] font-mono border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 flex items-center gap-2 w-full animate-in fade-in">
                            <Wrench className="h-3 w-3 text-orange-500" />
                            <span>Agent: {msg.toolName} - OK</span>
                        </div>
                    ) : (
                        <div className={cn("max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow-sm", 
                            msg.role === 'user' ? "bg-slate-900 text-white dark:bg-orange-600" : 
                            msg.isError ? "bg-red-50 text-red-700 border border-red-200" :
                            "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700")}>
                            <div className="whitespace-pre-wrap">{msg.text}</div>
                        </div>
                    )}
                </div>
             ))}
             {isTextLoading && (
                <div className="flex justify-start mb-4"><div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-2 flex gap-1"><div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" /><div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce delay-100" /></div></div>
             )}
             <div ref={messagesEndRef} />
          </div>

          <div className="bg-white dark:bg-slate-900 border-t border-slate-100 p-4 shrink-0">
             {isConnected ? (
                 <div className="h-14 flex items-center justify-between px-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100">
                     <div className="flex items-center gap-3"><div className={cn("w-2 h-2 rounded-full animate-pulse", isSpeaking ? "bg-emerald-500" : "bg-orange-500")} /><span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Microphone Ouvert</span></div>
                     <button onClick={disconnect} className="p-2 bg-red-100 text-red-600 rounded-lg"><StopCircle className="h-4 w-4" /></button>
                 </div>
             ) : (
                 <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
                     <button type="button" onClick={connect} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500"><Mic className="h-5 w-5" /></button>
                     <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Action CRM..." className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-orange-500 dark:text-white outline-none" />
                     <button type="submit" disabled={!inputText.trim() || isTextLoading} className="p-3 bg-slate-900 dark:bg-orange-600 text-white rounded-xl shadow-lg"><Send className="h-5 w-5" /></button>
                 </form>
             )}
          </div>
        </div>
      )}

      {!isOpen && (
        <button onClick={() => setIsOpen(true)} className={cn("flex h-14 w-14 items-center justify-center rounded-2xl shadow-xl transition-all hover:scale-110 active:scale-90 z-50", isConnected ? "bg-emerald-600 animate-pulse" : "bg-slate-900")}>
            <Sparkles className="h-6 w-6 text-white" />
        </button>
      )}
    </div>
    </>
  );
};
