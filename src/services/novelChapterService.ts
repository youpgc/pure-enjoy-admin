import { supabase } from '../utils/supabase'
import { apiExecute } from '../utils/apiClient'

/// 交换两章的章节号（审查 P1-4b：把组件层裸 supabase.from 收敛到 service 层）
/// update1: 将 chapterId 的章节号改为 targetChapterNum
/// update2: 将 targetId 的章节号改为 chapterNum
/// 注：generated database.ts 对 novel_chapters 写操作解析为 never，builder 级 as any 收敛在 service 内
export const swapChapterNumbers = (
  chapterId: string,
  targetChapterNum: number,
  targetId: string,
  chapterNum: number,
) => {
  const updateA = apiExecute(
    () => (supabase.from('novel_chapters') as any).update({ chapter_num: targetChapterNum }).eq('id', chapterId),
    'novelChapter-交换A',
  )
  const updateB = apiExecute(
    () => (supabase.from('novel_chapters') as any).update({ chapter_num: chapterNum }).eq('id', targetId),
    'novelChapter-交换B',
  )
  return Promise.all([updateA, updateB])
}
