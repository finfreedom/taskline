export type Task = { id: string; title: string; done: boolean }
export const STORAGE_KEY = 'taskline.tasks.v1'
export function loadTasks(): { tasks: Task[]; error: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return { tasks: [], error: '' }
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data) || !data.every((t: unknown): t is Task =>
      typeof t === 'object' && t !== null && 'id' in t && typeof t.id === 'string' &&
      'title' in t && typeof t.title === 'string' && t.title.trim().length > 0 &&
      'done' in t && typeof t.done === 'boolean') ||
      new Set(data.map(t => t.id)).size !== data.length) throw new Error('Invalid data')
    return { tasks: data, error: '' }
  } catch {
    return { tasks: [], error: 'Не удалось прочитать сохранённые задачи. Исходные данные не изменены. Проверьте доступ к хранилищу и обновите страницу.' }
  }
}
