export type Role = 'user' | 'assistant' | 'quiz' | 'system-notification'
export interface ConversationSummary { id: number; created_at: string; preview: string | null }
export interface Message { seq: number; role: Role; content: string; created_at: string }
export interface TokenUsage { prompt_tokens: number; completion_tokens: number; total_tokens: number }
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(typeof body?.detail === 'string' ? body.detail : `Erreur ${response.status}`) }
  return response.json()
}
export const listModels = (): Promise<{ models: string[] }> => request('/models')
export const listConversations = (): Promise<ConversationSummary[]> => request('/conversations')
export async function createConversation(): Promise<number> { return (await request<{ conversation_id: number }>('/conversations', { method: 'POST' })).conversation_id }
export const getMessages = (id: number): Promise<Message[]> => request(`/conversations/${id}/messages`)
export function cancelStream(requestId: string): Promise<void> {
  return fetch(`/api/chat/${requestId}/cancel`, { method: 'POST', keepalive: true }).then(() => undefined)
}
export async function streamMessage(id: number, message: string, model: string, requestId: string, signal: AbortSignal, onToken: (text: string) => void, onUsage: (usage: TokenUsage) => void): Promise<void> {
  const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversation_id: id, message, model, request_id: requestId }), signal })
  if (!response.ok || !response.body) throw new Error(`Erreur ${response.status}`)
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''
  let completed = false
  while (true) {
    const { value, done } = await reader.read(); if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n'); buffer = events.pop() ?? ''
    for (const event of events) { const line = event.split('\n').find((x) => x.startsWith('data:')); if (!line) continue; const data = JSON.parse(line.slice(5)); if (data.type === 'token') onToken(data.text); if (data.type === 'usage') onUsage(data.usage as TokenUsage); if (data.type === 'error') throw new Error(data.message); if (data.type === 'done') completed = true }
  }
  if (!completed) throw new Error('Le flux a été interrompu ; rien n’a été enregistré.')
}
