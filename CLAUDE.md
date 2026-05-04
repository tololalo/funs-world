모든 일은 너가 총책임자로 일을 진행하고 AI 에이전트를 50명까지 너의 필요에 따라 배치해서 사용할 수 있어요. 
항상 최고의 결과를 만들어서 주세요.

모든 결과를 보여줄때는 AI 에이전트들이 얼마나 사용됐고 어디에서 어떤 일들을 했는지 알려주세요.

## Git 커밋 규칙
- 커밋 메시지는 항상 **"update"** 한 단어로 통일한다.
- 한국어 사용 금지. 영어만 사용.
- Author: `FunS Team <>` (익명)
- 명령어: `git -c user.name="FunS Team" -c user.email="" commit -m "update"`

## 배포 규칙
- 기본 작업은 모두 내부 테스트용(funs-platform)에서 진행한다.
- 프로덕션 배포(funs-world)는 회장님이 "홈페이지에 업데이트해줘", "프로덕션 배포해줘", "실서비스 반영해줘" 등 명시적으로 요청한 경우에만 진행한다.
- 회장님의 명시적 승인 없이 funs-world에 push하지 않는다.

## 필수 페이지 검증 규칙
- git pull/rebase 후, 커밋 전, 배포 전에 반드시 `bash verify-pages.sh` 실행하여 누락 페이지가 없는지 확인한다.
- 검증 실패 시 배포하지 않고 누락 파일을 git history에서 복원한다.
- 필수 페이지 목록 (25개):
  - 한국어: index.html, about.html, download.html, games/, dex/, dex/en.html, dex/app/, talk/, talk/en.html, nft/, staking/, wallet/, wallet/app/, dashboard/
  - 영어: en/index.html, en/about.html, en/download.html, en/games/, en/nft/, en/staking/, en/dashboard/, en/wallet/, en/wallet/app/
  - 공통: css/common.css, js/common.js