import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { ensureProfile, updateNickname as updateNicknameRequest } from '../lib/profile.js'
import { fetchUnreadNotificationCount } from '../lib/notifications.js'

const AuthContext = createContext(null)

const UNREAD_POLL_INTERVAL = 45 * 1000

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [authError, setAuthError] = useState('')
  const [coinAward, setCoinAward] = useState(null) // { awards: [{award_type, amount}], total } | null
  const [unreadCount, setUnreadCount] = useState(0)

  // 세션 구독
  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // 세션이 바뀌면: 1) 최근 탈퇴한 계정인지 확인해서 막고, 2) 아니면 프로필을 가져오거나 새로 만듦
  useEffect(() => {
    if (!supabase) return
    const user = session?.user
    if (!user) {
      setProfile(null)
      return
    }

    let cancelled = false

    async function run() {
      const identity = user.identities?.[0]
      if (identity) {
        const { data: blocked, error } = await supabase.rpc('is_recently_deleted', {
          p_provider: identity.provider,
          p_provider_user_id: identity.id,
        })

        if (!error && blocked) {
          if (cancelled) return
          setAuthError('탈퇴 후 24시간이 지나야 같은 계정으로 다시 가입할 수 있어요. 잠시 후 다시 시도해주세요.')
          setModalOpen(true)
          await supabase.auth.signOut()
          return
        }
      }

      const p = await ensureProfile(user)
      if (!cancelled) setProfile(p)
    }

    run()

    return () => {
      cancelled = true
    }
  }, [session])

  const refreshUnreadCount = useCallback(async () => {
    const user = session?.user
    if (!user) {
      setUnreadCount(0)
      return
    }
    const count = await fetchUnreadNotificationCount(user.id)
    setUnreadCount(count)
  }, [session])

  // 로그인 상태가 바뀌면 즉시 한 번 갱신하고, 로그인 중엔 주기적으로 폴링해서
  // 자정 배치 지급처럼 "내가 안 봐도 서버가 만드는" 알림도 dot에 반영되게 함.
  useEffect(() => {
    if (!supabase) return
    const user = session?.user
    if (!user) {
      setUnreadCount(0)
      return
    }

    let cancelled = false
    const tick = async () => {
      const count = await fetchUnreadNotificationCount(user.id)
      if (!cancelled) setUnreadCount(count)
    }

    tick()
    const interval = setInterval(tick, UNREAD_POLL_INTERVAL)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [session])

  const signInWithGoogle = useCallback(() => {
    if (!supabase) return
    setAuthError('')
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }, [])

  const signInWithKakao = useCallback(() => {
    if (!supabase) return
    setAuthError('')
    return supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: window.location.origin,
        // 이메일/프로필사진은 안 쓰므로 요청하지 않음 (닉네임은 우리가 자체 랜덤 생성함).
        scopes: 'profile_nickname',
      },
    })
  }, [])

  const signOut = useCallback(() => {
    if (!supabase) return
    return supabase.auth.signOut()
  }, [])

  const changeNickname = useCallback(
    async (nextNickname) => {
      if (!session?.user) {
        return { data: null, error: new Error('로그인이 필요합니다.') }
      }
      const { data, error } = await updateNicknameRequest(session.user.id, nextNickname)
      if (!error) setProfile(data)
      return { data, error }
    },
    [session],
  )

  /**
   * 회원 탈퇴. anon 키로는 auth.users를 직접 지울 수 없어서
   * /api/delete-account.js(서버리스, service_role 키)에 위임합니다.
   * 성공하면 profiles/scores/likes는 DB의 on delete cascade로 함께 삭제되고,
   * 같은 provider 계정으로 24시간 재가입이 막히는 기록도 서버에서 남깁니다.
   */
  const deleteAccount = useCallback(async () => {
    if (!supabase || !session) {
      return { error: new Error('로그인이 필요합니다.') }
    }

    try {
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        return { error: new Error(body.error || '탈퇴 처리에 실패했어요. 잠시 후 다시 시도해주세요.') }
      }
    } catch {
      return { error: new Error('네트워크 오류로 탈퇴에 실패했어요.') }
    }

    await supabase.auth.signOut()
    return { error: null }
  }, [session])

  /**
   * 점수 등록 직후 claimCoinsForScore() 결과를 넘겨받아, 실제로 지급된 항목이
   * 있으면 잔액을 즉시 반영하고(서버 update와 동일한 금액이라 안전) 획득 모달을 띄웁니다.
   * gameId는 모달에서 "광고 보고 +2코인" 버튼이 어느 게임에 대해 지급 요청할지 알기 위해 필요합니다.
   * extra: { isNewRecord, rank, total } - 신기록 축하 연출 + 순위 미리보기용.
   */
  const notifyCoinsAwarded = useCallback((awards, gameId, extra = {}) => {
    const list = awards ?? []
    const hasRankInfo = extra.rank != null && extra.total != null
    if (list.length === 0 && !extra.isNewRecord && !hasRankInfo) return

    const total = list.reduce((sum, a) => sum + a.amount, 0)
    if (total > 0) {
      setProfile((p) => (p ? { ...p, coins: p.coins + total } : p))
    }
    setCoinAward({
      awards: list,
      total,
      gameId,
      isNewRecord: Boolean(extra.isNewRecord),
      rank: extra.rank ?? null,
      rankTotal: extra.total ?? null,
    })
  }, [])

  /**
   * 광고 시청 보너스처럼, 이미 열려있는 코인 모달에 추가로 항목을 얹을 때 사용합니다.
   */
  const addBonusCoinAward = useCallback((award) => {
    if (!award) return
    setProfile((p) => (p ? { ...p, coins: p.coins + award.amount } : p))
    setCoinAward((prev) =>
      prev
        ? { ...prev, awards: [...prev.awards, award], total: prev.total + award.amount }
        : { awards: [award], total: award.amount, gameId: null },
    )
  }, [])

  const value = {
    isConfigured: Boolean(supabase),
    user: session?.user ?? null,
    profile,
    nickname: profile?.nickname ?? null,
    coins: profile?.coins ?? 0,
    coinAward,
    notifyCoinsAwarded,
    addBonusCoinAward,
    closeCoinAward: () => setCoinAward(null),
    unreadCount,
    refreshUnreadCount,
    modalOpen,
    openAuthModal: () => setModalOpen(true),
    closeAuthModal: () => setModalOpen(false),
    authError,
    clearAuthError: () => setAuthError(''),
    signInWithGoogle,
    signInWithKakao,
    signOut,
    changeNickname,
    deleteAccount,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth()는 <AuthProvider> 내부에서만 사용할 수 있어요.')
  }
  return ctx
}
