'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { CheckCircle2, FileUp, Paperclip, X } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/common/card'
import { FieldError, FieldHint, Input, Label, Select, Textarea } from '@/components/common/field'
import { Notice } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { useApp } from '@/lib/store'
import { COMPLAINT_CATEGORIES, type Complaint, type ComplaintCategory } from '@/lib/types'

type Errors = { category?: string; location?: string; title?: string; description?: string; file?: string }
const MAX_BYTES = 5 * 1024 * 1024

export function ComplaintForm() {
  const { addComplaint, complaints } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)
  const [category, setCategory] = useState<ComplaintCategory | ''>('')
  const [location, setLocation] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [createdId, setCreatedId] = useState<string | null>(null)
  const created: Complaint | null = createdId ? complaints.find((c) => c.id === createdId) ?? null : null
  const setCreated = (v: null) => setCreatedId(v)

  const onFile = (f: File | undefined) => {
    if (!f) return
    if (f.size > MAX_BYTES) {
      setErrors((e) => ({ ...e, file: 'Attachments must be 5 MB or smaller.' }))
      return
    }
    setErrors((e) => ({ ...e, file: undefined }))
    setFile(f)
  }

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault()
    const e: Errors = {}
    if (!category) e.category = 'Please choose a category.'
    if (location.trim().length < 2) e.location = 'Please enter where the issue is (at least 2 characters).'
    if (title.trim().length < 5) e.title = 'Title should be at least 5 characters.'
    if (description.trim().length < 20) e.description = 'Please describe the issue in at least 20 characters.'
    setErrors(e)
    if (Object.keys(e).length) return
    const id = addComplaint({ category: category as ComplaintCategory, location: location.trim(), title: title.trim(), description: description.trim(), attachmentName: file?.name ?? null })
    setCreatedId(id)
  }

  if (created) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="flex flex-col items-center py-10 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-success/12 text-success">
            <CheckCircle2 className="size-7" />
          </span>
          <h2 className="mt-5 text-xl font-bold">Demo complaint saved</h2>
          <p className="mt-2 text-sm text-muted-foreground">Your demo ticket ID is</p>
          <p className="mt-2 rounded-lg border bg-muted px-4 py-2 font-mono text-lg font-bold tracking-wide">{created.ticketId}</p>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            Local Demo — Not submitted to SSUET. This ticket is saved only in this browser.
          </p>
          <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild><Link href={`/complaints/${created.ticketId}`}>View complaint</Link></Button>
            <Button variant="outline" onClick={() => { setCreated(null); setCategory(''); setLocation(''); setTitle(''); setDescription(''); setFile(null) }}>
              Submit another
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader title="Submit a new complaint" description="All fields except attachment are required." />
        <CardContent>
          <form onSubmit={submit} noValidate className="flex flex-col gap-5">
            <div>
              <Label htmlFor="cf-cat">Category</Label>
              <Select id="cf-cat" value={category} onChange={(e) => { setCategory(e.target.value as ComplaintCategory); setErrors((x) => ({ ...x, category: undefined })) }} aria-invalid={!!errors.category} aria-describedby={errors.category ? 'cf-cat-err' : undefined}>
                <option value="">Select a category</option>
                {COMPLAINT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </Select>
              <FieldError id="cf-cat-err">{errors.category}</FieldError>
            </div>
            <div>
              <Label htmlFor="cf-loc">Location</Label>
              <Input id="cf-loc" value={location} maxLength={80} onChange={(e) => { setLocation(e.target.value); setErrors((x) => ({ ...x, location: undefined })) }} placeholder="e.g. Computer Lab 2, Room 1, Cafeteria" aria-invalid={!!errors.location} aria-describedby={errors.location ? 'cf-loc-err' : undefined} />
              <FieldError id="cf-loc-err">{errors.location}</FieldError>
            </div>
            <div>
              <Label htmlFor="cf-title">Complaint title</Label>
              <Input id="cf-title" value={title} maxLength={100} onChange={(e) => { setTitle(e.target.value); setErrors((x) => ({ ...x, title: undefined })) }} placeholder="e.g. Projector not working in Room 1" aria-invalid={!!errors.title} aria-describedby={errors.title ? 'cf-title-err' : undefined} />
              <FieldError id="cf-title-err">{errors.title}</FieldError>
            </div>
            <div>
              <Label htmlFor="cf-desc">Detailed description</Label>
              <Textarea id="cf-desc" rows={6} value={description} maxLength={1000} onChange={(e) => { setDescription(e.target.value); setErrors((x) => ({ ...x, description: undefined })) }} placeholder="Describe what happened, where, and when." aria-invalid={!!errors.description} aria-describedby={errors.description ? 'cf-desc-err' : 'cf-desc-hint'} />
              {errors.description ? <FieldError id="cf-desc-err">{errors.description}</FieldError> : <FieldHint id="cf-desc-hint">{description.length}/1000 characters</FieldHint>}
            </div>
            <div>
              <Label htmlFor="cf-file">Attachment (optional)</Label>
              <input id="cf-file" ref={fileRef} type="file" accept="image/*,.pdf" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
              {file ? (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3">
                  <Paperclip className="size-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">{Math.ceil(file.size / 1024)} KB</span>
                  <Button type="button" variant="ghost" size="icon" aria-label="Remove attachment" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }}>
                    <X />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]) }}
                  className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border bg-muted/40 px-4 py-6 text-center transition-colors hover:border-brand/40 hover:bg-accent"
                >
                  <FileUp className="size-5 text-muted-foreground" />
                  <span className="text-sm font-semibold">Choose a file or drag it here</span>
                  <span className="text-xs text-muted-foreground">Image or PDF up to 5 MB · file name only is kept (prototype)</span>
                </button>
              )}
              <FieldError>{errors.file}</FieldError>
            </div>
            <Button type="submit" size="lg" className="self-start">Submit complaint</Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader title="What happens next" />
          <CardContent>
            <ol className="flex flex-col gap-3 text-sm">
              {['Submitted — a demo ticket ID is created', 'Under Review — the demo ticket is marked as being reviewed', 'Resolved — the demo ticket is marked as finished'].map((s, i) => (
                <li key={s} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">{i + 1}</span>
                  <span className="leading-relaxed">{s}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
        <Notice tone="warning" title="Local Demo — Not submitted to SSUET.">Complaints are saved only in this browser and are never sent to any university office.</Notice>
      </div>
    </div>
  )
}
