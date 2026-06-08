import { useState } from 'react';

const STORAGE_KEY = 'khnp_projects';
const LEVEL_LABEL = { sido: '시도', sigungu: '시군구', emd: '읍면동' };
const FACILITY_LABELS = {
  hydrogenProduction: 'H₂ Production',
  storageTank: 'Storage Tank',
  compressor: 'Compressor',
  pipeline: 'Pipeline',
  demandNode: 'Demand Node',
};

function loadProjects() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function ProjectView({ onLoadProject }) {
  const [projects, setProjects] = useState(loadProjects);
  const [expandedId, setExpandedId] = useState(null);

  const handleDelete = (id) => {
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <div style={{ flex: 1, background: '#0d1117', overflowY: 'auto', padding: 24 }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 24 }}>
          <h2 style={{ color: '#c9d1d9', fontSize: 18, fontWeight: 700, margin: 0 }}>프로젝트</h2>
          <span style={{ color: '#484f58', fontSize: 12 }}>{projects.length}개</span>
        </div>

        {projects.length === 0 ? (
          <div style={{
            border: '1px dashed #30363d', borderRadius: 8, padding: 40,
            textAlign: 'center', color: '#484f58',
          }}>
            <p style={{ fontSize: 14, margin: '0 0 8px' }}>저장된 프로젝트가 없습니다</p>
            <p style={{ fontSize: 12, margin: 0 }}>MAP 탭에서 지역을 설정하고 "Start Project"를 눌러 시작하세요</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {projects.map(p => {
              const facilityTotal = Object.keys(p.placements ?? {}).length;
              const facilityBreakdown = Object.values(p.placements ?? {}).reduce((acc, v) => {
                acc[v.type] = (acc[v.type] || 0) + 1; return acc;
              }, {});
              const isExpanded = expandedId === p.id;
              const regionLabel = p.region?.filter?.name ?? '전체 대한민국';

              return (
                <div key={p.id} style={{
                  background: '#161b22', border: '1px solid #30363d', borderRadius: 8,
                  overflow: 'hidden',
                }}>
                  {/* 카드 헤더 */}
                  <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ color: '#c9d1d9', fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                        <span style={{
                          background: '#1f3a5a', color: '#4fc3f7', fontSize: 9, fontWeight: 700,
                          padding: '2px 6px', borderRadius: 3, letterSpacing: 0.5,
                        }}>{LEVEL_LABEL[p.region?.level]}</span>
                      </div>
                      {p.description && (
                        <p style={{ color: '#8b949e', fontSize: 12, margin: '0 0 6px' }}>{p.description}</p>
                      )}
                      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#484f58' }}>
                        <span>📍 {regionLabel}</span>
                        <span>🔲 격자 {p.gridCellCount || 0}개</span>
                        <span>🏭 시설 {facilityTotal}개</span>
                        <span>{formatDate(p.createdAt)}</span>
                      </div>
                    </div>

                    {/* 버튼 */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => setExpandedId(isExpanded ? null : p.id)} style={{
                        background: 'transparent', border: '1px solid #30363d', borderRadius: 5,
                        padding: '5px 10px', color: '#8b949e', fontSize: 11, cursor: 'pointer',
                      }}>{isExpanded ? '접기' : '상세'}</button>
                      <button onClick={() => onLoadProject(p)} style={{
                        background: '#1f6feb', border: '1px solid #1f6feb', borderRadius: 5,
                        padding: '5px 10px', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      }}>불러오기</button>
                      <button onClick={() => handleDelete(p.id)} style={{
                        background: 'transparent', border: '1px solid #6e3030', borderRadius: 5,
                        padding: '5px 10px', color: '#f85149', fontSize: 11, cursor: 'pointer',
                      }}>삭제</button>
                    </div>
                  </div>

                  {/* 상세 펼침 */}
                  {isExpanded && (
                    <div style={{
                      borderTop: '1px solid #21262d', padding: '12px 16px',
                      background: '#0d1117', display: 'flex', gap: 24,
                    }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: '#484f58', fontSize: 10, fontWeight: 700, letterSpacing: 1, margin: '0 0 8px' }}>지도 설정</p>
                        <Row label="레벨" value={LEVEL_LABEL[p.region?.level]} />
                        <Row label="선택 지역" value={p.region?.filter?.name ?? '전체'} />
                        <Row label="격자 수" value={`${p.gridCellCount || 0}개`} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: '#484f58', fontSize: 10, fontWeight: 700, letterSpacing: 1, margin: '0 0 8px' }}>시설 배치</p>
                        {facilityTotal === 0 ? (
                          <span style={{ color: '#484f58', fontSize: 11 }}>배치된 시설 없음</span>
                        ) : (
                          Object.entries(facilityBreakdown).map(([type, count]) => (
                            <Row key={type} label={FACILITY_LABELS[type]} value={`${count}개`} />
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
      <span style={{ color: '#484f58' }}>{label}</span>
      <span style={{ color: '#8b949e' }}>{value}</span>
    </div>
  );
}
