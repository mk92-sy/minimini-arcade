import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY가 설정되지 않았어요. ' +
      '.env.example을 참고해 .env 파일을 만들어주세요. 값이 채워지기 전까지 랭킹 기능은 비활성 상태로 동작합니다.',
  )
}

// 환경변수가 없으면 null을 export해서, 랭킹 관련 코드가 안전하게 "연결 안 됨" 상태로 동작하게 함.
export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null
