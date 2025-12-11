# 📑 [PRD] 투 트랙(Two-Track) 콘텐츠 생산 시스템 명세서

**작성일:** 2025.12.11
**목표:** 개별 맞춤형 기획(High-Quality)과 템플릿 기반 대량 생산(High-Efficiency)을 하나의 플랫폼에서 매끄럽게 지원하여 대행사의 업무 효율을 극대화한다.

---

## 1. UX/UI 흐름 (User Flow)

### A. 진입점 (Entry Point): 통합 모달
* **위치:** 대시보드 좌측 상단 **`[+ 새 콘텐츠]`** 버튼.
* **변경 사항:** 버튼 클릭 시 바로 에디터로 이동하지 않고, **`제작 방식 선택 모달`**을 띄움.
* **모달 옵션:**
    1.  **🅰️ 맞춤 창작 (Custom Mode):**
        * *설명:* "특정 광고주를 위한 독창적인 기획이 필요할 때"
        * *Action:* 기존 AI 에디터 화면으로 이동.
    2.  **🅱️ 템플릿 대량 생산 (Template Factory):**
        * *설명:* "검증된 템플릿으로 여러 광고주의 콘텐츠를 한 번에 찍어낼 때"
        * *Action:* 신규 **`대량 생산 워크스페이스`**로 이동.

### B. 신규 화면: 대량 생산 워크스페이스 (The Factory)
* **Step 1. 템플릿 선택:** '학원', '병원', '이벤트' 등 카테고리별 템플릿 리스트 제공.
* **Step 2. 광고주 선택:** 해당 템플릿을 적용할 광고주 다중 선택 (Checkboxes).
* **Step 3. 실행:** `[N개 콘텐츠 일괄 생성]` 버튼 클릭.

### C. 결과 확인
* 생성된 콘텐츠는 기존 **`콘텐츠 캘린더`**와 **`대시보드 > 컨펌 대기`** 리스트에 자동으로 등록됨.

---

## 2. 세부 기능 명세 (Functional Specs)

### 📦 1. 템플릿 도서관 (Template Library)
* **위치:** `설정` > `템플릿 관리` (관리자 전용)
* **기능:** 성공한 콘텐츠 구조를 저장하는 기능.
* **치환 변수(Variables):** 템플릿 작성 시 `{{변수명}}`을 사용.
    * `{{name}}`: 업체명
    * `{{location}}`: 지역/주소
    * `{{menu}}`: 대표 메뉴/상품
    * `{{phone}}`: 전화번호
    * `{{usp}}`: 강점(Unique Selling Point) - *스마트 임포트로 학습된 데이터 활용*

### 🏭 2. 대량 생성 엔진 (Bulk Generation Engine)
단순한 텍스트 치환(Find & Replace)을 넘어, **LLM을 활용한 자연스러운 문맥 보정**이 핵심.

* **로직:**
    1.  사용자가 선택한 `Template ID`와 `Advertiser IDs` 수신.
    2.  각 광고주의 DB 정보(`advanced_profile`) 로드.
    3.  **LLM 프롬프트 실행 (Loop):**
        > "이 템플릿 구조를 유지하되, `{{변수}}` 자리에 이 광고주의 실제 정보를 채워 넣어. 문맥이 어색하지 않게 조사(은/는/이/가)를 수정하고 자연스럽게 다듬어."
    4.  결과물을 `contents` 테이블에 `draft` 상태로 `batch_insert`.

---

## 3. 👨‍💻 개발팀 작업 지시서 (복사해서 전달)

### [Frontend]
1.  **모달 컴포넌트 개발:** `CreateContentModal` (맞춤형 vs 템플릿형 선택 UI).
2.  **템플릿 관리 페이지:** 템플릿 CRUD(생성/조회/수정/삭제) 화면 구현. 변수 입력 가이드(`{{name}}` 등) 툴팁 제공.
3.  **대량 생산 페이지 (`/bulk-create`):**
    * (좌측) 템플릿 선택 리스트.
    * (우측) 광고주 다중 선택 리스트 (검색 필터 포함).
    * (하단) `Generate` 버튼 및 로딩 Progress UI.

### [Backend]
1.  **DB 스키마 추가 (`templates` 테이블):**
    * `id`, `title`, `category`, `content_structure`(Text), `platform`(Enum: blog/insta), `created_at`.
2.  **일괄 생성 API (`POST /api/contents/bulk`):**
    * **Request:** `{ template_id: 123, advertiser_ids: [1, 2, 5, ...] }`
    * **Process:**
        * `advertiser_ids` 배열을 순회하며 비동기(Async) 또는 큐(Queue)로 작업 처리. (타임아웃 방지)
        * OpenAI API를 호출하여 템플릿에 광고주 데이터를 입힌 후 생성.
    * **Response:** `{ success_count: 20, failed_ids: [] }`
