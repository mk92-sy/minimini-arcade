import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { ensureProfile, updateNickname as updateNicknameRequest } from '../lib/profile.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [authError, setAuthError] = useState('')

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

  const value = {
    isConfigured: Boolean(supabase),
    user: session?.user ?? null,
    profile,
    nickname: profile?.nickname ?? null,
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
