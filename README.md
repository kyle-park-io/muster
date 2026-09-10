# Muster

로컬 컴퓨터에서 반복 실행되는 작업을 한곳에서 살펴보고 제어하는 대시보드입니다.
Windows, WSL, macOS, Linux를 구분해 현재 실행 환경을 표시합니다.
WSL에서 실행하면 Windows Task Scheduler와 WSL 내부의 systemd 및 cron을 함께 조회합니다.

## 현재 지원 범위

| 소스 | 조회 | 켜기와 끄기 | 지금 실행 | 로그 |
| --- | --- | --- | --- | --- |
| Windows Task Scheduler | 지원 | 사용자 소유 작업 | 사용자 소유 작업 | 준비 중 |
| 사용자 systemd timer | 지원 | 지원 | 지원 | 지원 |
| 시스템 systemd timer | 지원 | 조회 전용 | 조회 전용 | 지원 |
| 사용자 crontab | 지원 | 지원 | 지원 | 별도 표준 로그 없음 |
| Codex 자동화 | 로컬 파일 감지 | 조회 전용 | 조회 전용 | 준비 중 |
| Claude 예약 작업 | 설치 상태 감지 | 조회 전용 | 조회 전용 | 준비 중 |

시스템 범위의 제어는 관리자 권한 처리가 필요하므로 현재 읽기 전용입니다. Codex와
Claude의 로컬 저장 형식도 공개된 제어 계약이 확인된 범위에서만 읽습니다.

## 시작하기

Node.js 24 이상을 권장합니다.

```bash
pnpm install
pnpm dev
```

브라우저에서 `http://127.0.0.1:4317`을 엽니다. 로컬 API는
`http://127.0.0.1:4318`에서 실행됩니다.

프로덕션 빌드와 실행은 다음과 같습니다.

```bash
pnpm build
pnpm start
```

## 안전 장치

- 서버는 `127.0.0.1`에만 바인딩됩니다.
- 상태 변경 API는 JSON 요청과 로컬 Origin만 허용합니다.
- 사용자 systemd timer에만 `enable --now`, `disable --now`, `start`를 실행합니다.
- Windows에서는 현재 사용자 소유의 일반 작업만 제어합니다.
- Microsoft와 시스템 Windows 작업은 조회 전용입니다.
- cron 항목을 끌 때는 원본 행을 인코딩한 Muster 표식으로 보존합니다.
- 모든 상태 변경은 대상과 실제 작업을 보여주는 확인창을 거칩니다.
- 시스템 systemd timer와 에이전트 스케줄은 현재 조회 전용입니다.

## 명령

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

프론트엔드는 React, Vite, TypeScript, Tailwind CSS를 사용합니다. 로컬 API는
Fastify와 소스별 어댑터로 구성했습니다. 본문은 Pretendard Variable, 명령과 시간은
Geist Mono로 표시합니다.
