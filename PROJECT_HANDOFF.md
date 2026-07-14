# FunS World 프로젝트 핸드오프

## 폴더 설정
- **작업 폴더 (테스트):** `/Users/maesterong/FUNS/Funshome`
  - GitHub: tololalo/funs-platform
  - URL: https://tololalo.github.io/funs-platform
- **프로덕션 폴더:** `/Users/maesterong/FUNS/funs-world`
  - GitHub: tololalo/funs-world
  - URL: https://funs.world
- **Claude Code에서 지정할 폴더:** `/Users/maesterong/FUNS/Funshome`

## 프로젝트 설명
FunS는 Web3 기반 게이밍 플랫폼. 순수 HTML/CSS/JS로 구성된 정적 사이트이며 GitHub Pages로 배포됩니다.

## 사이트 구조 (25개 페이지)

### 한국어 페이지
| 파일 | 설명 |
|------|------|
| index.html | 메인 홈페이지 |
| about.html | About 페이지 |
| download.html | Coming Soon 다운로드 |
| games/index.html | 게임 목록 (8개 게임 카드) |
| dex/index.html | FunSwap DEX 거래소 |
| dex/app/index.html | DEX 앱 |
| talk/index.html | FunS Talk 메신저 소개 |
| nft/index.html | NFT 마켓플레이스 |
| staking/index.html | 스테이킹 |
| wallet/index.html | 지갑 소개 |
| wallet/app/index.html | 지갑 앱 |
| dashboard/index.html | 대시보드 |

### 영어 페이지
| 파일 | 설명 |
|------|------|
| en/index.html | 영어 메인 |
| en/about.html | 영어 About |
| en/download.html | 영어 Coming Soon |
| en/games/index.html | 영어 Games |
| en/nft/index.html | 영어 NFT |
| en/staking/index.html | 영어 Staking |
| en/dashboard/index.html | 영어 Dashboard |
| en/wallet/index.html | 영어 Wallet |
| en/wallet/app/index.html | 영어 Wallet 앱 |
| dex/en.html | 영어 DEX |
| talk/en.html | 영어 Talk |

### 공통 파일
- css/common.css — 공통 CSS
- js/common.js — 공통 JS
- funs-nugi.png — FunS 마스코트 로고
- games/images/*.jpg — 8개 게임 썸네일

## 브랜딩
- 메인: #FF6B35 (오렌지)
- 보조: #FFD700 (골드)
- 액센트: #4FC3F7 (하늘색)
- 배경: #0a0a0f (다크)
- 헤딩 폰트: Orbitron
- 본문 폰트: Noto Sans KR (한국어) / Inter (영어)

## 네비게이션
Home | Games | DEX | Talk | NFT | Staking | Wallet | Dashboard | About
- KR/EN 언어 전환 버튼
- 앱 다운로드 버튼 (COMING SOON 모달)

## 유지해야 할 기능
1. **COMING SOON 모달** — 다운로드/앱 버튼 클릭 시 FunS 로고 + "COMING SOON" 표시
2. **TEST VERSION 모달** — 지갑 연결 버튼 클릭 시 FunS 로고 + "TEST VERSION" 표시
3. **KR/EN 언어 전환** — 각 페이지별 대응 페이지로 이동
4. **반응형** — 모바일/태블릿/데스크톱
5. **티커 애니메이션** — 메인 페이지 하단 무한 스크롤
6. **게임 썸네일** — games/images/*.jpg

## Git 규칙
- 커밋 메시지: 항상 `update` 한 단어
- Author: `FunS Team <>`
- 명령어: `git -c user.name="FunS Team" -c user.email="" commit -m "update"`
- 한국어 커밋 메시지 금지

## 배포 규칙
- 기본 작업은 Funshome(funs-platform)에서 진행
- 프로덕션 배포(funs-world)는 회장님이 명시적으로 요청한 경우에만
- 배포 전 반드시 `bash verify-pages.sh` 실행하여 25개 페이지 확인
- 프로덕션 배포 명령어:
```
rsync -av --delete \
  --exclude='.git' \
  --exclude='CLAUDE.md' \
  --exclude='WALLET_BUILD_PROMPT.md' \
  --exclude='clean_funs_world.sh' \
  --exclude='download_backup.html' \
  --exclude='verify-pages.sh' \
  --exclude='PROJECT_HANDOFF.md' \
  --exclude='FunS_디자인_프롬프트.md' \
  ~/FUNS/Funshome/ ~/FUNS/funs-world/ \
  && echo "funs.world" > ~/FUNS/funs-world/CNAME \
  && cd ~/FUNS/funs-world \
  && git add -A \
  && git -c user.name="FunS Team" -c user.email="" commit -m "update" \
  && git push origin main
```

## 완료된 작업 (이번 세션)
1. Talk 페이지 네비게이션에 추가 (nav 순서: Home|Games|DEX|Talk|NFT|Staking|Wallet|Dashboard|About)
2. COMING SOON 모달 — 모든 다운로드/앱 버튼에 적용
3. TEST VERSION 모달 — 10개 페이지의 지갑 연결 버튼에 적용
4. download.html → Coming Soon 페이지로 교체 (원본은 download_backup.html로 비공개 보관)
5. 홈페이지에서 아바타/업그레이드 관련 텍스트 제거
6. 게임 썸네일 SVG → JPG (AI 생성 이미지) 교체
7. 티커 애니메이션 개선 (끊김 없는 무한 스크롤)
8. Privacy Policy & Terms 문서 생성 (한국어/영어, 싱가폴 관할)
9. Git 커밋 히스토리 정리 (메시지 "update"로 통일)
10. **전체 사이트 영어 번역 완료** — 7개 신규 영어 페이지 생성 + 기존 영어 페이지 링크 수정
11. DEX 영어 페이지를 한국어 기반으로 재생성 (구조 동일, 텍스트만 번역)
12. Talk 한국어/영어 페이지에 KR/EN 언어 스위처 추가
13. verify-pages.sh 검증 스크립트 추가 (배포 전 25개 페이지 존재 확인)

## 주의사항
- Cowork/Claude Code 환경에서 GitHub push가 안 될 수 있음 → Mac 터미널에서 직접 push
- git lock 파일 에러 시: `rm -f .git/index.lock .git/HEAD.lock`
- Talk 페이지 소스 파일은 항상 `talk/funs-talk-intro.html` 기준
- .gitignore에 포함된 파일: .DS_Store, funs_landing.pdf, download_backup.html, verify-pages.sh

## 완료된 작업 (2026-07-02 세션: 전체 디자인 리뉴얼)
1. **디자인 시스템 v2 "Neon Glass Arcade"** — css/common.css 전면 재작성 (클래스명 유지). 전역 오로라 배경(body::before/after), 글래스모피즘 카드(--glass + backdrop-filter), 뉴트럴 보더+오렌지 호버 글로우(--border/--border-hot), 그라데이션 타이틀·수치(--grad-brand/--grad-title), 샤인 스윕 버튼, 티커 페이드 마스크, prefers-reduced-motion 대응
2. 25개 페이지 전부 인라인 스타일을 v2로 정비 (9개 병렬 에이전트). DEX/Talk/NFT/Games/Dashboard/Wallet/Staking/Download가 common.css 미연결 상태였던 것을 연결
3. 브랜드 외 색상 제거 (메인 초록 #00ff88, Talk 바이낸스 옐로우 #F0B90B, about 초록 #00ffc8, 구식 #ff9a00/#4caf50). 의미색 표준: 상승 #35E0A1 / 하락 #FF5A6E
4. 검증 워크플로우(검사관 13 + 회의론자 19)로 확정 결함 17건 수정: dex/en.html hreflang/canonical, talk 모바일 패딩 캐스케이드·EN nav 구조, staking 모바일 테이블 data-label, en/wallet 모달 한국어 문구, wallet 구식 색상 JS, games 푸터 앵커, download canonical/hreflang, dex/app 모달 닫기버튼 위치
5. talk/funs-talk-intro*.html 3개를 라이브 페이지와 동기화 — **talk 수정 시 항상 재동기화할 것**
6. EN 페이지 전체 + KR 페이지에 Inter 폰트 추가

## push 방법 (Cowork 환경)
gh CLI에 tololalo 계정 로그인되어 있음:
```
gh auth switch --user tololalo
git -c credential.helper= -c credential.helper='!gh auth git-credential' push origin main
gh auth switch --user smwyg9122  # 원래 계정 복원
```

## iOS 웨이트리스트 → 구글시트 연동 (2026-07-03 연결 완료·라이브)
talk/download/index.html·en.html의 폼은 `WAITLIST_ENDPOINT` 상수가 설정되면 구글시트로 자동 수집, 비어 있으면 mailto 폴백.

### 회장님 설정 절차 (5분, 1회)
1. sheets.new 에서 새 시트 생성 (이름 예: "FunS Talk iOS Waitlist")
2. 메뉴 확장 프로그램 → Apps Script → 아래 코드 전체 붙여넣기 → 저장
3. 배포 → 새 배포 → 유형: 웹 앱 → "실행 계정: 나" / "액세스 권한: 모든 사용자" → 배포 → 권한 승인
4. 나온 웹 앱 URL(https://script.google.com/macros/s/…/exec)을 Claude에게 전달 → 사이트에 연결 후 푸시

### Apps Script 코드
```javascript
const SHEET_NAME = 'Waitlist';

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(SHEET_NAME);
    if (!sh) {
      sh = ss.insertSheet(SHEET_NAME);
      sh.appendRow(['신청 시각', '이메일', '언어', '페이지']);
    }
    const p = e.parameter || {};
    const email = String(p.email || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return ContentService.createTextOutput('invalid');
    }
    const last = sh.getLastRow();
    if (last > 1) {
      const emails = sh.getRange(2, 2, last - 1, 1).getValues().flat();
      if (emails.indexOf(email) !== -1) return ContentService.createTextOutput('dup');
    }
    sh.appendRow([new Date(), email, p.lang || '', p.page || '']);
    return ContentService.createTextOutput('ok');
  } catch (err) {
    return ContentService.createTextOutput('error');
  }
}
```
(중복 이메일은 자동으로 걸러짐. 코드 수정 후에는 배포 → 배포 관리 → 새 버전으로 갱신해야 반영됨)
