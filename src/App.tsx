import { useEffect, useRef, useState } from 'react'
import './App.css'
import { cancelStream, createConversation, getMessages, listConversations, listModels, streamMessage, type ConversationSummary, type TokenUsage } from './api'
import ChatWindow, { type ChatMessage } from './components/ChatWindow'
import Sidebar from './components/Sidebar'

export default function App() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [models, setModels] = useState<string[]>([])
  const [model, setModel] = useState('')
  const [retryRequest, setRetryRequest] = useState<{ text: string; model: string } | null>(null)
  const activeRequest = useRef<{ controller: AbortController; requestId: string } | null>(null)

  useEffect(() => {
    listModels().then(({ models }) => { setModels(models); setModel(models[0] ?? '') }).catch((e) => setError(e.message))
    listConversations().then((items) => { setConversations(items); if (items[0]) setActiveId(items[0].id) }).catch((e) => setError(e.message))
  }, [])
  useEffect(() => {
    if (activeId === null) return
    getMessages(activeId).then((items) => setMessages(items.map(({ role, content }) => ({ role, content })))).catch((e) => setError(e.message))
  }, [activeId])

  async function handleNew() {
    const id = await createConversation()
    setConversations((items) => [{ id, created_at: new Date().toISOString(), preview: null }, ...items])
    setActiveId(id)
    setMessages([])
  }

  async function sendMessage(text: string, selectedModel: string) {
    if (activeId === null || !text.trim() || !selectedModel) return
    const conversationId = activeId
    setDraft('')
    setError(null)
    setRetryRequest(null)
    setLoading(true)
    setMessages((items) => [...items, { role: 'user', content: text }, { role: 'assistant', content: '' }])

    const controller = new AbortController()
    const requestId = crypto.randomUUID()
    activeRequest.current = { controller, requestId }
    try {
      await streamMessage(
        conversationId,
        text,
        selectedModel,
        requestId,
        controller.signal,
        (token) => setMessages((items) => items.map((item, index) => index === items.length - 1 ? { ...item, content: item.content + token } : item)),
        (usage: TokenUsage) => setMessages((items) => items.map((item, index) => index === items.length - 1 ? { ...item, usage } : item)),
      )
      setRetryRequest(null)
      try { setConversations(await listConversations()) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossible de rafraîchir les conversations') }
    } catch (cause) {
      setMessages((items) => items.slice(0, -2))
      setDraft(text)
      setRetryRequest({ text, model: selectedModel })
      setError(controller.signal.aborted ? 'Génération arrêtée. Rien n’a été enregistré.' : cause instanceof Error ? cause.message : 'Erreur de génération')
    } finally {
      if (activeRequest.current?.controller === controller) activeRequest.current = null
      setLoading(false)
    }
  }

  function handleStop() {
    const request = activeRequest.current
    if (!request) return
    void cancelStream(request.requestId).catch(() => undefined)
    request.controller.abort()
  }

  return (
    <div className="app">
      <Sidebar conversations={conversations} activeId={activeId} onSelect={setActiveId} onNew={handleNew} />
      <main className="main">
        {error && <div className="error" role="alert">{error}{retryRequest && <button className="retry-button" onClick={() => void sendMessage(retryRequest.text, retryRequest.model)}>Réessayer</button>}</div>}
        {activeId === null ? <div className="empty"><button className="new-button" onClick={handleNew}>+ Nouvelle conversation</button></div> : <>
          <label className="model-picker">Modèle : <select value={model} onChange={(event) => setModel(event.target.value)} disabled={loading}>{models.map((item) => <option key={item}>{item}</option>)}</select></label>
          <ChatWindow messages={messages} loading={loading} draft={draft} onDraftChange={setDraft} onSend={() => void sendMessage(draft.trim(), model)} onStop={handleStop} />
        </>}
      </main>
    </div>
  )
}
