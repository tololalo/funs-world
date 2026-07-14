# FunS World 웹사이트 전체 리디자인

## 프로젝트 개요
FunS는 Web3 기반 게이밍 플랫폼입니다. 현재 웹사이트(funs.world)의 전체 디자인을 현대적이고 세련되게 리뉴얼해주세요.

## 현재 사이트 구조 (총 25개 페이지)

**한국어 페이지:**
- index.html — 메인 홈페이지
- about.html — About 페이지
- download.html — Coming Soon 다운로드 페이지
- games/index.html — 게임 목록 페이지
- dex/index.html — FunSwap DEX (탈중앙화 거래소)
- dex/app/index.html — DEX 앱
- talk/index.html — FunS Talk 메신저 소개
- nft/index.html — NFT 마켓플레이스
- staking/index.html — 스테이킹
- wallet/index.html — 지갑 소개
- wallet/app/index.html — 지갑 앱
- dashboard/index.html — 대시보드

**영어 페이지 (한국어의 영어 버전):**
- en/index.html, en/about.html, en/download.html
- en/games/index.html, en/nft/index.html, en/staking/index.html
- en/dashboard/index.html, en/wallet/index.html, en/wallet/app/index.html
- dex/en.html, talk/en.html

**공통 파일:**
- css/common.css — 공통 CSS
- js/common.js — 공통 JS

## 브랜딩 가이드라인
- 메인 컬러: #FF6B35 (오렌지)
- 보조 컬러: #FFD700 (골드)
- 액센트: #4FC3F7 (하늘색)
- 배경: #0a0a0f (다크)
- 헤딩 폰트: Orbitron (monospace, 미래지향적)
- 본문 폰트: Noto Sans KR (한국어) / Inter (영어)
- 로고: funs-nugi.png (FunS 캐릭터 마스코트)

## 네비게이션 구조
Home | Games | DEX | Talk | NFT | Staking | Wallet | Dashboard | About
- 우상단: 언어 전환 (KR/EN), 앱 다운로드 버튼
- 앱 다운로드 클릭 → COMING SOON 모달 표시
- 지갑 연결 클릭 → TEST VERSION 모달 표시

## 유지해야 할 기능
1. **COMING SOON 모달** — FunS 로고 + "COMING SOON" 텍스트, 다운로드/앱 버튼 클릭 시 표시
2. **TEST VERSION 모달** — FunS 로고 + "TEST VERSION" 텍스트, 지갑 연결 버튼 클릭 시 표시
3. **KR/EN 언어 전환** — 각 페이지마다 대응하는 한국어/영어 페이지로 이동
4. **반응형 디자인** — 모바일/태블릿/데스크톱
5. **티커 애니메이션** — 메인 페이지 하단 24개 항목, 45초 무한 스크롤
6. **게임 썸네일** — games/images/*.jpg (8개 AI 생성 이미지)

## 디자인 방향
- 현대적이고 프리미엄한 Web3/GameFi 느낌
- 다크 테마 기반
- 부드러운 그라데이션과 글래스모피즘 효과
- 인터랙티브한 호버 애니메이션
- 깔끔하고 일관된 카드 UI
- 모든 페이지에 걸쳐 통일된 디자인 시스템

## 기술 스택
- 순수 HTML/CSS/JS (빌드 도구 없음, GitHub Pages 배포)
- 외부 라이브러리 최소화
- Google Fonts: Orbitron, Noto Sans KR, Inter

## 페이지별 핵심 콘텐츠

### 메인 (index.html)
히어로 섹션, 생태계 소개(Games/DEX/Talk/NFT/Staking/Wallet), 비전 로드맵, 파트너/통계, 다운로드 CTA, 푸터

### Games (games/index.html)
8개 게임 카드 그리드: FunS Tetris, Mahjong Master, 2048 Crypto, Quiz Show, Bubble Pop, Sudoku, Card Match, Runner Dash

### DEX (dex/index.html)
토큰 스왑 인터페이스, 유동성 풀, 가격 차트, 최근 거래 테이블, 인기 풀 목록

### Talk (talk/index.html)
암호화 메신저 소개, 기능 설명, 토큰 이코노미, 로드맵

### NFT (nft/index.html)
NFT 마켓플레이스, 컬렉션 소개, 민팅/거래 기능

### Staking (staking/index.html)
스테이킹 대시보드, APY 정보, 리워드 계산

### Wallet (wallet/index.html)
지갑 소개, 보안 기능, 멀티체인 지원

### Dashboard (dashboard/index.html)
포트폴리오 개요, 자산 현황, 거래 내역

### About (about.html)
팀 소개, 비전, 로드맵, 파트너십

## Git 규칙
- 커밋 메시지: 항상 "update"
- Author: FunS Team <>
- 배포 전 verify-pages.sh 실행하여 25개 페이지 존재 확인
