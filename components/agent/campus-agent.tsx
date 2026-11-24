'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, Send, X } from 'lucide-react'
import { DemoBadge } from '@/components/common/badge'
import { Input } from '@/components/common/field'
import { Button } from '@/components/ui/button'
import { answer, answerIntent, MAX_INPUT_LENGTH, type AgentAction, type AgentContext, type Lang, type LangPref } from '@/lib/agent'
import { uid } from '@/lib/format'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'

type Message = { id: string; role: 'user' | 'agent'; text: string; actions?: AgentAction[]; suggestions?: string[] }

const MAX_MESSAGES = 60

/**
 * Portal-wide assistant. It is a LOCAL, RULE-BASED helper (see lib/agent.ts): no AI model, no network.
 * The conversation lives in memory only, so it survives moving between portal pages but not a refresh
 * or logout. Copy / like / dislike controls are intentionally absent (they are not part of the design).
 */
export function CampusAgent() {
  const router = useRouter()
  const { subjects, complaints, attendance, theme, notificationPrefs } = useApp()
  const context: AgentContext = { subjects, complaints, attendance, theme, prefs: notificationPrefs }

  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [langPref, setLangPref] = useState<LangPref>('auto')
  const [lastLang, setLastLang] = useState<Lang>('en')
  const [messages, setMessages] = useState<Message[]>(() => {
    const hello = answerIntent('greeting', context, 'en')!
    return [{ id: 'welcome', role: 'agent', text: hello.text, suggestions: hello.suggestions }]
  })

  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, open])

  const close = () => {
    setOpen(false)
    launcherRef.current?.focus()
  }

  const go = (href: string) => {
    router.push(href)
    setOpen(false)
  }

  const ask = (raw: string) => {
    const question = raw.trim().slice(0, MAX_INPUT_LENGTH)
    if (!question) return
    const reply = answer(question, context, langPref, lastLang)
    setLastLang(reply.lang)
    if (reply.setLanguage) setLangPref(reply.setLanguage)
    setMessages((m) =>
      [
        ...m,
        { id: uid('msg'), role: 'user' as const, text: question },
        { id: uid('msg'), role: 'agent' as const, text: reply.text, actions: reply.actions, suggestions: reply.suggestions },
      ].slice(-MAX_MESSAGES),
    )
    setInput('')
    if (reply.navigate) go(reply.navigate)
  }

  if (!open) {
    return (
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open AI Campus Agent"
        className="fixed right-6 bottom-6 z-40 inline-flex h-12 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg outline-none transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        <MessageCircle className="size-5" />
        AI Campus Agent
      </button>
    )
  }

  const lastAgentId = [...messages].reverse().find((m) => m.role === 'agent')?.id

  return (
    <section
      role="dialog"
      aria-label="AI Campus Agent"
      onKeyDown={(e) => {
        if (e.key === 'Escape') close()
      }}
      className="fixed right-6 bottom-6 z-50 flex h-[min(36rem,calc(100dvh-3rem))] w-[min(26rem,calc(100vw-3rem))] flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-lg"
    >
      <header className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold">AI Campus Agent</h2>
            <DemoBadge label="LOCAL DEMO" />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Rule-based helper. No external AI model is connected.</p>
        </div>
        <Button type="button" variant="ghost" size="icon" aria-label="Close AI Campus Agent" onClick={close}>
          <X />
        </Button>
      </header>

      <div ref={listRef} role="log" aria-live="polite" aria-label="Conversation" className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <div key={m.id} className={cn('flex flex-col gap-2', m.role === 'user' ? 'items-end' : 'items-start')}>
            <div
              className={cn(
                'max-w-[88%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line',
                m.role === 'user' ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-muted text-foreground',
              )}
            >
              <span className="sr-only">{m.role === 'user' ? 'You: ' : 'Agent: '}</span>
              {m.text}
            </div>
            {m.role === 'agent' && m.actions && m.actions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {m.actions.map((a) => (
                  <Button key={a.href + a.label} type="button" variant="outline" size="sm" onClick={() => go(a.href)}>
                    {a.label}
                  </Button>
                ))}
              </div>
            ) : null}
            {m.id === lastAgentId && m.suggestions && m.suggestions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {m.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => ask(s)}
                    className="cursor-pointer rounded-full border bg-background px-3 py-1.5 text-left text-xs font-medium transition-colors outline-none hover:border-brand/40 focus-visible:ring-3 focus-visible:ring-ring/40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          ask(input)
        }}
        className="flex items-center gap-2 border-t p-3"
      >
        <Input
          ref={inputRef}
          id="agent-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask in English or Roman Urdu…"
          maxLength={MAX_INPUT_LENGTH}
          autoComplete="off"
          aria-label="Your question"
        />
        <Button type="submit" size="icon" aria-label="Send question" disabled={!input.trim()}>
          <Send />
        </Button>
      </form>
    </section>
  )
}
