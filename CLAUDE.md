# KHNP 수소 메가스테이션 입지 최적화 플랫폼

한국수력원자력(KHNP)을 위한 H₂ 메가스테이션 최적 입지 선정 도구.  
React 18 + Vite / FastAPI / OSRM / HiGHS MIP / Leaflet / Docker Compose

---

## 빠른 시작

```bash
# 서비스 전체 시작
docker compose up -d

# 백엔드 코드 변경 → 자동 반영 (uvicorn --reload)
# requirements.txt 변경 → 재빌드 필요
docker compose build backend && docker compose up -d backend

# 프론트엔드 → Vite polling HMR (브라우저 Ctrl+Shift+R 필요할 수 있음)
```

접속: http://localhost

---

## 아키텍처

```
nginx:80
├── /api  → backend:8000  (FastAPI + HiGHS MIP)
├── /     → frontend:5173 (React + Leaflet)
osrm:5000   (한국 도로망, max-table-size 10M)
db:5432     (postgres:16)
```

---

## 핵심 파일

| 파일 | 역할 |
|---|---|
| `frontend/src/components/ProjectView.jsx` | 메인 입지 분석 UI |
| `frontend/src/components/MapView.jsx` | 지역 선택 지도 |
| `backend/app/main.py` | `/optimize` POST (OSRM + HiGHS MIP) |
| `frontend/vite.config.js` | Vite polling 설정 (Windows Docker 필수) |

---

## 최적화 흐름

1. 프론트엔드 → `POST /api/optimize` (격자 셀 배열 + 핀 배열)
2. 백엔드 OSRM Table API → N×M 도로망 거리 행렬
3. **HiGHS MIP** (`scipy.optimize.milp`):
   - 변수: `x[i]∈{0,1}` 공장 위치, `f[i,k]≥0` 원료 수급량, `g[i,j]≥0` H₂ 납품량
   - 목적: `min Σ d_ik·f_ik + Σ d_ij·g_ij`
   - 제약: 공장 1개 선택, 수요 충족, 원료 용량, 물 균형(9L/kg H₂), linking
   - 반환: `{ best_key, supply_alloc:[{pin_id, allocated, needed}], obj_value }`
4. 히트맵 scores = 모든 셀의 가중 거리 합 (MIP와 별개, 시각화용)
5. 프론트엔드: MIP `best_key` 기준으로 연속 구역 탐색, 수급 계획 패널 표시

---

## 알려진 함정

- **OSRM Table API**: sources/destinations 인덱스는 반드시 `;` 구분 (`,` → HTTP 400)
- **Windows Docker HMR**: `vite.config.js`에 `usePolling: true` 없으면 파일 변경 미감지
- **브라우저 캐시**: 변경 불반영 시 Ctrl+Shift+R (hard refresh)
- **scipy 설치**: `requirements.txt`에 `scipy>=1.7.0` 추가됨. 최초 또는 재빌드 후에만 설치됨

---

## 현재 구현된 기능 목록

- [x] 한국 지도 + 지역 선택 + 프로젝트 관리
- [x] 격자 생성 (시도/시군구/읍면동 레벨)
- [x] 핀 배치 (수요지, 원료, PV, 풍력, 원전, 공장)
- [x] 핀 번호 표시 (Leaflet permanent tooltip)
- [x] OSRM 혼합 라우팅 (snap + 도로망 + snap)
- [x] HiGHS MIP 최적화 (공장 위치 + 원료 수급 동시 최적화)
- [x] 히트맵, 지형 오버레이, 도로망 시각화, 도로 접근성 필터
- [x] 원료 수급 계획 패널 (수급 필요/불필요 구분, 경로 색상 차별)
- [x] 수요/공급 분석 (H₂ 균형, 물 사용량, 전력→H₂)
- [x] 핀/점수 상태 유지 (localStorage per projectId)
- [x] FLOW 탭 (공정 플로우차트 편집기)

## 다음 개선 후보

- [ ] P-median (복수 공장 최적 입지, 현재 P=1 고정)
- [ ] 운송 비용 단가 파라미터 (원료 vs H₂ 단가 분리)
- [ ] 예산 제약 / 부지 면적 제약 추가
- [ ] 결과 PDF/Excel 내보내기
