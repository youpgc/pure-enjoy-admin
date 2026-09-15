/// ============================================================
/// Supabase 数据库类型定义
///
/// 说明：
/// 1. 本文件依据 2026-09-15 pg_catalog 实测 dump 全量重生成
///    （取证 SQL：D:\workspace\sql\diag_database_ts_schema_dump_20260915.sql，
///     dump 存档：D:\workspace\sql\gen\database_ts_20260915\），
///     覆盖 public schema 全部 63 张表 + 2 个物化视图，列定义与线上逐列一致。
/// 2. 手动同步流程：跑取证 SQL → 四段结果存 CSV → 运行
///    gen\database_ts_20260915\gen_database_ts.py 重生成本文件。
/// 3. 更新后无需修改 supabase.ts 等处的导入。
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
        Insert: Omit<Database['public']['Tables']['admin_users']['Row'], 'id' | 'role' | 'name' | 'created_at' | 'nickname' | 'avatar_url' | 'updated_at' | 'password_hash' | 'auth_users_id'> & {
          id?: number
          role?: string
          name?: string | null
          created_at?: string
          nickname?: string | null
          avatar_url?: string | null
          updated_at?: string | null
          password_hash?: string | null
          auth_users_id?: string | null
        }
        Update: Partial<Database['public']['Tables']['admin_users']['Row']>
        Relationships: []
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
        Insert: Omit<Database['public']['Tables']['announcements']['Row'], 'id' | 'content' | 'type' | 'priority' | 'is_published' | 'publish_at' | 'expire_at' | 'created_at'> & {
          id?: string
          content?: string | null
          type?: string
          priority?: string
          is_published?: boolean
          publish_at?: string | null
          expire_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['announcements']['Row']>
        Relationships: []
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
        Insert: Omit<Database['public']['Tables']['app_configs']['Row'], 'id' | 'content' | 'config_type' | 'sort_order' | 'is_active' | 'created_at' | 'updated_at'> & {
          id?: string
          content?: string
          config_type?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['app_configs']['Row']>
        Relationships: []
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
          github_url: string | null
        }
        Insert: Omit<Database['public']['Tables']['app_versions']['Row'], 'id' | 'build_number' | 'release_type' | 'release_notes' | 'apk_url' | 'apk_size' | 'status' | 'released_at' | 'revoked_at' | 'created_at' | 'created_by' | 'checksum' | 'is_force_update' | 'platform' | 'file_name' | 'github_url'> & {
          id?: number
          build_number?: number
          release_type?: string
          release_notes?: string
          apk_url?: string | null
          apk_size?: number | null
          status?: string
          released_at?: string | null
          revoked_at?: string | null
          created_at?: string
          created_by?: string | null
          checksum?: string | null
          is_force_update?: boolean | null
          platform?: string | null
          file_name?: string | null
          github_url?: string | null
        }
        Update: Partial<Database['public']['Tables']['app_versions']['Row']>
        Relationships: []
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
        Insert: Omit<Database['public']['Tables']['dict_items']['Row'], 'id' | 'value' | 'extra' | 'sort_order' | 'is_default' | 'status' | 'created_at' | 'updated_at' | 'is_active'> & {
          id?: string
          value?: string | null
          extra?: Json | null
          sort_order?: number | null
          is_default?: boolean | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
          is_active?: boolean | null
        }
        Update: Partial<Database['public']['Tables']['dict_items']['Row']>
        Relationships: [
          {
            foreignKeyName: 'dict_items_type_id_fkey'
            columns: ['type_id']
            isOneToOne: false
            referencedRelation: 'dict_types'
            referencedColumns: ['id']
          },
        ]
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
        Insert: Omit<Database['public']['Tables']['dict_types']['Row'], 'id' | 'description' | 'sort_order' | 'is_system' | 'status' | 'created_at' | 'updated_at' | 'is_active'> & {
          id?: string
          description?: string | null
          sort_order?: number | null
          is_system?: boolean | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
          is_active?: boolean | null
        }
        Update: Partial<Database['public']['Tables']['dict_types']['Row']>
        Relationships: []
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
          source: string
        }
        Insert: Omit<Database['public']['Tables']['error_logs']['Row'], 'id' | 'level' | 'module' | 'detail' | 'user_id' | 'created_at' | 'source'> & {
          id?: string
          level?: string | null
          module?: string | null
          detail?: Json | null
          user_id?: string | null
          created_at?: string | null
          source?: string
        }
        Update: Partial<Database['public']['Tables']['error_logs']['Row']>
        Relationships: []
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
          date: string | null
          note: string | null
        }
        Insert: Omit<Database['public']['Tables']['expenses']['Row'], 'id' | 'category' | 'description' | 'created_at' | 'updated_at' | 'user_nickname' | 'date' | 'note'> & {
          id?: string
          category?: string
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
          user_nickname?: string | null
          date?: string | null
          note?: string | null
        }
        Update: Partial<Database['public']['Tables']['expenses']['Row']>
        Relationships: []
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
        Insert: Omit<Database['public']['Tables']['feedback_flow_records']['Row'], 'id' | 'remark' | 'operator_id' | 'operator_name' | 'created_at'> & {
          id?: string
          remark?: string | null
          operator_id?: string | null
          operator_name?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['feedback_flow_records']['Row']>
        Relationships: [
          {
            foreignKeyName: 'feedback_flow_records_feedback_id_fkey'
            columns: ['feedback_id']
            isOneToOne: false
            referencedRelation: 'user_feedback'
            referencedColumns: ['id']
          },
        ]
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
          bucket: string | null
          path: string | null
        }
        Insert: Omit<Database['public']['Tables']['files']['Row'], 'id' | 'file_category' | 'mime_type' | 'size' | 'thumbnail_url' | 'description' | 'uploaded_by' | 'created_at' | 'updated_at' | 'bucket' | 'path'> & {
          id?: string
          file_category?: string | null
          mime_type?: string | null
          size?: number | null
          thumbnail_url?: string | null
          description?: string | null
          uploaded_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          bucket?: string | null
          path?: string | null
        }
        Update: Partial<Database['public']['Tables']['files']['Row']>
        Relationships: [
          {
            foreignKeyName: 'files_uploaded_by_fkey'
            columns: ['uploaded_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }

      // 11. game_achievements
      game_achievements: {
        Row: {
          id: string
          game_id: string | null
          code: string
          name: string
          description: string | null
          icon: string | null
          condition: Json
          reward_points: number
          enabled: boolean
          sort_order: number
          created_at: string
          updated_at: string
          group_key: string | null
        }
        Insert: Omit<Database['public']['Tables']['game_achievements']['Row'], 'id' | 'game_id' | 'description' | 'icon' | 'condition' | 'reward_points' | 'enabled' | 'sort_order' | 'created_at' | 'updated_at' | 'group_key'> & {
          id?: string
          game_id?: string | null
          description?: string | null
          icon?: string | null
          condition?: Json
          reward_points?: number
          enabled?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
          group_key?: string | null
        }
        Update: Partial<Database['public']['Tables']['game_achievements']['Row']>
        Relationships: [
          {
            foreignKeyName: 'game_achievements_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
        ]
      }

      // 12. game_dimensions
      game_dimensions: {
        Row: {
          id: string
          game_id: string
          code: string
          name: string
          unit: string | null
          value_type: string
          aggregate: string
          sort_order: number
          is_primary: boolean
          enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['game_dimensions']['Row'], 'id' | 'unit' | 'value_type' | 'aggregate' | 'sort_order' | 'is_primary' | 'enabled' | 'created_at' | 'updated_at'> & {
          id?: string
          unit?: string | null
          value_type?: string
          aggregate?: string
          sort_order?: number
          is_primary?: boolean
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['game_dimensions']['Row']>
        Relationships: [
          {
            foreignKeyName: 'game_dimensions_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
        ]
      }

      // 13. game_endless_rounds
      game_endless_rounds: {
        Row: {
          id: string
          score_id: string
          user_id: string
          game_id: string
          mode_id: string | null
          round_no: number
          score: number
          moves: number | null
          duration_ms: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['game_endless_rounds']['Row'], 'id' | 'mode_id' | 'score' | 'moves' | 'duration_ms' | 'created_at'> & {
          id?: string
          mode_id?: string | null
          score?: number
          moves?: number | null
          duration_ms?: number | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['game_endless_rounds']['Row']>
        Relationships: [
          {
            foreignKeyName: 'game_endless_rounds_score_id_fkey'
            columns: ['score_id']
            isOneToOne: false
            referencedRelation: 'game_scores'
            referencedColumns: ['id']
          },
        ]
      }

      // 14. game_items
      game_items: {
        Row: {
          id: string
          game_code: string
          mode: string
          item_type: string
          name: string
          description: string | null
          point_cost: number
          per_game_limit: number
          enabled: boolean
          sort_order: number
          created_at: string
          updated_at: string
          free_per_game: number
          icon: string | null
        }
        Insert: Omit<Database['public']['Tables']['game_items']['Row'], 'id' | 'mode' | 'description' | 'point_cost' | 'per_game_limit' | 'enabled' | 'sort_order' | 'created_at' | 'updated_at' | 'free_per_game' | 'icon'> & {
          id?: string
          mode?: string
          description?: string | null
          point_cost?: number
          per_game_limit?: number
          enabled?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
          free_per_game?: number
          icon?: string | null
        }
        Update: Partial<Database['public']['Tables']['game_items']['Row']>
        Relationships: []
      }

      // 15. game_levels
      game_levels: {
        Row: {
          id: string
          game_id: string
          level_no: number
          name: string
          config: Json
          target: Json
          enabled: boolean
          sort_order: number
          created_at: string
          updated_at: string
          count_for_daily_clear: boolean
          reward_points: number
          reward_repeatable: boolean
          difficulty: number | null
          mode_id: string | null
          is_reward_overridden: boolean
        }
        Insert: Omit<Database['public']['Tables']['game_levels']['Row'], 'id' | 'config' | 'target' | 'enabled' | 'sort_order' | 'created_at' | 'updated_at' | 'count_for_daily_clear' | 'reward_points' | 'reward_repeatable' | 'difficulty' | 'mode_id' | 'is_reward_overridden'> & {
          id?: string
          config?: Json
          target?: Json
          enabled?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
          count_for_daily_clear?: boolean
          reward_points?: number
          reward_repeatable?: boolean
          difficulty?: number | null
          mode_id?: string | null
          is_reward_overridden?: boolean
        }
        Update: Partial<Database['public']['Tables']['game_levels']['Row']>
        Relationships: [
          {
            foreignKeyName: 'game_levels_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_levels_mode_id_fkey'
            columns: ['mode_id']
            isOneToOne: false
            referencedRelation: 'game_modes'
            referencedColumns: ['id']
          },
        ]
      }

      // 16. game_modes
      game_modes: {
        Row: {
          id: string
          game_id: string
          code: string
          name: string
          icon: string | null
          description: string | null
          config: Json
          sort_order: number
          enabled: boolean
          created_at: string
          updated_at: string
          play_kind: string
          guide: string | null
          summary: string | null
        }
        Insert: Omit<Database['public']['Tables']['game_modes']['Row'], 'id' | 'icon' | 'description' | 'config' | 'sort_order' | 'enabled' | 'created_at' | 'updated_at' | 'play_kind' | 'guide' | 'summary'> & {
          id?: string
          icon?: string | null
          description?: string | null
          config?: Json
          sort_order?: number
          enabled?: boolean
          created_at?: string
          updated_at?: string
          play_kind?: string
          guide?: string | null
          summary?: string | null
        }
        Update: Partial<Database['public']['Tables']['game_modes']['Row']>
        Relationships: [
          {
            foreignKeyName: 'game_modes_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
        ]
      }

      // 17. game_reward_claims
      game_reward_claims: {
        Row: {
          id: string
          user_id: string
          game_id: string | null
          rule_id: string | null
          claim_key: string
          points: number
          claimed_at: string
          created_at: string
          granted: boolean
        }
        Insert: Omit<Database['public']['Tables']['game_reward_claims']['Row'], 'id' | 'game_id' | 'rule_id' | 'claimed_at' | 'created_at' | 'granted'> & {
          id?: string
          game_id?: string | null
          rule_id?: string | null
          claimed_at?: string
          created_at?: string
          granted?: boolean
        }
        Update: Partial<Database['public']['Tables']['game_reward_claims']['Row']>
        Relationships: [
          {
            foreignKeyName: 'game_reward_claims_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_reward_claims_rule_id_fkey'
            columns: ['rule_id']
            isOneToOne: false
            referencedRelation: 'game_reward_rules'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_reward_claims_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }

      // 18. game_reward_rules
      game_reward_rules: {
        Row: {
          id: string
          game_id: string | null
          rule_type: string
          name: string | null
          condition: Json
          points: number
          enabled: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['game_reward_rules']['Row'], 'id' | 'game_id' | 'name' | 'condition' | 'points' | 'enabled' | 'sort_order' | 'created_at' | 'updated_at'> & {
          id?: string
          game_id?: string | null
          name?: string | null
          condition?: Json
          points?: number
          enabled?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['game_reward_rules']['Row']>
        Relationships: [
          {
            foreignKeyName: 'game_reward_rules_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
        ]
      }

      // 19. game_score_values
      game_score_values: {
        Row: {
          id: string
          score_id: string
          dimension_id: string
          value: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['game_score_values']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['game_score_values']['Row']>
        Relationships: [
          {
            foreignKeyName: 'game_score_values_dimension_id_fkey'
            columns: ['dimension_id']
            isOneToOne: false
            referencedRelation: 'game_dimensions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_score_values_score_id_fkey'
            columns: ['score_id']
            isOneToOne: false
            referencedRelation: 'game_scores'
            referencedColumns: ['id']
          },
        ]
      }

      // 20. game_scores
      game_scores: {
        Row: {
          id: string
          user_id: string
          game_id: string
          level_id: string | null
          status: string
          duration_ms: number | null
          played_at: string
          created_at: string
          mode_id: string | null
        }
        Insert: Omit<Database['public']['Tables']['game_scores']['Row'], 'id' | 'level_id' | 'status' | 'duration_ms' | 'played_at' | 'created_at' | 'mode_id'> & {
          id?: string
          level_id?: string | null
          status?: string
          duration_ms?: number | null
          played_at?: string
          created_at?: string
          mode_id?: string | null
        }
        Update: Partial<Database['public']['Tables']['game_scores']['Row']>
        Relationships: [
          {
            foreignKeyName: 'game_scores_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_scores_level_id_fkey'
            columns: ['level_id']
            isOneToOne: false
            referencedRelation: 'game_levels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_scores_mode_id_fkey'
            columns: ['mode_id']
            isOneToOne: false
            referencedRelation: 'game_modes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_scores_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }

      // 21. games
      games: {
        Row: {
          id: string
          code: string
          name: string
          icon: string | null
          description: string | null
          engine: string
          enabled: boolean
          sort_order: number
          config: Json
          version: number
          created_at: string
          updated_at: string
          level_selectable: boolean
          level_select_mode: string
          intro: string | null
          rules: string | null
          test_only: boolean
        }
        Insert: Omit<Database['public']['Tables']['games']['Row'], 'id' | 'icon' | 'description' | 'engine' | 'enabled' | 'sort_order' | 'config' | 'version' | 'created_at' | 'updated_at' | 'level_selectable' | 'level_select_mode' | 'intro' | 'rules' | 'test_only'> & {
          id?: string
          icon?: string | null
          description?: string | null
          engine?: string
          enabled?: boolean
          sort_order?: number
          config?: Json
          version?: number
          created_at?: string
          updated_at?: string
          level_selectable?: boolean
          level_select_mode?: string
          intro?: string | null
          rules?: string | null
          test_only?: boolean
        }
        Update: Partial<Database['public']['Tables']['games']['Row']>
        Relationships: []
      }

      // 22. habit_checkins
      habit_checkins: {
        Row: {
          id: string
          habit_id: string
          checkin_at: string | null
          created_at: string | null
          note: string | null
          user_id: string | null
        }
        Insert: Omit<Database['public']['Tables']['habit_checkins']['Row'], 'id' | 'checkin_at' | 'created_at' | 'note' | 'user_id'> & {
          id?: string
          checkin_at?: string | null
          created_at?: string | null
          note?: string | null
          user_id?: string | null
        }
        Update: Partial<Database['public']['Tables']['habit_checkins']['Row']>
        Relationships: [
          {
            foreignKeyName: 'fk_habit_checkins_habit'
            columns: ['habit_id']
            isOneToOne: false
            referencedRelation: 'habits'
            referencedColumns: ['id']
          },
        ]
      }

      // 23. habits
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
        Insert: Omit<Database['public']['Tables']['habits']['Row'], 'id' | 'description' | 'target_days' | 'current_streak' | 'longest_streak' | 'is_active' | 'created_at' | 'updated_at' | 'frequency' | 'max_streak' | 'total_checkins' | 'color' | 'user_nickname' | 'reminder_enabled' | 'reminder_hour' | 'reminder_minute'> & {
          id?: string
          description?: string | null
          target_days?: number | null
          current_streak?: number | null
          longest_streak?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          frequency?: string | null
          max_streak?: number | null
          total_checkins?: number | null
          color?: string | null
          user_nickname?: string | null
          reminder_enabled?: boolean | null
          reminder_hour?: number | null
          reminder_minute?: number | null
        }
        Update: Partial<Database['public']['Tables']['habits']['Row']>
        Relationships: []
      }

      // 24. login_logs
      login_logs: {
        Row: {
          id: string
          user_id: string | null
          username: string | null
          role: string | null
          user_type: string
          ip: string | null
          location: string | null
          user_agent: string | null
          login_at: string
          status: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['login_logs']['Row'], 'id' | 'user_id' | 'username' | 'role' | 'ip' | 'location' | 'user_agent' | 'login_at' | 'created_at'> & {
          id?: string
          user_id?: string | null
          username?: string | null
          role?: string | null
          ip?: string | null
          location?: string | null
          user_agent?: string | null
          login_at?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['login_logs']['Row']>
        Relationships: []
      }

      // 25. makeup_checkins
      makeup_checkins: {
        Row: {
          id: string
          user_id: string
          makeup_date: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['makeup_checkins']['Row'], 'created_at'> & {
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['makeup_checkins']['Row']>
        Relationships: []
      }

      // 26. mood_diaries
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
        Insert: Omit<Database['public']['Tables']['mood_diaries']['Row'], 'user_id' | 'mood_label' | 'content' | 'created_at' | 'synced' | 'user_nickname' | 'updated_at'> & {
          user_id?: string | null
          mood_label?: string | null
          content?: string | null
          created_at?: string
          synced?: boolean
          user_nickname?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['mood_diaries']['Row']>
        Relationships: [
          {
            foreignKeyName: 'mood_diaries_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }

      // 27. notes
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
        Insert: Omit<Database['public']['Tables']['notes']['Row'], 'id' | 'content' | 'tags' | 'is_pinned' | 'created_at' | 'updated_at' | 'user_nickname' | 'category'> & {
          id?: string
          content?: string | null
          tags?: string[] | null
          is_pinned?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          user_nickname?: string | null
          category?: string | null
        }
        Update: Partial<Database['public']['Tables']['notes']['Row']>
        Relationships: []
      }

      // 28. notifications
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
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'user_id' | 'type' | 'body' | 'icon' | 'color' | 'payload' | 'is_read' | 'read_at' | 'created_at'> & {
          id?: string
          user_id?: string | null
          type?: string
          body?: string | null
          icon?: string | null
          color?: string | null
          payload?: string | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['notifications']['Row']>
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }

      // 29. novel_annotations
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
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['novel_annotations']['Row'], 'id' | 'note' | 'color' | 'is_deleted' | 'deleted_at' | 'created_at' | 'updated_at' | 'review_status' | 'reviewed_at' | 'reviewed_by'> & {
          id?: string
          note?: string | null
          color?: string | null
          is_deleted?: boolean | null
          deleted_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: Partial<Database['public']['Tables']['novel_annotations']['Row']>
        Relationships: [
          {
            foreignKeyName: 'novel_annotations_chapter_id_fkey'
            columns: ['chapter_id']
            isOneToOne: false
            referencedRelation: 'novel_chapters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'novel_annotations_novel_id_fkey'
            columns: ['novel_id']
            isOneToOne: false
            referencedRelation: 'novels'
            referencedColumns: ['id']
          },
        ]
      }

      // 30. novel_bookmarks
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
        Insert: Omit<Database['public']['Tables']['novel_bookmarks']['Row'], 'id' | 'char_offset' | 'note' | 'bookmark_type' | 'created_at'> & {
          id?: string
          char_offset?: number | null
          note?: string | null
          bookmark_type?: string | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['novel_bookmarks']['Row']>
        Relationships: [
          {
            foreignKeyName: 'novel_bookmarks_chapter_id_fkey'
            columns: ['chapter_id']
            isOneToOne: false
            referencedRelation: 'novel_chapters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'novel_bookmarks_novel_id_fkey'
            columns: ['novel_id']
            isOneToOne: false
            referencedRelation: 'novels'
            referencedColumns: ['id']
          },
        ]
      }

      // 31. novel_chapters
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
        Insert: Omit<Database['public']['Tables']['novel_chapters']['Row'], 'id' | 'word_count' | 'is_free' | 'price' | 'created_at' | 'updated_at'> & {
          id?: string
          word_count?: number | null
          is_free?: boolean
          price?: number
          created_at?: string
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['novel_chapters']['Row']>
        Relationships: [
          {
            foreignKeyName: 'fk_novel_chapters_novel_id'
            columns: ['novel_id']
            isOneToOne: false
            referencedRelation: 'novels'
            referencedColumns: ['id']
          },
        ]
      }

      // 32. novel_comments
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
        Insert: Omit<Database['public']['Tables']['novel_comments']['Row'], 'id' | 'user_nickname' | 'user_avatar' | 'rating' | 'parent_id' | 'reply_to_user_id' | 'reply_to_nickname' | 'like_count' | 'created_at' | 'updated_at'> & {
          id?: string
          user_nickname?: string | null
          user_avatar?: string | null
          rating?: number | null
          parent_id?: string | null
          reply_to_user_id?: string | null
          reply_to_nickname?: string | null
          like_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['novel_comments']['Row']>
        Relationships: [
          {
            foreignKeyName: 'novel_comments_novel_id_fkey'
            columns: ['novel_id']
            isOneToOne: false
            referencedRelation: 'novels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'novel_comments_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'novel_comments'
            referencedColumns: ['id']
          },
        ]
      }

      // 33. novel_ratings
      novel_ratings: {
        Row: {
          id: string
          user_id: string
          novel_id: string
          rating: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['novel_ratings']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['novel_ratings']['Row']>
        Relationships: [
          {
            foreignKeyName: 'novel_ratings_novel_id_fkey'
            columns: ['novel_id']
            isOneToOne: false
            referencedRelation: 'novels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'novel_ratings_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }

      // 34. novels
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
          source_id: string | null
          source_status: string | null
          last_synced_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['novels']['Row'], 'id' | 'user_id' | 'author' | 'cover_url' | 'description' | 'category' | 'source' | 'source_url' | 'tags' | 'chapter_count' | 'word_count' | 'status' | 'is_free' | 'price' | 'rating' | 'read_count' | 'collect_count' | 'created_at' | 'updated_at' | 'rating_count' | 'tts_play_count' | 'source_id' | 'source_status' | 'last_synced_at'> & {
          id?: string
          user_id?: string | null
          author?: string | null
          cover_url?: string | null
          description?: string | null
          category?: string | null
          source?: string | null
          source_url?: string | null
          tags?: string[] | null
          chapter_count?: number | null
          word_count?: number | null
          status?: string | null
          is_free?: boolean | null
          price?: number | null
          rating?: number | null
          read_count?: number | null
          collect_count?: number | null
          created_at?: string | null
          updated_at?: string | null
          rating_count?: number | null
          tts_play_count?: number | null
          source_id?: string | null
          source_status?: string | null
          last_synced_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['novels']['Row']>
        Relationships: []
      }

      // 35. offline_reading_meta
      offline_reading_meta: {
        Row: {
          id: string
          user_id: string
          novel_id: string
          total_chapters: number | null
          downloaded_chapters: number | null
          last_sync_at: string | null
          device_id: string | null
          created_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['offline_reading_meta']['Row'], 'id' | 'total_chapters' | 'downloaded_chapters' | 'last_sync_at' | 'device_id' | 'created_at'> & {
          id?: string
          total_chapters?: number | null
          downloaded_chapters?: number | null
          last_sync_at?: string | null
          device_id?: string | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['offline_reading_meta']['Row']>
        Relationships: [
          {
            foreignKeyName: 'offline_reading_meta_novel_id_fkey'
            columns: ['novel_id']
            isOneToOne: false
            referencedRelation: 'novels'
            referencedColumns: ['id']
          },
        ]
      }

      // 36. operation_logs
      operation_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          module: string | null
          target_id: string[] | null
          details: Json | null
          ip: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['operation_logs']['Row'], 'id' | 'user_id' | 'module' | 'target_id' | 'details' | 'ip' | 'user_agent' | 'created_at'> & {
          id?: string
          user_id?: string | null
          module?: string | null
          target_id?: string[] | null
          details?: Json | null
          ip?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['operation_logs']['Row']>
        Relationships: [
          {
            foreignKeyName: 'operation_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }

      // 37. permissions
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
        Insert: Omit<Database['public']['Tables']['permissions']['Row'], 'id' | 'type' | 'parent_id' | 'sort_order' | 'module' | 'description' | 'created_at'> & {
          id?: number
          type?: string
          parent_id?: number | null
          sort_order?: number
          module?: string | null
          description?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['permissions']['Row']>
        Relationships: [
          {
            foreignKeyName: 'permissions_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'permissions'
            referencedColumns: ['id']
          },
        ]
      }

      // 38. point_records
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
        Insert: Omit<Database['public']['Tables']['point_records']['Row'], 'id' | 'remark' | 'operator_id' | 'operator_name' | 'created_at' | 'expires_at' | 'status' | 'created_date'> & {
          id?: string
          remark?: string | null
          operator_id?: string | null
          operator_name?: string | null
          created_at?: string
          expires_at?: string | null
          status?: string | null
          created_date?: string | null
        }
        Update: Partial<Database['public']['Tables']['point_records']['Row']>
        Relationships: [
          {
            foreignKeyName: 'fk_point_records_user_id'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'point_records_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }

      // 39. ranking_interventions
      ranking_interventions: {
        Row: {
          id: string
          pin_ids: Json
          block_ids: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['ranking_interventions']['Row'], 'id' | 'pin_ids' | 'block_ids' | 'updated_at' | 'updated_by'> & {
          id?: string
          pin_ids?: Json
          block_ids?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: Partial<Database['public']['Tables']['ranking_interventions']['Row']>
        Relationships: []
      }

      // 40. ranking_rules
      ranking_rules: {
        Row: {
          id: string
          rating_min_count: number
          new_book_days_threshold: number
          read_weight: number
          collect_weight: number
          rating_weight: number
          updated_at: string
          updated_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['ranking_rules']['Row'], 'id' | 'rating_min_count' | 'new_book_days_threshold' | 'read_weight' | 'collect_weight' | 'rating_weight' | 'updated_at' | 'updated_by'> & {
          id?: string
          rating_min_count?: number
          new_book_days_threshold?: number
          read_weight?: number
          collect_weight?: number
          rating_weight?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: Partial<Database['public']['Tables']['ranking_rules']['Row']>
        Relationships: []
      }

      // 41. reading_history
      reading_history: {
        Row: {
          id: string
          user_id: string
          novel_id: string
          chapter_id: string | null
          chapter_order: number | null
          read_duration_seconds: number | null
          progress: number | null
          created_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['reading_history']['Row'], 'id' | 'chapter_id' | 'chapter_order' | 'read_duration_seconds' | 'progress' | 'created_at'> & {
          id?: string
          chapter_id?: string | null
          chapter_order?: number | null
          read_duration_seconds?: number | null
          progress?: number | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['reading_history']['Row']>
        Relationships: [
          {
            foreignKeyName: 'reading_history_chapter_id_fkey'
            columns: ['chapter_id']
            isOneToOne: false
            referencedRelation: 'novel_chapters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reading_history_novel_id_fkey'
            columns: ['novel_id']
            isOneToOne: false
            referencedRelation: 'novels'
            referencedColumns: ['id']
          },
        ]
      }

      // 42. reading_progress_sync
      reading_progress_sync: {
        Row: {
          id: string
          user_id: string
          novel_id: string
          device_id: string
          last_chapter: number | null
          content_offset: number | null
          page_index: number | null
          progress: number | null
          font_style_hash: string | null
          layout_cache: Json | null
          sync_version: number | null
          created_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['reading_progress_sync']['Row'], 'id' | 'last_chapter' | 'content_offset' | 'page_index' | 'progress' | 'font_style_hash' | 'layout_cache' | 'sync_version' | 'created_at'> & {
          id?: string
          last_chapter?: number | null
          content_offset?: number | null
          page_index?: number | null
          progress?: number | null
          font_style_hash?: string | null
          layout_cache?: Json | null
          sync_version?: number | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['reading_progress_sync']['Row']>
        Relationships: [
          {
            foreignKeyName: 'reading_progress_sync_novel_id_fkey'
            columns: ['novel_id']
            isOneToOne: false
            referencedRelation: 'novels'
            referencedColumns: ['id']
          },
        ]
      }

      // 43. recommend_config
      recommend_config: {
        Row: {
          id: string
          cold_start: string
          cold_min_reads: number
          rec_limit: number
          exclude_ongoing: boolean
          exclude_draft: boolean
          exclude_ids: string
          weight_category: number
          weight_read: number
          weight_collect: number
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['recommend_config']['Row'], 'id' | 'cold_start' | 'cold_min_reads' | 'rec_limit' | 'exclude_ongoing' | 'exclude_draft' | 'exclude_ids' | 'weight_category' | 'weight_read' | 'weight_collect' | 'updated_at'> & {
          id?: string
          cold_start?: string
          cold_min_reads?: number
          rec_limit?: number
          exclude_ongoing?: boolean
          exclude_draft?: boolean
          exclude_ids?: string
          weight_category?: number
          weight_read?: number
          weight_collect?: number
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['recommend_config']['Row']>
        Relationships: []
      }

      // 44. reminder_schedules
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
        Insert: Omit<Database['public']['Tables']['reminder_schedules']['Row'], 'id' | 'schedule_type' | 'week_days' | 'month_days' | 'months' | 'years' | 'dates' | 'time' | 'is_enabled' | 'created_at' | 'updated_at'> & {
          id?: string
          schedule_type?: string
          week_days?: Json | null
          month_days?: Json | null
          months?: Json | null
          years?: Json | null
          dates?: Json | null
          time?: string
          is_enabled?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['reminder_schedules']['Row']>
        Relationships: []
      }

      // 45. reminders
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
          remind_enabled: boolean
          remind_offsets: Json
        }
        Insert: Omit<Database['public']['Tables']['reminders']['Row'], 'id' | 'description' | 'is_completed' | 'is_repeated' | 'repeat_type' | 'created_at' | 'updated_at' | 'remind_enabled' | 'remind_offsets'> & {
          id?: string
          description?: string | null
          is_completed?: boolean | null
          is_repeated?: boolean | null
          repeat_type?: string | null
          created_at?: string | null
          updated_at?: string | null
          remind_enabled?: boolean
          remind_offsets?: Json
        }
        Update: Partial<Database['public']['Tables']['reminders']['Row']>
        Relationships: []
      }

      // 46. role_permissions
      role_permissions: {
        Row: {
          role_id: number
          permission_id: number
        }
        Insert: Database['public']['Tables']['role_permissions']['Row']
        Update: Partial<Database['public']['Tables']['role_permissions']['Row']>
        Relationships: [
          {
            foreignKeyName: 'role_permissions_permission_id_fkey'
            columns: ['permission_id']
            isOneToOne: false
            referencedRelation: 'permissions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'role_permissions_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['id']
          },
        ]
      }

      // 47. roles
      roles: {
        Row: {
          id: number
          name: string
          code: string
          description: string | null
          is_system: boolean
          status: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['roles']['Row'], 'id' | 'description' | 'is_system' | 'status' | 'created_at' | 'updated_at'> & {
          id?: number
          description?: string | null
          is_system?: boolean
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['roles']['Row']>
        Relationships: []
      }

      // 48. sensitive_word_configs
      sensitive_word_configs: {
        Row: {
          id: string
          config_key: string
          config_value: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['sensitive_word_configs']['Row'], 'id' | 'config_value' | 'description' | 'created_at' | 'updated_at'> & {
          id?: string
          config_value?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['sensitive_word_configs']['Row']>
        Relationships: []
      }

      // 49. sensitive_word_logs
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
        Insert: Omit<Database['public']['Tables']['sensitive_word_logs']['Row'], 'id' | 'source_id' | 'user_id' | 'content_snippet' | 'ip_address' | 'created_at'> & {
          id?: string
          source_id?: string | null
          user_id?: string | null
          content_snippet?: string | null
          ip_address?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['sensitive_word_logs']['Row']>
        Relationships: [
          {
            foreignKeyName: 'sensitive_word_logs_word_id_fkey'
            columns: ['word_id']
            isOneToOne: false
            referencedRelation: 'sensitive_words'
            referencedColumns: ['id']
          },
        ]
      }

      // 50. sensitive_words
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
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['sensitive_words']['Row'], 'id' | 'category' | 'level' | 'replace_word' | 'description' | 'match_mode' | 'is_active' | 'hit_count' | 'created_by' | 'created_at' | 'updated_at'> & {
          id?: string
          category?: string
          level?: string
          replace_word?: string | null
          description?: string | null
          match_mode?: string
          is_active?: boolean
          hit_count?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['sensitive_words']['Row']>
        Relationships: []
      }

      // 51. system_configs
      system_configs: {
        Row: {
          id: number
          key: string
          value: Json
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['system_configs']['Row'], 'id' | 'value' | 'description' | 'created_at' | 'updated_at'> & {
          id?: number
          value?: Json
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['system_configs']['Row']>
        Relationships: []
      }

      // 52. tts_playback_logs
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
        Insert: Omit<Database['public']['Tables']['tts_playback_logs']['Row'], 'id' | 'start_sentence_index' | 'end_sentence_index' | 'duration_seconds' | 'speech_rate' | 'playback_mode' | 'created_at'> & {
          id?: string
          start_sentence_index?: number | null
          end_sentence_index?: number | null
          duration_seconds?: number | null
          speech_rate?: number | null
          playback_mode?: string | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['tts_playback_logs']['Row']>
        Relationships: [
          {
            foreignKeyName: 'tts_playback_logs_chapter_id_fkey'
            columns: ['chapter_id']
            isOneToOne: false
            referencedRelation: 'novel_chapters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tts_playback_logs_novel_id_fkey'
            columns: ['novel_id']
            isOneToOne: false
            referencedRelation: 'novels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tts_playback_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }

      // 53. user_anniversaries
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
          remind_time: string
          remind_offsets: Json
        }
        Insert: Omit<Database['public']['Tables']['user_anniversaries']['Row'], 'id' | 'user_nickname' | 'type' | 'description' | 'repeat_yearly' | 'remind_enabled' | 'remind_days_before' | 'created_at' | 'updated_at' | 'is_lunar' | 'remind_time' | 'remind_offsets'> & {
          id?: string
          user_nickname?: string | null
          type?: string
          description?: string | null
          repeat_yearly?: boolean
          remind_enabled?: boolean
          remind_days_before?: number | null
          created_at?: string
          updated_at?: string | null
          is_lunar?: boolean | null
          remind_time?: string
          remind_offsets?: Json
        }
        Update: Partial<Database['public']['Tables']['user_anniversaries']['Row']>
        Relationships: []
      }

      // 54. user_avatars
      user_avatars: {
        Row: {
          id: string
          user_id: string
          type: string
          avatar_url: string
          style_key: string | null
          background_color: string | null
          seed: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_avatars']['Row'], 'id' | 'type' | 'style_key' | 'background_color' | 'seed' | 'created_at' | 'updated_at'> & {
          id?: string
          type?: string
          style_key?: string | null
          background_color?: string | null
          seed?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_avatars']['Row']>
        Relationships: [
          {
            foreignKeyName: 'user_avatars_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }

      // 55. user_favorites
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
        Insert: Omit<Database['public']['Tables']['user_favorites']['Row'], 'id' | 'url' | 'category' | 'tags' | 'is_pinned' | 'created_at' | 'updated_at' | 'user_nickname' | 'description'> & {
          id?: string
          url?: string | null
          category?: string | null
          tags?: string[] | null
          is_pinned?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          user_nickname?: string | null
          description?: string | null
        }
        Update: Partial<Database['public']['Tables']['user_favorites']['Row']>
        Relationships: []
      }

      // 56. user_feedback
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
        Insert: Omit<Database['public']['Tables']['user_feedback']['Row'], 'id' | 'description' | 'category' | 'status' | 'admin_reply' | 'created_at' | 'updated_at' | 'user_nickname' | 'is_deleted' | 'deleted_at'> & {
          id?: string
          description?: string | null
          category?: string
          status?: string
          admin_reply?: string | null
          created_at?: string
          updated_at?: string | null
          user_nickname?: string | null
          is_deleted?: boolean | null
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['user_feedback']['Row']>
        Relationships: []
      }

      // 57. user_game_achievements
      user_game_achievements: {
        Row: {
          id: string
          user_id: string
          achievement_id: string
          unlocked_at: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_game_achievements']['Row'], 'id' | 'unlocked_at' | 'created_at'> & {
          id?: string
          unlocked_at?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_game_achievements']['Row']>
        Relationships: [
          {
            foreignKeyName: 'user_game_achievements_achievement_id_fkey'
            columns: ['achievement_id']
            isOneToOne: false
            referencedRelation: 'game_achievements'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_game_achievements_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }

      // 58. user_game_items
      user_game_items: {
        Row: {
          id: string
          user_id: string
          item_id: string
          owned: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_game_items']['Row'], 'id' | 'owned' | 'created_at' | 'updated_at'> & {
          id?: string
          owned?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_game_items']['Row']>
        Relationships: [
          {
            foreignKeyName: 'user_game_items_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'game_items'
            referencedColumns: ['id']
          },
        ]
      }

      // 59. user_items
      user_items: {
        Row: {
          id: string
          user_id: string
          item_type: string
          quantity: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_items']['Row'], 'quantity' | 'created_at' | 'updated_at'> & {
          quantity?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_items']['Row']>
        Relationships: []
      }

      // 60. user_novels
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
          updated_at: string
          last_char_offset: number | null
          reading_status: string | null
          device_id: string | null
          sync_version: number | null
          content_offset: number | null
          page_index: number | null
          font_style_hash: string | null
          layout_cache: Json | null
          updated_device: string | null
          last_page: number
        }
        Insert: Omit<Database['public']['Tables']['user_novels']['Row'], 'id' | 'progress' | 'last_chapter' | 'last_read_at' | 'is_collected' | 'created_at' | 'updated_at' | 'last_char_offset' | 'reading_status' | 'device_id' | 'sync_version' | 'content_offset' | 'page_index' | 'font_style_hash' | 'layout_cache' | 'updated_device' | 'last_page'> & {
          id?: string
          progress?: number
          last_chapter?: number
          last_read_at?: string | null
          is_collected?: boolean
          created_at?: string
          updated_at?: string
          last_char_offset?: number | null
          reading_status?: string | null
          device_id?: string | null
          sync_version?: number | null
          content_offset?: number | null
          page_index?: number | null
          font_style_hash?: string | null
          layout_cache?: Json | null
          updated_device?: string | null
          last_page?: number
        }
        Update: Partial<Database['public']['Tables']['user_novels']['Row']>
        Relationships: [
          {
            foreignKeyName: 'fk_user_novels_novel_id'
            columns: ['novel_id']
            isOneToOne: false
            referencedRelation: 'novels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_novels_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }

      // 61. user_recommendation_feedback
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
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['user_recommendation_feedback']['Row']>
        Relationships: [
          {
            foreignKeyName: 'user_recommendation_feedback_novel_id_fkey'
            columns: ['novel_id']
            isOneToOne: false
            referencedRelation: 'novels'
            referencedColumns: ['id']
          },
        ]
      }

      // 62. users
      users: {
        Row: {
          id: string
          email: string
          phone: string | null
          password_hash: string | null
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
          height: number | null
          auth_id: string | null
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'phone' | 'password_hash' | 'nickname' | 'avatar_url' | 'role' | 'member_level' | 'points' | 'status' | 'register_ip' | 'last_login_ip' | 'last_login_at' | 'login_count' | 'created_at' | 'updated_at' | 'username' | 'sms_code' | 'sms_code_expires_at' | 'bio' | 'location' | 'birthday' | 'gender' | 'occupation' | 'company' | 'website' | 'consecutive_checkin_days' | 'effective_points' | 'available_points' | 'expiring_points' | 'last_checkin_date' | 'tts_speech_rate' | 'tts_timer_minutes' | 'tts_playback_mode' | 'tts_enabled' | 'is_deleted' | 'deleted_at' | 'height' | 'auth_id'> & {
          phone?: string | null
          password_hash?: string | null
          nickname?: string | null
          avatar_url?: string | null
          role?: string
          member_level?: string
          points?: number
          status?: string
          register_ip?: string | null
          last_login_ip?: string | null
          last_login_at?: string | null
          login_count?: number
          created_at?: string
          updated_at?: string
          username?: string | null
          sms_code?: string | null
          sms_code_expires_at?: string | null
          bio?: string | null
          location?: string | null
          birthday?: string | null
          gender?: string | null
          occupation?: string | null
          company?: string | null
          website?: string | null
          consecutive_checkin_days?: number | null
          effective_points?: number | null
          available_points?: number | null
          expiring_points?: number | null
          last_checkin_date?: string | null
          tts_speech_rate?: number | null
          tts_timer_minutes?: number | null
          tts_playback_mode?: string | null
          tts_enabled?: boolean | null
          is_deleted?: boolean | null
          deleted_at?: string | null
          height?: number | null
          auth_id?: string | null
        }
        Update: Partial<Database['public']['Tables']['users']['Row']>
        Relationships: []
      }

      // 63. weight_records
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
        Insert: Omit<Database['public']['Tables']['weight_records']['Row'], 'id' | 'body_fat' | 'created_at' | 'updated_at' | 'user_nickname' | 'bmi' | 'note' | 'date'> & {
          id?: string
          body_fat?: number | null
          created_at?: string | null
          updated_at?: string | null
          user_nickname?: string | null
          bmi?: number | null
          note?: string | null
          date?: string | null
        }
        Update: Partial<Database['public']['Tables']['weight_records']['Row']>
        Relationships: []
      }

    }
    Views: {
      mv_novel_chapters_index: {
        Row: {
          chapter_id: string | null
          novel_id: string | null
          chapter_num: number | null
          title: string | null
          word_count: number | null
          is_free: boolean | null
          price: number | null
        }
      }
      mv_novel_rankings: {
        Row: {
          novel_id: string | null
          title: string | null
          author: string | null
          cover_url: string | null
          category: string | null
          status: string | null
          total_reads: number | null
          total_collects: number | null
          avg_rating: number | null
          rating_count: number | null
          tts_play_count: number | null
          daily_reads: number | null
          daily_collects: number | null
          weekly_reads: number | null
          weekly_collects: number | null
          monthly_reads: number | null
          monthly_collects: number | null
          created_at: string | null
          computed_at: string | null
        }
      }
    }
    Functions: {
      admin_revoke_user: {
        Args: { p_target_user_id: string }
        Returns: Json
      }
      app_user_id: {
        Args: Record<string, never>
        Returns: string
      }
      check_update: {
        Args: { current_version: string; current_build: number }
        Returns: { has_update: boolean; is_force: boolean; latest_version: string; download_url: string; release_notes: string }[]
      }
      create_auth_user: {
        Args: { p_email: string; p_password: string; p_phone: string; p_user_metadata: Json }
        Returns: Json
      }
      current_app_user_id: {
        Args: Record<string, never>
        Returns: string
      }
      fn_get_monthly_expense_total: {
        Args: { p_user_id: string; p_year: number; p_month: number; p_category: string }
        Returns: { total: number }[]
      }
      fn_get_recommendations: {
        Args: { p_user_id: string; p_limit: number }
        Returns: { novel_id: string; title: string; author: string; cover_url: string; recommendation_score: number; reason: string }[]
      }
      fn_increment_novel_read_count: {
        Args: { p_novel_id: string }
        Returns: void
      }
      fn_refresh_chapters_index: {
        Args: Record<string, never>
        Returns: void
      }
      fn_refresh_expiring_points: {
        Args: Record<string, never>
        Returns: void
      }
      fn_refresh_rankings: {
        Args: Record<string, never>
        Returns: void
      }
      get_checkin_summary: {
        Args: Record<string, never>
        Returns: { user_id: string; nickname: string; username: string; total_checkin_days: number; current_streak: number; last_checkin_date: string }[]
      }
      get_current_user_id: {
        Args: Record<string, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<string, never>
        Returns: string
      }
      get_db_health: {
        Args: Record<string, never>
        Returns: { db_size_bytes: number; active_conns: number; max_conns: number; conn_util_pct: number; err_last_24h: number; err_prev_24h: number; total_tables: number; total_rows_est: number }[]
      }
      get_dict_items: {
        Args: { p_type_code: string }
        Returns: { item_code: string; item_name: string; item_value: string; sort_order: number; extra_data: Json }[]
      }
      get_game_best_scores: {
        Args: { p_game_id: string }
        Returns: { game_id: string; game_code: string; game_name: string; dimension_id: string; dimension_code: string; dimension_name: string; unit: string; aggregate: string; is_primary: boolean; sort_order: number; best_value: number; achieved_at: string }[]
      }
      get_game_flow_totals: {
        Args: { p_from: string; p_to: string }
        Returns: { flow_type: string; total: number }[]
      }
      get_latest_version: {
        Args: { p_platform: string }
        Returns: { id: number; version: string; build_number: number; download_url: string; release_notes: string; is_force_update: boolean; file_size: number; created_at: string }[]
      }
      get_log_trends: {
        Args: { p_days: number }
        Returns: { day: string; op_count: number; err_count: number }[]
      }
      get_my_role: {
        Args: Record<string, never>
        Returns: string
      }
      get_request_user_id: {
        Args: Record<string, never>
        Returns: string
      }
      get_rls_coverage: {
        Args: Record<string, never>
        Returns: { total_tables: number; rls_enabled: number; unprotected: string[] }[]
      }
      get_seq_scan_hotspots: {
        Args: { p_min_rows: number }
        Returns: { table_name: string; row_estimate: number; seq_scan: number; idx_scan: number }[]
      }
      get_table_stats: {
        Args: Record<string, never>
        Returns: { table_name: string; row_estimate: number; table_size_bytes: number; index_size_bytes: number; total_size_bytes: number; last_vacuum: string; last_autovacuum: string }[]
      }
      get_user_business_id: {
        Args: Record<string, never>
        Returns: string
      }
      get_user_checkin_dates: {
        Args: { p_user_id: string; p_year: number; p_month: number }
        Returns: { checkin_date: string; is_makeup: boolean }[]
      }
      get_user_dimension_stats: {
        Args: { p_table_name: string; p_user_ids: string[]; p_limit?: number; p_offset?: number }
        Returns: { user_id: string; count: number; latest_record_at: string }[]
      }
      get_user_earliest_checkin_month: {
        Args: { p_user_id: string }
        Returns: string
      }
      grant_game_reward: {
        Args: { p_user_id: string; p_claim_key: string; p_points: number; p_game_id: string; p_rule_id: string; p_type: string; p_remark: string }
        Returns: Json
      }
      immutable_date_trunc_minute: {
        Args: { ts: string }
        Returns: string
      }
      increment_sensitive_word_hit_count: {
        Args: { word_id: string }
        Returns: void
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_current_user_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      recalc_user_points: {
        Args: { p_user_id: string }
        Returns: Json
      }
      record_login: {
        Args: { p_source: string; p_status: string; p_user_agent: string; p_location: string; p_username: string }
        Returns: void
      }
      report_client_error: {
        Args: { p_level: string; p_module: string; p_message: string; p_detail: Json; p_source: string; p_app_version: string; p_user_id?: string }
        Returns: void
      }
      resolve_account_to_email: {
        Args: { account: string }
        Returns: string
      }
      update_expired_points: {
        Args: Record<string, never>
        Returns: void
      }
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



// 游戏中心模块类型别名（9 表 + 最佳成绩 RPC 行）

export type DbGame = Database['public']['Tables']['games']['Row']

export type DbGameDimension = Database['public']['Tables']['game_dimensions']['Row']

export type DbGameLevel = Database['public']['Tables']['game_levels']['Row']

export type DbGameAchievement = Database['public']['Tables']['game_achievements']['Row']

export type DbGameRewardRule = Database['public']['Tables']['game_reward_rules']['Row']

export type DbGameScore = Database['public']['Tables']['game_scores']['Row']

export type DbGameScoreValue = Database['public']['Tables']['game_score_values']['Row']

export type DbUserGameAchievement = Database['public']['Tables']['user_game_achievements']['Row']

export type DbGameRewardClaim = Database['public']['Tables']['game_reward_claims']['Row']

export type DbGameBestScore = Database['public']['Functions']['get_game_best_scores']['Returns'][number]

export type DbGameEndlessRound = Database['public']['Tables']['game_endless_rounds']['Row']

// 51c/58b 补充别名（2026-09-04 service 层统一：GameModes / GameItems 页）

export type DbGameMode = Database['public']['Tables']['game_modes']['Row']

export type DbGameItem = Database['public']['Tables']['game_items']['Row']
