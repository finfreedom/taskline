import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { loadTasks, STORAGE_KEY } from './storage'
import type { Task } from './storage'

type DeletedTask = { task: Task; index: number }
const UNDO_DELAY = 8000

type Filter = 'all' | 'active' | 'done'
const filters: { id: Filter; label: string }[] = [{ id: 'all', label: 'Все' }, { id: 'active', label: 'Активные' }, { id: 'done', label: 'Выполненные' }]
const empty = {
  all: ['Место для ваших планов', 'Добавьте первую задачу. Большие дела начинаются с маленького шага.'],
  active: ['Всё сделано. Можно выдохнуть.', 'Активных задач пока нет. Добавьте новую, когда будете готовы.'],
  done: ['Здесь будут ваши результаты', 'Отметьте выполненную задачу — она появится здесь.'],
}
function Check({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path pathLength="1" d="m6 12 4 4 8-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
export default function App() {
  const [initial] = useState(loadTasks)
  const [tasks, setTasks] = useState<Task[]>(initial.tasks)
  const [storageError, setStorageError] = useState(initial.error)
  const [title, setTitle] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [announcement, setAnnouncement] = useState('')
  const [showCompletion, setShowCompletion] = useState(false)
  const [deleted, setDeleted] = useState<DeletedTask | null>(null)
  const [undoHovered, setUndoHovered] = useState(false)
  const [undoFocused, setUndoFocused] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  // Give keyboard and pointer users time to use Undo without racing the timer.
  useEffect(() => {
    if (!deleted || undoHovered || undoFocused) return
    const timer = window.setTimeout(() => setDeleted(null), UNDO_DELAY)
    return () => window.clearTimeout(timer)
  }, [deleted, undoHovered, undoFocused])
  useEffect(() => {
    if (!showCompletion) return
    const timer = window.setTimeout(() => setShowCompletion(false), 4000)
    return () => window.clearTimeout(timer)
  }, [showCompletion])
  const remaining = tasks.filter(t => !t.done).length
  const completed = tasks.length - remaining
  const visible = tasks.filter(t => filter === 'all' || (filter === 'done' ? t.done : !t.done))
  const counts = { all: tasks.length, active: remaining, done: completed }
  function update(next: Task[], message: string) {
    if (initial.error) return
    setShowCompletion(false)
    setTasks(next)
    setAnnouncement(message)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setStorageError('')
    } catch {
      setStorageError('Изменения пока только в этой вкладке. Хранилище недоступно или заполнено. Не закрывайте страницу; разрешите сохранение и повторите попытку.')
    }
  }
  function add(event: FormEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed || initial.error) return
    update([...tasks, { id: crypto.randomUUID(), title: trimmed, done: false }], 'Задача добавлена')
    setTitle('')
    setFilter('all')
    input.current?.focus()
  }
  function toggle(task: Task) {
    const justFinished = !task.done && remaining === 1
    update(
      tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t),
      justFinished ? 'Всё сделано. Отличная работа!' : task.done ? 'Задача снова активна' : 'Задача выполнена',
    )
    if (justFinished) setShowCompletion(true)
  }
  function remove(task: Task) {
    setDeleted({ task, index: tasks.findIndex(t => t.id === task.id) })
    update(tasks.filter(t => t.id !== task.id), 'Задача удалена. Последнее удаление можно отменить кнопкой «Вернуть» в течение 8 секунд.')
  }
  function undoRemove() {
    if (!deleted) return
    const next = [...tasks]
    next.splice(Math.min(deleted.index, next.length), 0, deleted.task)
    update(next, 'Задача восстановлена')
    if ((filter === 'active' && deleted.task.done) || (filter === 'done' && !deleted.task.done)) setFilter('all')
    setDeleted(null)
    setUndoHovered(false)
    setUndoFocused(false)
    input.current?.focus()
  }
  return <div className={deleted ? 'shell has-undo' : 'shell'}>
    <header className="brand"><a href="./" aria-label="Taskline — главная"><span className="brand-icon"><Check /></span>taskline<span className="brand-dot">.</span></a><span className="brand-note">Меньше слов. Больше дела.</span></header>
    <main>
      <div className="intro"><div><p className="eyebrow">Ваше пространство для дел</p><h1>Один шаг за раз.</h1><p className="subtitle">Освободите мысли. Запишите то, что важно.</p></div><span className="intro-mark" aria-hidden="true"><Check /></span></div>
      <section className="workspace" aria-label="Список задач">
        <form onSubmit={add} className="add-form"><label className="sr-only" htmlFor="task-title">Новая задача</label><span className="input-plus" aria-hidden="true">+</span><input ref={input} id="task-title" placeholder="Что нужно сделать?" value={title} onChange={e => setTitle(e.target.value)} maxLength={300} autoComplete="off" disabled={!!initial.error} /><button className="add-button" disabled={!title.trim() || !!initial.error} type="submit">Добавить<span aria-hidden="true"> ↵</span></button></form>
        {storageError && <div className="error" role="alert">{storageError}{!initial.error && <button onClick={() => update(tasks, 'Сохранение повторено')}>Повторить сохранение</button>}</div>}
        <div className="list-toolbar"><div className="filters" role="group" aria-label="Фильтр задач">{filters.map(f => <button key={f.id} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}<span>{counts[f.id]}</span></button>)}</div></div>
        {showCompletion && <div className="completion-notice" data-testid="completion-notice">
          <span className="completion-icon"><Check /></span>
          <span>Всё сделано. Отличная работа!</span>
        </div>}
        {visible.length ? <ul className="task-list">{visible.map(task => <li key={task.id} className={task.done ? 'task is-done' : 'task'}><label className="task-label"><input type="checkbox" checked={task.done} onChange={() => toggle(task)} /><span className="check-box"><Check /></span><span className="task-title">{task.title}</span></label><button className="delete" aria-label={`Удалить задачу: ${task.title}`} onClick={() => remove(task)}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 10v6M14 10v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button></li>)}</ul> : <div className="empty"><div className="empty-icon" aria-hidden="true"><Check /><span /></div><h2>{empty[filter][0]}</h2><p>{empty[filter][1]}</p></div>}
        <footer className="list-footer"><span data-testid="remaining">Осталось задач: <strong>{remaining}</strong></span><span>{completed > 0 ? `Выполнено ${completed} из ${tasks.length}` : 'В своём темпе'}</span></footer>
      </section>
      <p className="privacy"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="6" y="10" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M9 10V7a3 3 0 0 1 6 0v3" stroke="currentColor" strokeWidth="1.5"/></svg>{storageError ? 'Есть проблема с сохранением' : 'Задачи сохраняются в этом браузере'}</p>
      <span className="sr-only" role="status">{announcement}</span>
    </main>
    {deleted && <div
      className="undo-notice"
      role="region"
      aria-label="Отмена последнего удаления"
      onMouseEnter={() => setUndoHovered(true)}
      onMouseLeave={() => setUndoHovered(false)}
      onFocus={() => setUndoFocused(true)}
      onBlur={() => setUndoFocused(false)}
    >
      <div className="undo-copy"><span>Задача удалена</span><span className="undo-title" title={deleted.task.title}>{deleted.task.title}</span></div>
      <button type="button" onClick={undoRemove}>Вернуть</button>
    </div>}
    <footer className="page-footer"><span>Немного порядка каждый день.</span><span>Taskline</span></footer>
  </div>
}
