# KHNP Megastation

React + FastAPI + PostgreSQL 기반 웹 플랫폼.

## 서비스 구성

| 서비스   | 포트 | 설명            |
|----------|------|-----------------|
| frontend | 5173 | React + Vite    |
| backend  | 8000 | FastAPI         |
| db       | 5432 | PostgreSQL 16   |

## 새 컴퓨터에서 시작하기

### 사전 요구사항
- Docker Desktop (또는 Docker Engine + Docker Compose v2)
- Git

### 실행 절차

```bash
git clone https://github.com/lyc-0327/KHNP_Megastation.git
cd KHNP_Megastation

cp .env.example .env
# .env 파일을 열어 POSTGRES_PASSWORD 등을 수정

docker compose up --build
```

이후 브라우저에서:
- Frontend: http://localhost:5173
- Backend API 문서: http://localhost:8000/docs
- Health check: http://localhost:8000/health

### 종료

```bash
docker compose down        # 컨테이너만 종료 (DB 데이터 유지)
docker compose down -v     # 컨테이너 + 볼륨 삭제 (DB 초기화)
```

## 개발 중 자주 쓰는 명령

```bash
# 로그 확인
docker compose logs -f backend

# 특정 서비스만 재시작
docker compose restart backend

# 컨테이너 내부 접속
docker compose exec backend bash
docker compose exec db psql -U h2user -d h2platform
```

## 폴더 구조

```
KHNP_Megastation/
├── frontend/            # React + Vite
│   ├── Dockerfile
│   └── src/
├── backend/             # FastAPI
│   ├── Dockerfile
│   └── app/
│       └── main.py
├── docs/                # 설계 문서
├── deploy/              # 배포 설정 (추후 추가)
├── docker-compose.yml
├── .env.example
└── .gitignore
```

## 배포 (추후)

`deploy/` 폴더에 nginx 또는 caddy 설정을 추가해 서버에 배포할 예정.
