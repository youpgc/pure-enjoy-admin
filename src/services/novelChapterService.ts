import { supabase } from '../utils/supabase'
import { apiExecute, apiQuery } from '../utils/apiClient'

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

/// 查找相邻章节（调整顺序用）：按方向返回比当前章号小/大且最接近的章节
/// 成功时 data 为 [{ id, chapter_num }]（至多 1 条），无相邻章则 data 为空数组
export const findAdjacentChapter = (
  novelId: string,
  currentChapterNum: number,
  currentChapterId: string,
  direction: 'up' | 'down',
) => {
  return apiQuery<{ id: string; chapter_num: number }[]>(
    () => {
      let q = (supabase.from('novel_chapters') as any)
        .select('id, chapter_num')
        .eq('novel_id', novelId)
        .neq('id', currentChapterId)
      if (direction === 'up') {
        q = q.lt('chapter_num', currentChapterNum).order('chapter_num', { ascending: false })
      } else {
        q = q.gt('chapter_num', currentChapterNum).order('chapter_num', { ascending: true })
      }
      return q.limit(1)
    },
    'novelChapter-查找相邻章',
  )
}

/// 查询某小说当前最大章节号（新增章节时避免冲突）
/// 成功且存在章节时 data 为 { chapter_num }；无章节（.single 返回 0 行错误）时 success=false
export const findMaxChapterNum = (novelId: string) => {
  return apiQuery<{ chapter_num: number }>(
    () => (supabase.from('novel_chapters') as any)
      .select('chapter_num')
      .eq('novel_id', novelId)
      .order('chapter_num', { ascending: false })
      .limit(1)
      .single(),
    'novelChapter-最大章号',
  )
}
