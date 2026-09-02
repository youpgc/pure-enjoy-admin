import React, { useState, useEffect } from 'react'
import { Button } from 'antd'
import { getMoodTypeOptions } from '../../utils/dictService'
import { MOOD_EMOJI_MAP, FALLBACK_MOOD_OPTIONS } from './constants'
import type { MoodOption } from './types'
import styles from './EmojiSelect.module.css'
import common from '../../styles/common.module.css'

interface EmojiSelectProps {
  value?: string
  onChange?: (value: string) => void
}

const EmojiSelect: React.FC<EmojiSelectProps> = ({ value, onChange }) => {
  const [moodOptions, setMoodOptions] = useState<MoodOption[]>(FALLBACK_MOOD_OPTIONS)

  useEffect(() => {
    getMoodTypeOptions().then((options) => {
      if (options.length > 0) {
        setMoodOptions(options)
      }
    })
  }, [])

  return (
    <div className={`${common.flex} ${common.flexWrap} ${common.gap8}`}>
      {moodOptions.map((option) => {
        const emoji = MOOD_EMOJI_MAP[option.value] || '😐'
        return (
          <Button
            key={option.value}
            type={value === option.value ? 'primary' : 'default'}
            onClick={() => onChange?.(option.value as string)}
            className={styles.emojiBtn}
          >
            {emoji} {option.label}
          </Button>
        )
      })}
    </div>
  )
}

export default EmojiSelect
