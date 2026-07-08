import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { ensureProfile, updateNickname as updateNicknameRequest } from "../lib/profile.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // 세션 구독
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // 세션이 바뀌면 프로필을 가져오거나(최초 로그인 시) 새로 만듦
  useEffect(() => {
    if (!supabase) return;
    const user = session?.user;
    if (!user) {
      setProfile(null);
      return;
    }

    let cancelled = false;
    ensureProfile(user).then((p) => {
      if (!cancelled) setProfile(p);
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const signInWithGoogle = useCallback(() => {
    if (!supabase) return;
    return supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }, []);

  const signInWithKakao = useCallback(() => {
    if (!supabase) return;
    return supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: window.location.origin,
        scopes: "profile_nickname",
      },
    });
  }, []);

  const signOut = useCallback(() => {
    if (!supabase) return;
    return supabase.auth.signOut();
  }, []);

  const changeNickname = useCallback(
    async (nextNickname) => {
      if (!session?.user) {
        return { data: null, error: new Error("로그인이 필요합니다.") };
      }
      const { data, error } = await updateNicknameRequest(session.user.id, nextNickname);
      if (!error) setProfile(data);
      return { data, error };
    },
    [session],
  );

  const value = {
    isConfigured: Boolean(supabase),
    user: session?.user ?? null,
    profile,
    nickname: profile?.nickname ?? null,
    modalOpen,
    openAuthModal: () => setModalOpen(true),
    closeAuthModal: () => setModalOpen(false),
    signInWithGoogle,
    signInWithKakao,
    signOut,
    changeNickname,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth()는 <AuthProvider> 내부에서만 사용할 수 있어요.");
  }
  return ctx;
}
