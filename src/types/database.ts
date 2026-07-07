/// ============================================================
/// Supabase 数据库类型定义（手动维护版）
///
/// 说明：
/// 1. 当前为手动维护的精简类型定义，覆盖项目中最常用的表
/// 2. 建议后续迁移为 Supabase CLI 自动生成版本：
///    npx supabase gen types typescript --project-id mhdrbjpqmzswswoazwjg --schema public > src/types/database.ts
/// 3. 迁移后只需替换此文件内容，无需修改 supabase.ts 中的导入
/// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          phone: string | null
          password_hash: string | null
          nickname: string | null
          avatar_url: string | null
          username: string | null
          bio: string | null
          gender: string | null
          birthday: string | null
          location: string | null
          occupation: string | null
          company: string | null
          website: string | null
          role: string
          member_level: string
          points: number
          effective_points: number
          available_points: number
          expiring_points: number
          consecutive_checkin_days: number
          last_checkin_date: string | null
          tts_speech_rate: number | null
          tts_timer_minutes: number | null
          tts_playback_mode: string | null
          tts_enabled: boolean
          status: string
          register_ip: string | null
          last_login_ip: string | null
          last_login_at: string | null
          login_count: number
          is_deleted: boolean
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['users']['Row']>
      }
      novels: {
        Row: {
          id: string
          title: string
          author: string | null
          cover_url: string | null
          description: string | null
          category: string | null
          source: string | null
          source_url: string | null
          tags: string[] | null
          chapter_count: number
          word_count: number | null
          status: string | null
          is_free: boolean | null
          price: number | null
          rating: number | null
          read_count: number | null
          collect_count: number | null
          rating_count: number
          tts_play_count: number
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['novels']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['novels']['Row']>
      }
      novel_chapters: {
        Row: {
          id: string
          novel_id: string
          title: string
          content: string
          chapter_num: number
          word_count: number | null
          is_free: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['novel_chapters']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['novel_chapters']['Row']>
      }
      user_novels: {
        Row: {
          id: string
          user_id: string
          novel_id: string
          progress: number
          last_chapter: number | null
          last_char_offset: number
          reading_status: string
          is_collected: boolean | null
          last_read_at: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['user_novels']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_novels']['Row']>
      }
      point_records: {
        Row: {
          id: string
          user_id: string
          type: string
          points: number
          description: string | null
          source_id: string | null
          source_type: string | null
          operator_id: string | null
          operator_name: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['point_records']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['point_records']['Row']>
      }
      expenses: {
        Row: {
          id: string
          user_id: string
          amount: number
          category: string
          description: string | null
          note: string | null
          date: string
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['expenses']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['expenses']['Row']>
      }
      weight_records: {
        Row: {
          id: string
          user_id: string
          weight: number
          bmi: number | null
          body_fat: number | null
          note: string | null
          date: string
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['weight_records']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['weight_records']['Row']>
      }
      operation_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          module: string | null
          target_id: string | null
          details: Json | null
          ip: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['operation_logs']['Row'], 'created_at'>
        Update: never
      }
      error_logs: {
        Row: {
          id: string
          level: string
          module: string
          message: string
          detail: Json | null
          user_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['error_logs']['Row'], 'created_at'>
        Update: never
      }
      reading_history: {
        Row: {
          id: string
          user_id: string
          novel_id: string
          chapter_id: string | null
          chapter_order: number | null
          read_duration_seconds: number
          progress: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['reading_history']['Row'], 'created_at'>
        Update: never
      }
      notifications: {
        Row: {
          id: string
          title: string
          content: string
          type: string
          target_users: string[] | null
          is_read: boolean
          read_at: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['notifications']['Row']>
      }
      user_feedback: {
        Row: {
          id: string
          user_id: string
          type: string
          content: string
          contact: string | null
          status: string
          is_deleted: boolean
          deleted_at: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['user_feedback']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_feedback']['Row']>
      }
      novel_annotations: {
        Row: {
          id: string
          user_id: string
          novel_id: string
          chapter_id: string
          chapter_order: number
          start_offset: number
          end_offset: number
          highlighted_text: string
          note: string | null
          color: string
          is_deleted: boolean
          deleted_at: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['novel_annotations']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['novel_annotations']['Row']>
      }
      novel_bookmarks: {
        Row: {
          id: string
          user_id: string
          novel_id: string
          chapter_id: string
          chapter_order: number
          char_offset: number
          note: string | null
          bookmark_type: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['novel_bookmarks']['Row'], 'created_at'>
        Update: never
      }
      tts_playback_logs: {
        Row: {
          id: string
          user_id: string
          novel_id: string
          chapter_id: string
          start_sentence_index: number
          end_sentence_index: number | null
          duration_seconds: number | null
          speech_rate: number
          playback_mode: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['tts_playback_logs']['Row'], 'created_at'>
        Update: never
      }
      user_recommendation_feedback: {
        Row: {
          id: string
          user_id: string
          novel_id: string
          feedback_type: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_recommendation_feedback']['Row'], 'created_at'>
        Update: never
      }
    }
    Views: {
      mv_novel_rankings: {
        Row: {
          novel_id: string
          title: string
          author: string | null
          cover_url: string | null
          category: string | null
          status: string | null
          total_reads: number
          total_collects: number
          avg_rating: number
          rating_count: number
          tts_play_count: number
          daily_reads: number
          daily_collects: number
          weekly_reads: number
          weekly_collects: number
          monthly_reads: number
          monthly_collects: number
          created_at: string | null
          computed_at: string
        }
      }
    }
    Functions: {
      fn_get_monthly_expense_total: {
        Args: { p_user_id: string; p_year: number; p_month: number; p_category: string }
        Returns: { total: number }[]
      }
      fn_get_recommendations: {
        Args: { p_user_id: string; p_limit?: number }
        Returns: { novel_id: string; title: string; author: string | null; cover_url: string | null; recommendation_score: number; reason: string }[]
      }
      get_user_dimension_stats: {
        Args: { p_table_name: string; p_user_ids?: string[] }
        Returns: { user_id: string; count: number; latest_record_at: string }[]
      }
      fn_refresh_rankings: {
        Args: Record<string, never>
        Returns: void
      }
    }
    Enums: {}
  }
}

/// 简化的表行类型（供 Service 层使用）
export type DbUser = Database['public']['Tables']['users']['Row']
export type DbNovel = Database['public']['Tables']['novels']['Row']
export type DbNovelChapter = Database['public']['Tables']['novel_chapters']['Row']
export type DbExpense = Database['public']['Tables']['expenses']['Row']
export type DbWeightRecord = Database['public']['Tables']['weight_records']['Row']
export type DbOperationLog = Database['public']['Tables']['operation_logs']['Row']
export type DbErrorLog = Database['public']['Tables']['error_logs']['Row']
export type DbNotification = Database['public']['Tables']['notifications']['Row']
export type DbPointRecord = Database['public']['Tables']['point_records']['Row']
