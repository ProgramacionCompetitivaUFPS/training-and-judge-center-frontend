import { useMemo, useState, useCallback } from 'react'
import { useMySubmissions, useSubmissionDetail } from '@/hooks/api/useSubmissions'
import type { SubmissionStatus, SubmissionLanguage, SubmissionDetail } from '@/types/submission'

interface UseSubmissionRecoveryOptions {
  problemSlug: string
  language: string
  contestId?: string
}

export interface RecoverableSubmission {
  id: string
  status: SubmissionStatus
  language: SubmissionLanguage
  submittedAt: string
  isBlockly: boolean
}

export interface UseSubmissionRecoveryReturn {
  recoverableSubmission: RecoverableSubmission | null
  isLoading: boolean
  loadSubmission: (submissionId: string) => void
  submissionDetail: SubmissionDetail | undefined
  isLoadingDetail: boolean
}

export function useSubmissionRecovery({
  problemSlug,
  language,
  contestId,
}: UseSubmissionRecoveryOptions): UseSubmissionRecoveryReturn {
  const { data, isLoading } = useMySubmissions({ problemSlug, limit: 5 })

  const [selectedSubmissionId, setSelectedSubmissionId] = useState('')

  const recoverableSubmission = useMemo<RecoverableSubmission | null>(() => {
    if (!data?.submissions) return null

    const matching = data.submissions
      .filter((s) => s.language === language)
      .filter((s) => {
        if (contestId) {
          return s.contest?.id === contestId
        }
        return s.contest === null
      })
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())

    const first = matching[0]
    if (!first) return null

    return {
      id: first.id,
      status: first.status,
      language: first.language,
      submittedAt: first.submittedAt,
      isBlockly: first.language === 'blockly',
    }
  }, [data, language, contestId])

  const { data: submissionDetail, isLoading: isLoadingDetail } = useSubmissionDetail(selectedSubmissionId)

  const loadSubmission = useCallback((submissionId: string) => {
    setSelectedSubmissionId(submissionId)
  }, [])

  return {
    recoverableSubmission,
    isLoading,
    loadSubmission,
    submissionDetail,
    isLoadingDetail,
  }
}
