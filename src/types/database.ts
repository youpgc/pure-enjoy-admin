/// ============================================================
/// Supabase 数据库类型定义
///
/// 说明：
/// 1. 本文件基于数据库 schema 元数据生成，覆盖所有 40 张业务表
/// 2. 可通过 Supabase CLI 或 Dashboard 更新后重新生成：
///    npx supabase gen types typescript --project-id mhdrbjpqmzswswoazwjg --schema public > src/types/database.ts
/// 3. 更新后只需替换此文件内容，无需修改 supabase.ts 中的导入
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
      // 1. admin_users
      admin_users: {
        Row: {
          id: number
          email: string
          role: string
          name: string | null
          created_at: string
          nickname: string | null
          avatar_url: string | null
          updated_at: string | null
          password_hash: string | null
          auth_users_id: string | null
        }
        Insert: Omit<Database['public']['Tables']['admin_users']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['admin_users']['Row']>
      }

      // 2. announcements
      announcements: {
        Row: {
          id: string
          title: string
          content: string | null
          type: string
          priority: string
          is_published: boolean
          publish_at: string | null
          expire_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['announcements']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['announcements']['Row']>
      }

      // 3. app_configs
      app_configs: {
        Row: {
          id: string
          config_key: string
          title: string
          content: string
          config_type: string
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['app_configs']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['app_configs']['Row']>
      }

      // 4. app_versions
      app_versions: {
        Row: {
          id: number
          version: string
          build_number: number
          release_type: string
          release_notes: string
          apk_url: string | null
          apk_size: number | null
          status: string
          released_at: string | null
          revoked_at: string | null
          created_at: string
          created_by: string | null
          checksum: string | null
          is_force_update: boolean | null
          platform: string | null
          file_name: string | null
        }
        Insert: Omit<Database['public']['Tables']['app_versions']['Row'], 'id' | 'created_at'> & {
          id?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['app_versions']['Row']>
      }

      // 5. dict_items
      dict_items: {
        Row: {
          id: string
          type_id: string
          code: string
          label: string
          value: string | null
          extra: Json | null
          sort_order: number | null
          is_default: boolean | null
          status: string | null
          created_at: string | null
          updated_at: string | null
          is_active: boolean | null
        }
        Insert: Omit<Database['public']['Tables']['dict_items']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['dict_items']['Row']>
      }

      // 6. dict_types
      dict_types: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
          sort_order: number | null
          is_system: boolean | null
          status: string | null
          created_at: string | null
          updated_at: string | null
          is_active: boolean | null
        }
        Insert: Omit<Database['public']['Tables']['dict_types']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['dict_types']['Row']>
      }

      // 7. error_logs
      error_logs: {
        Row: {
          id: string
          level: string | null
          module: string | null
          message: string
          detail: Json | null
          user_id: string | null
          created_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['error_logs']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['error_logs']['Row']>
      }

      // 8. expenses
      expenses: {
        Row: {
          id: string
          user_id: string
          amount: number
          category: string
          description: string | null
          created_at: string | null
          updated_at: string | null
          user_nickname: string | null
          note: string | null
          date: string | null
        }
        Insert: Omit<Database['public']['Tables']['expenses']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['expenses']['Row']>
      }

      // 9. feedback_flow_records
      feedback_flow_records: {
        Row: {
          id: string
          feedback_id: string
          action: string
          remark: string | null
          operator_id: string | null
          operator_name: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['feedback_flow_records']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['feedback_flow_records']['Row']>
      }

      // 10. files
      files: {
        Row: {
          id: string
          file_name: string
          original_name: string
          file_type: string
          file_category: string | null
          mime_type: string | null
          size: number | null
          url: string
          thumbnail_url: string | null
          description: string | null
          uploaded_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['files']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['files']['Row']>
      }

      // 11. habit_checkins
      habit_checkins: {
        Row: {
          id: string
          habit_id: string
          checkin_at: string | null
          created_at: string | null
          note: string | null
          user_id: string | null
        }
        Insert: Omit<Database['public']['Tables']['habit_checkins']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['habit_checkins']['Row']>
      }

      // 12. habits
      habits: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          target_days: number | null
          current_streak: number | null
          longest_streak: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
          frequency: string | null
          max_streak: number | null
          total_checkins: number | null
          color: string | null
          user_nickname: string | null
          reminder_enabled: boolean | null
          reminder_hour: number | null
          reminder_minute: number | null
        }
        Insert: Omit<Database['public']['Tables']['habits']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['habits']['Row']>
      }

      // 13. mood_diaries
      mood_diaries: {
        Row: {
          id: string
          user_id: string | null
          mood: string
          mood_label: string | null
          content: string | null
          date: string
          created_at: string
          synced: boolean
          user_nickname: string | null
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['mood_diaries']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['mood_diaries']['Row']>
      }

      // 14. notes
      notes: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string | null
          tags: string[] | null
          is_pinned: boolean | null
          created_at: string | null
          updated_at: string | null
          user_nickname: string | null
          category: string | null
        }
        Insert: Omit<Database['public']['Tables']['notes']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['notes']['Row']>
      }

      // 15. notifications
      notifications: {
        Row: {
          id: string
          user_id: string | null
          type: string
          title: string
          body: string | null
          icon: string | null
          color: string | null
          payload: string | null
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['notifications']['Row']>
      }

      // 16. novel_annotations
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
          color: string | null
          is_deleted: boolean | null
          deleted_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['novel_annotations']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['novel_annotations']['Row']>
      }

      // 17. novel_bookmarks
      novel_bookmarks: {
        Row: {
          id: string
          user_id: string
          novel_id: string
          chapter_id: string
          chapter_order: number
          char_offset: number | null
          note: string | null
          bookmark_type: string | null
          created_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['novel_bookmarks']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['novel_bookmarks']['Row']>
      }

      // 18. novel_chapters
      novel_chapters: {
        Row: {
          id: string
          novel_id: string
          chapter_num: number
          title: string
          content: string
          word_count: number | null
          is_free: boolean
          price: number
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['novel_chapters']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['novel_chapters']['Row']>
      }

      // 19. novel_comments
      novel_comments: {
        Row: {
          id: string
          novel_id: string
          user_id: string
          user_nickname: string | null
          user_avatar: string | null
          content: string
          rating: number | null
          parent_id: string | null
          reply_to_user_id: string | null
          reply_to_nickname: string | null
          like_count: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['novel_comments']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['novel_comments']['Row']>
      }

      // 20. novels
      novels: {
        Row: {
          id: string
          user_id: string | null
          title: string
          author: string | null
          cover_url: string | null
          description: string | null
          category: string | null
          source: string | null
          source_url: string | null
          tags: string[] | null
          chapter_count: number | null
          word_count: number | null
          status: string | null
          is_free: boolean | null
          price: number | null
          rating: number | null
          read_count: number | null
          collect_count: number | null
          created_at: string | null
          updated_at: string | null
          rating_count: number | null
          tts_play_count: number | null
        }
        Insert: Omit<Database['public']['Tables']['novels']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['novels']['Row']>
      }

      // 21. operation_logs
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
        Insert: Omit<Database['public']['Tables']['operation_logs']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['operation_logs']['Row']>
      }

      // 22. permissions
      permissions: {
        Row: {
          id: number
          name: string
          display_name: string
          type: string
          parent_id: number | null
          sort_order: number
          module: string | null
          description: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['permissions']['Row'], 'id' | 'created_at'> & {
          id?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['permissions']['Row']>
      }

      // 23. point_records
      point_records: {
        Row: {
          id: string
          user_id: string
          type: string
          amount: number
          remark: string | null
          operator_id: string | null
          operator_name: string | null
          created_at: string
          expires_at: string | null
          status: string | null
          created_date: string | null
        }
        Insert: Omit<Database['public']['Tables']['point_records']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['point_records']['Row']>
      }

      // 24. reading_history
      reading_history: {
        Row: {
          id: string
          user_id: string
          novel_id: string
          chapter_id: string | null
          chapter_order: number | null
          read_duration_seconds: number | null
          progress: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['reading_history']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['reading_history']['Row']>
      }

      // 25. reminder_schedules
      reminder_schedules: {
        Row: {
          id: string
          habit_id: string
          user_id: string
          schedule_type: string
          week_days: Json | null
          month_days: Json | null
          months: Json | null
          years: Json | null
          dates: Json | null
          time: string
          is_enabled: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['reminder_schedules']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['reminder_schedules']['Row']>
      }

      // 26. reminders
      reminders: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          remind_at: string
          is_completed: boolean | null
          is_repeated: boolean | null
          repeat_type: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['reminders']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['reminders']['Row']>
      }

      // 27. role_permissions （复合主键，无 id）
      role_permissions: {
        Row: {
          role_id: number
          permission_id: number
        }
        Insert: Database['public']['Tables']['role_permissions']['Row']
        Update: Partial<Database['public']['Tables']['role_permissions']['Row']>
      }

      // 28. roles
      roles: {
        Row: {
          id: number
          name: string
          code: string
          description: string | null
          is_system: boolean
          status: string
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['roles']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['roles']['Row']>
      }

      // 29. sensitive_word_configs
      sensitive_word_configs: {
        Row: {
          id: string
          config_key: string
          config_value: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['sensitive_word_configs']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['sensitive_word_configs']['Row']>
      }

      // 30. sensitive_word_logs
      sensitive_word_logs: {
        Row: {
          id: string
          word_id: string
          word: string
          category: string
          source: string
          source_id: string | null
          user_id: string | null
          content_snippet: string | null
          action_taken: string
          ip_address: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['sensitive_word_logs']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['sensitive_word_logs']['Row']>
      }

      // 31. sensitive_words
      sensitive_words: {
        Row: {
          id: string
          word: string
          category: string
          level: string
          replace_word: string | null
          description: string | null
          match_mode: string
          is_active: boolean
          hit_count: number
          created_by: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['sensitive_words']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['sensitive_words']['Row']>
      }

      // 32. system_configs
      system_configs: {
        Row: {
          id: number
          key: string
          value: Json
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['system_configs']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['system_configs']['Row']>
      }

      // 33. tts_playback_logs
      tts_playback_logs: {
        Row: {
          id: string
          user_id: string
          novel_id: string
          chapter_id: string
          start_sentence_index: number | null
          end_sentence_index: number | null
          duration_seconds: number | null
          speech_rate: number | null
          playback_mode: string | null
          created_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['tts_playback_logs']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['tts_playback_logs']['Row']>
      }

      // 34. user_anniversaries
      user_anniversaries: {
        Row: {
          id: string
          user_id: string
          user_nickname: string | null
          title: string
          date: string
          type: string
          description: string | null
          repeat_yearly: boolean
          remind_enabled: boolean
          remind_days_before: number | null
          created_at: string
          updated_at: string | null
          is_lunar: boolean | null
        }
        Insert: Omit<Database['public']['Tables']['user_anniversaries']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_anniversaries']['Row']>
      }

      // 35. user_favorites
      user_favorites: {
        Row: {
          id: string
          user_id: string
          title: string
          url: string | null
          category: string | null
          tags: string[] | null
          is_pinned: boolean | null
          created_at: string | null
          updated_at: string | null
          user_nickname: string | null
          description: string | null
        }
        Insert: Omit<Database['public']['Tables']['user_favorites']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_favorites']['Row']>
      }

      // 36. user_feedback
      user_feedback: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          category: string
          status: string
          admin_reply: string | null
          created_at: string
          updated_at: string | null
          user_nickname: string | null
          is_deleted: boolean | null
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['user_feedback']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_feedback']['Row']>
      }

      // 37. user_novels
      user_novels: {
        Row: {
          id: string
          user_id: string
          novel_id: string
          progress: number
          last_chapter: number
          last_read_at: string | null
          is_collected: boolean
          created_at: string
          updated_at: string | null
          last_char_offset: number | null
          reading_status: string | null
          device_id: string | null
          sync_version: number | null
          content_offset: number | null
          page_index: number | null
          font_style_hash: string | null
          layout_cache: unknown | null
          updated_device: string | null
        }
        Insert: Omit<Database['public']['Tables']['user_novels']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_novels']['Row']>
      }

      // 38. user_recommendation_feedback
      user_recommendation_feedback: {
        Row: {
          id: string
          user_id: string
          novel_id: string
          feedback_type: string
          created_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['user_recommendation_feedback']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_recommendation_feedback']['Row']>
      }

      // 39. users
      users: {
        Row: {
          id: string
          email: string
          phone: string | null
          password_hash: string | null
          auth_id: string | null
          nickname: string | null
          avatar_url: string | null
          role: string
          member_level: string
          points: number
          status: string
          register_ip: string | null
          last_login_ip: string | null
          last_login_at: string | null
          login_count: number
          created_at: string
          updated_at: string
          username: string | null
          sms_code: string | null
          sms_code_expires_at: string | null
          bio: string | null
          location: string | null
          birthday: string | null
          gender: string | null
          height: number | null
          occupation: string | null
          company: string | null
          website: string | null
          consecutive_checkin_days: number | null
          effective_points: number | null
          available_points: number | null
          expiring_points: number | null
          last_checkin_date: string | null
          tts_speech_rate: number | null
          tts_timer_minutes: number | null
          tts_playback_mode: string | null
          tts_enabled: boolean | null
          is_deleted: boolean | null
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['users']['Row']>
      }

      // 40. weight_records
      weight_records: {
        Row: {
          id: string
          user_id: string
          weight: number
          body_fat: number | null
          created_at: string | null
          updated_at: string | null
          user_nickname: string | null
          bmi: number | null
          note: string | null
          date: string | null
        }
        Insert: Omit<Database['public']['Tables']['weight_records']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['weight_records']['Row']>
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
    CompositeTypes: {
      [key: string]: never
    }
  }
}

// ============================================================
// 常用类型别名（供 Service 层使用）
// ============================================================

export type DbUser = Database['public']['Tables']['users']['Row']
export type DbNovel = Database['public']['Tables']['novels']['Row']
export type DbNovelChapter = Database['public']['Tables']['novel_chapters']['Row']
export type DbNovelComment = Database['public']['Tables']['novel_comments']['Row']
export type DbNovelAnnotation = Database['public']['Tables']['novel_annotations']['Row']
export type DbNovelBookmark = Database['public']['Tables']['novel_bookmarks']['Row']
export type DbUserNovel = Database['public']['Tables']['user_novels']['Row']
export type DbReadingHistory = Database['public']['Tables']['reading_history']['Row']
export type DbExpense = Database['public']['Tables']['expenses']['Row']
export type DbWeightRecord = Database['public']['Tables']['weight_records']['Row']
export type DbPointRecord = Database['public']['Tables']['point_records']['Row']
export type DbOperationLog = Database['public']['Tables']['operation_logs']['Row']
export type DbErrorLog = Database['public']['Tables']['error_logs']['Row']
export type DbNotification = Database['public']['Tables']['notifications']['Row']
export type DbAdminUser = Database['public']['Tables']['admin_users']['Row']
export type DbFile = Database['public']['Tables']['files']['Row']
export type DbRole = Database['public']['Tables']['roles']['Row']
export type DbPermission = Database['public']['Tables']['permissions']['Row']
export type DbRolePermission = Database['public']['Tables']['role_permissions']['Row']
export type DbUserFeedback = Database['public']['Tables']['user_feedback']['Row']
export type DbFeedbackFlowRecord = Database['public']['Tables']['feedback_flow_records']['Row']
export type DbAnnouncement = Database['public']['Tables']['announcements']['Row']
export type DbAppConfig = Database['public']['Tables']['app_configs']['Row']
export type DbAppVersion = Database['public']['Tables']['app_versions']['Row']
export type DbSystemConfig = Database['public']['Tables']['system_configs']['Row']
export type DbSensitiveWord = Database['public']['Tables']['sensitive_words']['Row']
export type DbSensitiveWordLog = Database['public']['Tables']['sensitive_word_logs']['Row']
export type DbSensitiveWordConfig = Database['public']['Tables']['sensitive_word_configs']['Row']
export type DbHabit = Database['public']['Tables']['habits']['Row']
export type DbHabitCheckin = Database['public']['Tables']['habit_checkins']['Row']
export type DbNote = Database['public']['Tables']['notes']['Row']
export type DbMoodDiary = Database['public']['Tables']['mood_diaries']['Row']
export type DbReminder = Database['public']['Tables']['reminders']['Row']
export type DbReminderSchedule = Database['public']['Tables']['reminder_schedules']['Row']
export type DbUserAnniversary = Database['public']['Tables']['user_anniversaries']['Row']
export type DbUserFavorite = Database['public']['Tables']['user_favorites']['Row']
export type DbUserRecommendationFeedback = Database['public']['Tables']['user_recommendation_feedback']['Row']
export type DbTtsPlaybackLog = Database['public']['Tables']['tts_playback_logs']['Row']
export type DbDictType = Database['public']['Tables']['dict_types']['Row']
export type DbDictItem = Database['public']['Tables']['dict_items']['Row']
