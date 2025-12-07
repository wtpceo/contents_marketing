-- =====================================================
-- 마케팅 캘린더 & 실시간 트렌드 테이블
-- =====================================================

-- 1. 마케팅 이벤트 테이블 (연간 마케팅 캘린더)
create table if not exists public.marketing_events (
  id uuid default uuid_generate_v4() primary key,
  event_date date not null,
  title text not null,
  category text check (category in ('season', 'holiday', 'shopping', 'culture', 'sports')),
  importance_level int default 1 check (importance_level between 1 and 5),
  description text,
  created_at timestamp with time zone default now()
);

-- 인덱스
create index if not exists idx_marketing_events_date on public.marketing_events(event_date);
create index if not exists idx_marketing_events_category on public.marketing_events(category);

-- RLS 정책 (공개 읽기)
alter table public.marketing_events enable row level security;

create policy "marketing_events_read_all" on public.marketing_events
  for select using (true);

-- 2. 실시간 트렌드 테이블
create table if not exists public.trends (
  id uuid default uuid_generate_v4() primary key,
  keyword text not null,
  source text check (source in ('google', 'naver', 'manual')),
  volume_score int default 0,
  category text,
  related_keywords text[],
  fetched_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- 인덱스
create index if not exists idx_trends_fetched_at on public.trends(fetched_at desc);
create index if not exists idx_trends_source on public.trends(source);
create index if not exists idx_trends_keyword on public.trends(keyword);

-- RLS 정책 (공개 읽기)
alter table public.trends enable row level security;

create policy "trends_read_all" on public.trends
  for select using (true);

-- =====================================================
-- 2025년 마케팅 캘린더 시드 데이터
-- =====================================================

insert into public.marketing_events (event_date, title, category, importance_level, description) values
-- 1월
('2025-01-01', '새해 첫날', 'holiday', 5, '새해 목표, 신년 인사, 다이어리/플래너'),
('2025-01-28', '설날 연휴 시작', 'holiday', 5, '귀성길, 명절 선물, 가족'),
('2025-01-29', '설날', 'holiday', 5, '세배, 덕담, 한복, 전통'),
('2025-01-30', '설날 연휴', 'holiday', 4, '명절 음식, 가족 모임'),

-- 2월
('2025-02-14', '발렌타인데이', 'culture', 4, '초콜릿, 연인, 고백, 선물'),
('2025-02-04', '입춘', 'season', 2, '봄의 시작, 입춘대길'),

-- 3월
('2025-03-01', '삼일절', 'holiday', 3, '독립운동, 태극기'),
('2025-03-03', '새학기 시작', 'season', 4, '입학, 개학, 학용품, 새출발'),
('2025-03-14', '화이트데이', 'culture', 3, '사탕, 답례, 연인'),

-- 4월
('2025-04-05', '식목일', 'culture', 2, '나무심기, 환경, 봄나들이'),
('2025-04-07', '벚꽃 시즌', 'season', 4, '벚꽃놀이, 피크닉, 봄'),
('2025-04-22', '지구의 날', 'culture', 3, '환경보호, ESG, 친환경'),

-- 5월
('2025-05-01', '근로자의 날', 'holiday', 3, '노동, 휴식, 워라밸'),
('2025-05-05', '어린이날', 'holiday', 5, '선물, 가족 나들이, 키즈'),
('2025-05-08', '어버이날', 'holiday', 5, '부모님 선물, 카네이션, 효도'),
('2025-05-15', '스승의 날', 'culture', 3, '감사, 선생님, 교육'),
('2025-05-19', '성년의 날', 'culture', 3, '성인, 향수, 선물'),

-- 6월
('2025-06-06', '현충일', 'holiday', 3, '호국, 추모, 태극기'),
('2025-06-14', '월드컵 시즌', 'sports', 3, '축구, 응원, 치킨/맥주'),
('2025-06-20', '여름 시작', 'season', 4, '휴가 준비, 다이어트, 서머룩'),

-- 7월
('2025-07-17', '제헌절', 'holiday', 2, '헌법, 민주주의'),
('2025-07-20', '초복', 'season', 3, '보양식, 삼계탕'),
('2025-07-25', '여름휴가 시즌', 'season', 5, '바캉스, 해외여행, 휴양지'),

-- 8월
('2025-08-15', '광복절', 'holiday', 4, '독립, 태극기, 애국'),
('2025-08-20', '개학 시즌', 'season', 3, '학교 준비, 학용품'),

-- 9월
('2025-09-01', '가을 시작', 'season', 3, '가을 패션, 단풍, 환절기'),
('2025-10-06', '추석 연휴 시작', 'holiday', 5, '귀성길, 명절 선물'),
('2025-10-07', '추석', 'holiday', 5, '보름달, 송편, 가족'),
('2025-10-08', '추석 연휴', 'holiday', 4, '차례, 성묘'),

-- 10월
('2025-10-03', '개천절', 'holiday', 3, '단군, 건국'),
('2025-10-09', '한글날', 'holiday', 3, '세종대왕, 한글'),
('2025-10-31', '핼러윈', 'culture', 4, '코스튬, 파티, 호박'),

-- 11월
('2025-11-11', '빼빼로데이', 'culture', 4, '빼빼로, 선물, 친구'),
('2025-11-13', '수능', 'culture', 4, '응원, 합격 기원, 수험생'),
('2025-11-28', '블랙프라이데이', 'shopping', 5, '대규모 할인, 쇼핑'),

-- 12월
('2025-12-01', '연말 시즌', 'season', 4, '송년회, 연말정산, 결산'),
('2025-12-24', '크리스마스 이브', 'holiday', 4, '데이트, 파티, 선물'),
('2025-12-25', '크리스마스', 'holiday', 5, '산타, 선물, 캐롤, 트리'),
('2025-12-31', '연말', 'holiday', 5, '송년, 새해 카운트다운, 불꽃놀이'),

-- 주요 쇼핑 시즌
('2025-01-15', '신년 세일', 'shopping', 3, '새해 할인, 겨울 정리'),
('2025-03-20', '봄 시즌 세일', 'shopping', 3, '봄옷, 환절기'),
('2025-05-20', '가정의 달 세일', 'shopping', 4, '가전, 가구, 선물'),
('2025-07-01', '썸머 세일', 'shopping', 4, '여름옷, 휴가용품'),
('2025-09-15', '가을 시즌 세일', 'shopping', 3, '가을옷, FW시즌'),
('2025-11-01', '11월 쇼핑 시즌', 'shopping', 4, '광군제, 사전 블프'),
('2025-12-15', '연말 세일', 'shopping', 4, '크리스마스 선물, 연말 쇼핑')

on conflict do nothing;
