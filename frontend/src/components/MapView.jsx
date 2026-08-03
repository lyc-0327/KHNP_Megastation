import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import 'leaflet/dist/leaflet.css';

const MAP_LEVELS = {
  sido:    { label: '시도',   url: '/korea_sido.geojson',    codeKey: 'SIDO_CD',    nameKey: 'SIDO_NM' },
  sigungu: { label: '시군구', url: '/korea_sigungu.geojson', codeKey: 'SIGUNGU_CD', nameKey: 'SIGUNGU_NM' },
  emd:     { label: '읍면동', url: '/korea_emd.geojson',     codeKey: 'ADM_CD',     nameKey: 'ADM_NM' },
};

const OSRM = 'http://localhost:5000';

function fmtDist(m) { return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`; }
function fmtDur(s)  { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}시간 ${m}분` : `${m}분`; }

function filterFeatures(features, codeKey, code) {
  if (!code) return features;
  return features.filter(f => String(f.properties[codeKey] ?? '') === String(code));
}

function pointInPolygon(lng, lat, coords) {
  let inside = false;
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const [xi, yi] = coords[i], [xj, yj] = coords[j];
    if (((yi > lat) !== (yj > lat)) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function generateGrid(features, gridSizeMeters = 1000) {
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  const featureRings = features.map(feature => {
    const geom = feature.geometry;
    if (!geom) return { props: feature.properties, rings: [] };
    const polys = geom.type === 'MultiPolygon' ? geom.coordinates.flat(1) : geom.coordinates;
    for (const ring of polys) for (const [lng, lat] of ring) {
      if (lng < minLng) minLng = lng; if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
    }
    return { props: feature.properties, rings: polys };
  });
  const dLat = gridSizeMeters / 111000;
  const dLng = dLat / Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
  const estimatedCells = Math.ceil((maxLng - minLng) / dLng) * Math.ceil((maxLat - minLat) / dLat);
  if (estimatedCells > 500000) return { cells: null, estimatedCells };
  const cells = [];
  for (let lat = minLat; lat < maxLat; lat += dLat) {
    for (let lng = minLng; lng < maxLng; lng += dLng) {
      const cLng = lng + dLng / 2, cLat = lat + dLat / 2;
      for (const { props, rings } of featureRings) {
        let found = false;
        for (const ring of rings) { if (pointInPolygon(cLng, cLat, ring)) { found = true; break; } }
        if (found) { cells.push({ key: `${lng.toFixed(5)}_${lat.toFixed(5)}`, lat, lng, dLat, dLng, props }); break; }
      }
    }
  }
  return { cells, estimatedCells };
}

/* ── 정보 패널 ── */
function InfoPanel({ info }) {
  return (
    <div style={{
      position: 'absolute', bottom: 16, right: 16, width: 220, minHeight: 100,
      background: 'rgba(13,17,23,0.92)', border: '1px solid #30363d', borderRadius: 8,
      padding: '12px 14px', zIndex: 1000, backdropFilter: 'blur(6px)', pointerEvents: 'none',
    }}>
      <p style={{ color: '#4fc3f7', fontSize: 10, fontWeight: 700, letterSpacing: 1, margin: '0 0 8px' }}>지역 정보</p>
      {info ? (<>
        <InfoRow label="행정구역" value={info.name} color="#c9d1d9" />
        <InfoRow label="행정코드" value={info.code} />
        <div style={{ borderTop: '1px solid #21262d', margin: '8px 0' }} />
        <InfoRow label="위도" value={info.lat.toFixed(5) + '°'} />
        <InfoRow label="경도" value={info.lng.toFixed(5) + '°'} />
        {info.gridCount !== null && <>
          <div style={{ borderTop: '1px solid #21262d', margin: '8px 0' }} />
          <InfoRow label="격자 수" value={`${info.gridCount}개`} />
        </>}
      </>) : (
        <p style={{ color: '#484f58', fontSize: 11, margin: 0 }}>지역 위에 마우스를 올리세요</p>
      )}
    </div>
  );
}
function InfoRow({ label, value, color = '#8b949e' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
      <span style={{ color: '#484f58' }}>{label}</span>
      <span style={{ color, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

/* ── 검색 가능한 드롭다운 ── */
function SearchableSelect({ options, value, onChange, levelLabel }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const [pos, setPos]       = useState(null);
  const btnRef  = useRef(null);
  const dropRef = useRef(null);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 2, left: r.left, width: r.width });
    }
    setOpen(o => !o);
    setSearch('');
  };

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target) &&
          btnRef.current && !btnRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const filtered = search ? options.filter(o => String(o.name).includes(search)) : options;
  const selected = value ? options.find(o => String(o.code) === String(value)) : null;

  return (
    <>
      <button ref={btnRef} onClick={handleToggle} style={{
        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: '#0d1117', border: '1px solid #30363d', borderRadius: 4,
        color: selected ? '#4fc3f7' : '#8b949e', fontSize: 11, padding: '5px 7px',
        cursor: 'pointer', textAlign: 'left',
      }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.name ?? `전체 ${levelLabel}`}
        </span>
        <span style={{ fontSize: 8, marginLeft: 4, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && pos && createPortal(
        <div ref={dropRef} style={{
          position: 'fixed', top: pos.top, left: pos.left, width: pos.width,
          background: '#0d1117', border: '1px solid #4fc3f7',
          borderRadius: 4, zIndex: 99999, boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <input autoFocus placeholder="검색..." value={search} onChange={e => setSearch(e.target.value)}
            onClick={e => e.stopPropagation()}
            style={{ background: '#161b22', border: 'none', borderBottom: '1px solid #30363d', color: '#c9d1d9', fontSize: 11, padding: '7px 9px', outline: 'none', flexShrink: 0 }}
          />
          <div style={{ overflowY: 'auto', maxHeight: 220 }}>
            <div onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
              style={{ padding: '6px 9px', cursor: 'pointer', fontSize: 11, color: !value ? '#4fc3f7' : '#8b949e', background: !value ? '#0e2a3a' : 'transparent' }}
              onMouseEnter={e => { if (value) e.currentTarget.style.background = '#1a2332'; }}
              onMouseLeave={e => { if (value) e.currentTarget.style.background = 'transparent'; }}>
              전체 {levelLabel}
            </div>
            {filtered.map(o => {
              const isSelected = String(value) === String(o.code);
              return (
                <div key={o.code} onClick={() => { onChange(String(o.code)); setOpen(false); setSearch(''); }}
                  style={{ padding: '6px 9px', cursor: 'pointer', fontSize: 11, color: isSelected ? '#4fc3f7' : '#c9d1d9', background: isSelected ? '#0e2a3a' : 'transparent' }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#1a2332'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? '#0e2a3a' : 'transparent'; }}>
                  {o.name}
                </div>
              );
            })}
            {filtered.length === 0 && <div style={{ padding: '8px 9px', color: '#484f58', fontSize: 11 }}>검색 결과 없음</div>}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/* ── 프로젝트 저장 모달 ── */
const STORAGE_KEY = 'khnp_projects';

function ProjectModal({ mapLevel, selectedFilter, gridCells, gridSize, onClose, onSaved }) {
  const [name, setName]             = useState('');
  const [desc, setDesc]             = useState('');
  const [dupConfirm, setDupConfirm] = useState(false);
  const [dupProject, setDupProject] = useState(null);
  const levelLabel  = MAP_LEVELS[mapLevel].label;
  const regionLabel = selectedFilter?.name ?? '전체 대한민국';

  const buildProject = (id) => ({
    id: id ?? Date.now().toString(),
    name: name.trim(), description: desc.trim(),
    createdAt: new Date().toISOString(),
    region: { level: mapLevel, filter: selectedFilter },
    gridSize, gridGenerated: gridCells.length > 0, gridCellCount: gridCells.length,
    flows: [],
  });

  const handleSave = () => {
    if (!name.trim()) return;
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const dup = existing.find(p => p.name.trim() === name.trim());
    if (dup) { setDupProject(dup); setDupConfirm(true); return; }
    doSave(existing, null);
  };

  const doSave = (existing, overwriteId) => {
    const project = buildProject(overwriteId);
    const updated = overwriteId
      ? existing.map(p => p.id === overwriteId ? { ...project, flows: p.flows ?? [] } : p)
      : [project, ...existing];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    onSaved(project);
  };

  const handleOverwrite = () => {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    doSave(existing, dupProject.id);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: 24, width: 340 }}>
        <p style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 700, margin: '0 0 16px' }}>새 프로젝트 시작</p>
        <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 6, padding: '8px 12px', marginBottom: 14 }}>
          <InfoRow label="지도 레벨" value={levelLabel} />
          <InfoRow label="대상 지역" value={regionLabel} />
          <InfoRow label="격자 크기" value={gridSize >= 1000 ? `${gridSize/1000}km` : `${gridSize}m`} />
          <InfoRow label="격자" value={gridCells.length > 0 ? `${gridCells.length}칸` : '미생성'} />
        </div>
        {dupConfirm ? (
          <div style={{ background: '#2d1f0e', border: '1px solid #d97706', borderRadius: 7, padding: '12px 14px', marginBottom: 14 }}>
            <p style={{ color: '#fbbf24', fontSize: 12, fontWeight: 700, margin: '0 0 6px' }}>중복된 프로젝트명</p>
            <p style={{ color: '#c9d1d9', fontSize: 11, margin: '0 0 12px' }}><b>"{name}"</b> 프로젝트가 이미 존재합니다.<br />기존 프로젝트를 덮어쓰겠습니까?</p>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleOverwrite} style={{ flex: 1, padding: '7px 0', borderRadius: 5, fontWeight: 600, fontSize: 11, cursor: 'pointer', background: '#d97706', border: 'none', color: '#fff' }}>덮어쓰기</button>
              <button onClick={() => { setDupConfirm(false); setDupProject(null); }} style={{ flex: 1, padding: '7px 0', borderRadius: 5, fontWeight: 600, fontSize: 11, cursor: 'pointer', background: 'transparent', border: '1px solid #30363d', color: '#8b949e' }}>이름 변경</button>
            </div>
          </div>
        ) : (
          <>
            <input placeholder="프로젝트명 *" value={name} onChange={e => { setName(e.target.value); setDupConfirm(false); }} onKeyDown={e => e.key === 'Enter' && handleSave()}
              style={{ width: '100%', boxSizing: 'border-box', background: '#0d1117', border: `1px solid ${name ? '#1f6feb' : '#30363d'}`, borderRadius: 5, padding: '8px 10px', color: '#c9d1d9', fontSize: 12, marginBottom: 8, outline: 'none' }} />
            <textarea placeholder="설명 (선택)" value={desc} onChange={e => setDesc(e.target.value)} rows={3}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'none', background: '#0d1117', border: '1px solid #30363d', borderRadius: 5, padding: '8px 10px', color: '#c9d1d9', fontSize: 12, marginBottom: 14, outline: 'none' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSave} disabled={!name.trim()} style={{ flex: 1, padding: '8px 0', borderRadius: 5, fontWeight: 600, fontSize: 12, cursor: name ? 'pointer' : 'not-allowed', background: name ? '#1f6feb' : '#21262d', border: 'none', color: name ? '#fff' : '#484f58' }}>저장</button>
              <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 5, fontWeight: 600, fontSize: 12, cursor: 'pointer', background: 'transparent', border: '1px solid #30363d', color: '#8b949e' }}>취소</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── 주소 자동완성 입력 ── */
function AddrInput({ accentColor, onSelect }) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const [pos,     setPos]     = useState(null);
  const inputRef = useRef(null);
  const dropRef  = useRef(null);
  const timerRef = useRef(null);

  const doSearch = async (q) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=kr&accept-language=ko`;
      const data = await fetch(url).then(r => r.json());
      setResults(data);
      if (data.length > 0 && inputRef.current) {
        const r = inputRef.current.getBoundingClientRect();
        setPos({ top: r.bottom + 2, left: r.left, width: Math.max(r.width, 240) });
        setOpen(true);
      } else {
        setOpen(false);
      }
    } catch { setOpen(false); }
    finally { setLoading(false); }
  };

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(timerRef.current);
    if (!q.trim()) { setOpen(false); setResults([]); return; }
    timerRef.current = setTimeout(() => doSearch(q), 420);
  };

  const handleSelect = (item) => {
    const label = item.display_name.split(',')[0];
    setQuery(label);
    setOpen(false);
    onSelect({ lat: parseFloat(item.lat), lng: parseFloat(item.lon), label });
  };

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          placeholder="주소 검색..."
          value={query}
          onChange={handleChange}
          onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setQuery(''); } }}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#0d1117', border: `1px solid ${open ? accentColor : '#30363d'}`,
            borderRadius: 4, padding: '5px 26px 5px 8px', color: '#c9d1d9', fontSize: 11,
            outline: 'none', transition: 'border-color 0.15s',
          }}
        />
        <span style={{
          position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)',
          color: loading ? accentColor : '#484f58', fontSize: 11, pointerEvents: 'none',
        }}>{loading ? '…' : '🔍'}</span>
      </div>
      {open && pos && createPortal(
        <div ref={dropRef} style={{
          position: 'fixed', top: pos.top, left: pos.left, width: pos.width,
          background: '#0d1117', border: `1px solid ${accentColor}`,
          borderRadius: 6, zIndex: 99999, boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
          overflow: 'hidden',
        }}>
          {results.map((item, i) => {
            const parts = item.display_name.split(',');
            return (
              <div key={i}
                onClick={() => handleSelect(item)}
                onMouseEnter={e => e.currentTarget.style.background = '#1a2332'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: i < results.length - 1 ? '1px solid #21262d' : 'none' }}>
                <div style={{ fontSize: 11, color: '#c9d1d9', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{parts[0]}</div>
                {parts[1] && <div style={{ fontSize: 10, color: '#484f58', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{parts.slice(1, 3).join(',').trim()}</div>}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}

/* 지역 외부를 어둡게 덮는 역마스크 폴리곤 생성 */
function buildMaskPolygon(L, geoLayer, pane) {
  const worldRing = [[-90, -180], [-90, 180], [90, 180], [90, -180]];
  const holes = [];
  geoLayer.eachLayer(sub => {
    const geom = sub.feature?.geometry;
    if (!geom) return;
    const polys = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
    polys.forEach(poly => {
      if (poly[0]?.length > 2) holes.push(poly[0].map(([lng, lat]) => [lat, lng]));
    });
  });
  return L.polygon([worldRing, ...holes], { pane, stroke: false, fillColor: '#0d1117', fillOpacity: 1 });
}

/* GeoJSON 캐시 */
const _geoCache = {};

export default function MapView() {
  const mapDivRef     = useRef(null);
  const mapRef        = useRef(null);
  const koreaLayerRef = useRef(null);
  const gridLayerRef  = useRef(null);
  const routeLayerRef     = useRef(null);
  const originMarkerRef   = useRef(null);
  const destMarkerRef     = useRef(null);
  const overlayLayerRef   = useRef(null);
  const maskLayerRef      = useRef(null);
  const overlayVisibleRef = useRef(false);

  const [mapReady,       setMapReady]       = useState(false);
  const [mapLevel,       setMapLevel]       = useState('sido');
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [filterOptions,  setFilterOptions]  = useState([]);

  const [gridVisible, setGridVisible] = useState(false);
  const [gridLoading, setGridLoading] = useState(false);
  const [gridCells,   setGridCells]   = useState([]);
  const [gridSize,    setGridSize]    = useState(1000);
  const [hoverInfo,   setHoverInfo]   = useState(null);
  const [showModal,   setShowModal]   = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  /* 거리 계산 state */
  const [pickingMode,  setPickingMode]  = useState(null); // 'origin' | 'dest' | null
  const [routeOrigin,  setRouteOrigin]  = useState(null); // { lat, lng, label }
  const [routeDest,    setRouteDest]    = useState(null);
  const [routeResult,  setRouteResult]  = useState(null); // { distance, duration }
  const [routeLoading,   setRouteLoading]   = useState(false);
  const [routeError,     setRouteError]     = useState(null);
  const [overlayVisible, setOverlayVisible] = useState(false);

  const pickingModeRef = useRef(pickingMode);
  const gridCellsRef   = useRef(gridCells);
  useEffect(() => { pickingModeRef.current = pickingMode; }, [pickingMode]);
  useEffect(() => { gridCellsRef.current = gridCells; }, [gridCells]);
  useEffect(() => { overlayVisibleRef.current = overlayVisible; }, [overlayVisible]);

  /* ── Leaflet 초기화 ── */
  useEffect(() => {
    if (mapRef.current) return;
    let destroyed = false;
    import('leaflet').then(({ default: L }) => {
      if (destroyed || !mapDivRef.current) return;
      const map = L.map(mapDivRef.current, { zoomControl: true, attributionControl: false });
      map.createPane('terrain').style.zIndex = 250;
      map.createPane('mask').style.zIndex    = 350;
      mapRef.current = map;

      /* 지도 클릭 → 포인트 찍기 */
      map.on('click', async (e) => {
        const mode = pickingModeRef.current;
        if (!mode) return;
        let { lat, lng } = e.latlng;

        /* 격자 스냅: 격자가 있으면 클릭한 셀의 중심으로 이동 */
        const cells = gridCellsRef.current;
        if (cells.length > 0) {
          for (const cell of cells) {
            if (lat >= cell.lat && lat < cell.lat + cell.dLat &&
                lng >= cell.lng && lng < cell.lng + cell.dLng) {
              lat = cell.lat + cell.dLat / 2;
              lng = cell.lng + cell.dLng / 2;
              break;
            }
          }
        }

        /* OSRM nearest로 도로명 조회 */
        let label = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        try {
          const res = await fetch(`${OSRM}/nearest/v1/driving/${lng},${lat}?number=1`);
          const data = await res.json();
          const name = data?.waypoints?.[0]?.name;
          if (name) label = name;
        } catch { /* fallback to coords */ }

        const point = { lat, lng, label };
        const isOrigin = mode === 'origin';
        const html = `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:${isOrigin ? '#3b82f6' : '#ef4444'};border:2px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>`;
        const icon = L.divIcon({ html, className: '', iconSize: [22, 22], iconAnchor: [11, 22] });
        const popup = `<b style="color:${isOrigin ? '#3b82f6' : '#ef4444'}">${isOrigin ? '출발지' : '도착지'}</b><br/><span style="font-size:11px">${label}</span>`;

        if (isOrigin) {
          originMarkerRef.current?.remove();
          originMarkerRef.current = L.marker([lat, lng], { icon }).addTo(map).bindPopup(popup);
          setRouteOrigin(point);
        } else {
          destMarkerRef.current?.remove();
          destMarkerRef.current = L.marker([lat, lng], { icon }).addTo(map).bindPopup(popup);
          setRouteDest(point);
        }

        setPickingMode(null);
        setRouteResult(null);
        setRouteError(null);
        routeLayerRef.current?.remove();
        routeLayerRef.current = null;
      });

      setTimeout(() => { map.invalidateSize(); setMapReady(true); }, 100);
    });
    return () => { destroyed = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  /* ── ESC 키로 포인트 찍기 취소 ── */
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setPickingMode(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ── 지도 커서: 포인트 찍기 모드 ── */
  useEffect(() => {
    const container = mapRef.current?.getContainer();
    if (!container) return;
    container.style.cursor = pickingMode ? 'crosshair' : '';
  }, [pickingMode]);

  /* ── 레벨 변경 시 드롭다운 옵션 로드 ── */
  useEffect(() => {
    setFilterOptions([]);
    const levelCfg = MAP_LEVELS[mapLevel];
    const load = async () => {
      if (!_geoCache[mapLevel]) _geoCache[mapLevel] = await fetch(levelCfg.url).then(r => r.json());
      const options = _geoCache[mapLevel].features
        .map(f => ({ code: f.properties[levelCfg.codeKey], name: f.properties[levelCfg.nameKey] }))
        .sort((a, b) => String(a.name).localeCompare(String(b.name), 'ko'));
      setFilterOptions(options);
    };
    load();
  }, [mapLevel]);

  /* ── 지도 레이어 업데이트 ── */
  useEffect(() => {
    if (!mapReady) return;
    const levelCfg = MAP_LEVELS[mapLevel];
    let cancelled = false;

    const buildLayer = async () => {
      const { default: L } = await import('leaflet');
      if (!_geoCache[mapLevel]) _geoCache[mapLevel] = await fetch(levelCfg.url).then(r => r.json());
      if (cancelled) return;

      const allFeatures = _geoCache[mapLevel].features;
      const features = filterFeatures(allFeatures, levelCfg.codeKey, selectedFilter?.code);

      if (koreaLayerRef.current) { koreaLayerRef.current.remove(); koreaLayerRef.current = null; }
      if (gridLayerRef.current)  { gridLayerRef.current.remove();  gridLayerRef.current = null; }
      setGridVisible(false); setGridCells([]); setHoverInfo(null);

      const layer = L.geoJSON({ type: 'FeatureCollection', features }, {
        smoothFactor: 0,
        style: { color: '#4fc3f7', weight: 0.5, fill: true, fillColor: '#1a2332', fillOpacity: overlayVisibleRef.current ? 0 : 1 },
        onEachFeature: (feature, lyr) => {
          lyr.on('mouseover', (e) => {
            lyr.setStyle({ fillColor: '#1e3a4a', weight: 1.2, color: '#7dd3fc' });
            const code = feature.properties[levelCfg.codeKey];
            const name = feature.properties[levelCfg.nameKey];
            const cells = gridCellsRef.current;
            let gridCount = null;
            if (cells.length > 0) {
              gridCount = 0;
              const geom = feature.geometry;
              const polys = geom.type === 'MultiPolygon' ? geom.coordinates.flat(1) : geom.coordinates;
              for (const cell of cells) {
                const cLng = cell.lng + cell.dLng / 2, cLat = cell.lat + cell.dLat / 2;
                for (const ring of polys) { if (pointInPolygon(cLng, cLat, ring)) { gridCount++; break; } }
              }
            }
            setHoverInfo({ name, code: String(code), lat: e.latlng.lat, lng: e.latlng.lng, gridCount });
          });
          lyr.on('mousemove', (e) => setHoverInfo(p => p ? { ...p, lat: e.latlng.lat, lng: e.latlng.lng } : p));
          lyr.on('mouseout', () => { lyr.setStyle({ fillColor: '#1a2332', fillOpacity: overlayVisibleRef.current ? 0 : 1, weight: 0.5, color: '#4fc3f7' }); setHoverInfo(null); });
        },
      }).addTo(mapRef.current);

      koreaLayerRef.current = layer;
      /* overlay ON 상태에서 레벨/필터 변경 시 타일 bounds + 마스크 재생성 */
      if (overlayVisibleRef.current) {
        const bounds = layer.getBounds();
        overlayLayerRef.current?.remove();
        overlayLayerRef.current = L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          { pane: 'terrain', opacity: 0.9, attribution: '© OpenStreetMap contributors', bounds }
        ).addTo(mapRef.current);
        maskLayerRef.current?.remove();
        maskLayerRef.current = buildMaskPolygon(L, layer, 'mask').addTo(mapRef.current);
        layer.setStyle({ fillOpacity: 0 });
      }
      mapRef.current.invalidateSize();
      mapRef.current.fitBounds(layer.getBounds(), { padding: [20, 20] });
    };

    buildLayer();
    return () => { cancelled = true; };
  }, [mapLevel, selectedFilter, mapReady]);

  /* ── OSM 지형 오버레이 토글 ── */
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    import('leaflet').then(({ default: L }) => {
      if (overlayVisible) {
        /* OSM 타일 (terrain pane: z-index 250) — bounds로 표시 지역 외 타일 로드 차단 */
        if (!overlayLayerRef.current) {
          const bounds = koreaLayerRef.current?.getBounds();
          overlayLayerRef.current = L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            { pane: 'terrain', opacity: 0.9, attribution: '© OpenStreetMap contributors', ...(bounds ? { bounds } : {}) }
          ).addTo(mapRef.current);
        }
        /* 역마스크 (mask pane: z-index 350) */
        if (koreaLayerRef.current && !maskLayerRef.current) {
          maskLayerRef.current = buildMaskPolygon(L, koreaLayerRef.current, 'mask')
            .addTo(mapRef.current);
        }
        /* GeoJSON 채우기 완전 투명 (테두리만, overlayPane z-index 400) */
        koreaLayerRef.current?.setStyle({ fillOpacity: 0 });
      } else {
        overlayLayerRef.current?.remove(); overlayLayerRef.current = null;
        maskLayerRef.current?.remove();    maskLayerRef.current = null;
        koreaLayerRef.current?.setStyle({ fillOpacity: 1, fillColor: '#1a2332' });
      }
    });
  }, [overlayVisible, mapReady]);

  /* ── 격자 생성/제거 ── */
  const handleRemoveGrid = useCallback(() => {
    if (gridLayerRef.current) { gridLayerRef.current.remove(); gridLayerRef.current = null; }
    setGridVisible(false); setGridCells([]); setHoverInfo(null);
  }, []);

  const handleLoadGrid = useCallback(() => {
    if (!_geoCache[mapLevel]) return;
    setGridLoading(true);
    const levelCfg = MAP_LEVELS[mapLevel];
    setTimeout(async () => {
      const features = filterFeatures(_geoCache[mapLevel].features, levelCfg.codeKey, selectedFilter?.code);
      const result = generateGrid(features, gridSize);
      if (!result.cells) {
        alert(`격자 수가 너무 많습니다 (약 ${Math.round(result.estimatedCells / 10000)}만개 예상).\n더 큰 격자 크기를 선택하거나 지역을 좁혀주세요.`);
        setGridLoading(false); return;
      }
      const cells = result.cells;
      setGridCells(cells);

      const { default: L } = await import('leaflet');
      if (!mapRef.current) return;
      if (gridLayerRef.current) gridLayerRef.current.remove();

      const layerGroup = L.layerGroup();
      cells.forEach(cell => {
        const defaultStyle = { color: '#4fc3f7', weight: 0.5, fillColor: '#4fc3f7', fillOpacity: 0.08 };
        const rect = L.rectangle([[cell.lat, cell.lng], [cell.lat + cell.dLat, cell.lng + cell.dLng]], { ...defaultStyle });
        rect.on('mouseover', (e) => {
          rect.setStyle({ fillOpacity: 0.28, color: '#7dd3fc', weight: 1 });
          setHoverInfo({ name: cell.props?.[levelCfg.nameKey] ?? '—', code: String(cell.props?.[levelCfg.codeKey] ?? '—'), lat: e.latlng.lat, lng: e.latlng.lng, gridCount: null });
        });
        rect.on('mousemove', (e) => setHoverInfo(p => p ? { ...p, lat: e.latlng.lat, lng: e.latlng.lng } : p));
        rect.on('mouseout', () => { rect.setStyle(defaultStyle); setHoverInfo(null); });
        layerGroup.addLayer(rect);
      });
      layerGroup.addTo(mapRef.current);
      gridLayerRef.current = layerGroup;
      setGridVisible(true);
      setGridLoading(false);
    }, 50);
  }, [mapLevel, selectedFilter, gridSize]);

  /* ── 거리 계산 ── */
  const handleCalcRoute = useCallback(async () => {
    if (!routeOrigin || !routeDest) return;
    setRouteLoading(true);
    setRouteError(null);
    setRouteResult(null);

    try {
      const url = `${OSRM}/route/v1/driving/${routeOrigin.lng},${routeOrigin.lat};${routeDest.lng},${routeDest.lat}?overview=full&geometries=geojson`;
      const res  = await fetch(url);
      const data = await res.json();

      if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error(data.message ?? '경로를 찾을 수 없습니다');

      const route    = data.routes[0];
      const distance = route.distance;
      const duration = route.duration;
      const geometry = route.geometry;

      setRouteResult({ distance, duration });

      const { default: L } = await import('leaflet');
      routeLayerRef.current?.remove();
      routeLayerRef.current = L.geoJSON(geometry, {
        style: { color: '#f97316', weight: 4, opacity: 0.85, dashArray: null },
      }).addTo(mapRef.current);

      /* 경로가 보이도록 뷰 이동 */
      const bounds = L.latLngBounds([
        [routeOrigin.lat, routeOrigin.lng],
        [routeDest.lat, routeDest.lng],
      ]);
      mapRef.current.fitBounds(bounds, { padding: [60, 60] });

    } catch (err) {
      setRouteError(err.message || 'OSRM 서버에 연결할 수 없습니다');
    } finally {
      setRouteLoading(false);
    }
  }, [routeOrigin, routeDest]);

  const handleClearRoute = () => {
    routeLayerRef.current?.remove(); routeLayerRef.current = null;
    originMarkerRef.current?.remove(); originMarkerRef.current = null;
    destMarkerRef.current?.remove(); destMarkerRef.current = null;
    setRouteOrigin(null); setRouteDest(null);
    setRouteResult(null); setRouteError(null);
    setPickingMode(null);
  };

  /* ── 주소 선택 → 핀 배치 (AddrInput의 onSelect 콜백) ── */
  const handleAddrSelect = useCallback(async (which, { lat: rawLat, lng: rawLng, label }) => {
    let lat = rawLat, lng = rawLng;

    /* 격자 스냅 */
    const cells = gridCellsRef.current;
    if (cells.length > 0) {
      for (const cell of cells) {
        if (lat >= cell.lat && lat < cell.lat + cell.dLat &&
            lng >= cell.lng && lng < cell.lng + cell.dLng) {
          lat = cell.lat + cell.dLat / 2;
          lng = cell.lng + cell.dLng / 2;
          break;
        }
      }
    }

    const { default: L } = await import('leaflet');
    const isOrigin = which === 'origin';
    const html  = `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:${isOrigin ? '#3b82f6' : '#ef4444'};border:2px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>`;
    const icon  = L.divIcon({ html, className: '', iconSize: [22, 22], iconAnchor: [11, 22] });
    const popup = `<b style="color:${isOrigin ? '#3b82f6' : '#ef4444'}">${isOrigin ? '출발지' : '도착지'}</b><br/><span style="font-size:11px">${label}</span>`;
    const point = { lat, lng, label };

    if (isOrigin) {
      originMarkerRef.current?.remove();
      originMarkerRef.current = L.marker([lat, lng], { icon }).addTo(mapRef.current).bindPopup(popup);
      setRouteOrigin(point);
    } else {
      destMarkerRef.current?.remove();
      destMarkerRef.current = L.marker([lat, lng], { icon }).addTo(mapRef.current).bindPopup(popup);
      setRouteDest(point);
    }

    mapRef.current?.panTo([lat, lng]);
    setRouteResult(null);
    setRouteError(null);
    routeLayerRef.current?.remove();
    routeLayerRef.current = null;
  }, []);

  const handleLevelChange = (level) => { setMapLevel(level); setSelectedFilter(null); setGridVisible(false); setGridCells([]); };
  const handleFilterChange = (code) => {
    setSelectedFilter(code ? (filterOptions.find(o => String(o.code) === code) ?? null) : null);
    setGridVisible(false); setGridCells([]);
  };
  const handleProjectSaved = () => { setShowModal(false); setSavedNotice(true); setTimeout(() => setSavedNotice(false), 3000); };

  const canCalc = routeOrigin && routeDest && !routeLoading;

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative' }}>

      {/* ── 좌측 패널 ── */}
      <div style={{
        width: 185, flexShrink: 0, background: '#161b22', borderRight: '1px solid #30363d',
        display: 'flex', flexDirection: 'column', gap: 5, padding: 12, overflowY: 'auto',
      }}>
        {/* 지도 설정 */}
        <p style={{ color: '#8b949e', fontSize: 10, fontWeight: 700, letterSpacing: 1, margin: 0 }}>지도 설정</p>
        <div style={{ display: 'flex', gap: 3 }}>
          {Object.entries(MAP_LEVELS).map(([key, cfg]) => (
            <button key={key} onClick={() => handleLevelChange(key)} style={{
              flex: 1, padding: '5px 2px', fontSize: 10, fontWeight: 600, borderRadius: 4, cursor: 'pointer',
              background: mapLevel === key ? '#1f6feb' : '#0d1117',
              border: `1px solid ${mapLevel === key ? '#1f6feb' : '#30363d'}`,
              color: mapLevel === key ? '#fff' : '#8b949e',
            }}>{cfg.label}</button>
          ))}
        </div>
        {filterOptions.length > 0 && (
          <SearchableSelect options={filterOptions} value={selectedFilter?.code ?? ''} onChange={handleFilterChange} levelLabel={MAP_LEVELS[mapLevel].label} />
        )}

        <div style={{ borderTop: '1px solid #30363d', margin: '2px 0' }} />

        {/* 거리 계산 */}
        <p style={{ color: '#8b949e', fontSize: 10, fontWeight: 700, letterSpacing: 1, margin: 0 }}>거리 계산</p>

        {/* 출발지 */}
        <div>
          <div style={{ fontSize: 9, color: '#484f58', fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>출발지</div>
          <button onClick={() => setPickingMode(m => m === 'origin' ? null : 'origin')} style={{
            width: '100%', textAlign: 'left', padding: '5px 8px', borderRadius: 4, fontSize: 11,
            background: pickingMode === 'origin' ? '#1e3a5f' : (routeOrigin ? '#0d1525' : '#0d1117'),
            border: `1px solid ${pickingMode === 'origin' ? '#3b82f6' : (routeOrigin ? '#1e3a5f' : '#30363d')}`,
            color: pickingMode === 'origin' ? '#60a5fa' : (routeOrigin ? '#93c5fd' : '#484f58'),
            cursor: 'pointer',
          }}>
            {pickingMode === 'origin'
              ? '지도를 클릭하세요...'
              : routeOrigin
                ? <span title={`${routeOrigin.lat.toFixed(4)}, ${routeOrigin.lng.toFixed(4)}`}>📍 {routeOrigin.label}</span>
                : '🗺 지점 클릭'}
          </button>
          <div style={{ marginTop: 3 }}>
            <AddrInput accentColor="#3b82f6" onSelect={(pt) => handleAddrSelect('origin', pt)} />
          </div>
        </div>

        {/* 도착지 */}
        <div>
          <div style={{ fontSize: 9, color: '#484f58', fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>도착지</div>
          <button onClick={() => setPickingMode(m => m === 'dest' ? null : 'dest')} style={{
            width: '100%', textAlign: 'left', padding: '5px 8px', borderRadius: 4, fontSize: 11,
            background: pickingMode === 'dest' ? '#3a1a1a' : (routeDest ? '#150d0d' : '#0d1117'),
            border: `1px solid ${pickingMode === 'dest' ? '#ef4444' : (routeDest ? '#3a1a1a' : '#30363d')}`,
            color: pickingMode === 'dest' ? '#f87171' : (routeDest ? '#fca5a5' : '#484f58'),
            cursor: 'pointer',
          }}>
            {pickingMode === 'dest'
              ? '지도를 클릭하세요...'
              : routeDest
                ? <span title={`${routeDest.lat.toFixed(4)}, ${routeDest.lng.toFixed(4)}`}>📍 {routeDest.label}</span>
                : '🗺 지점 클릭'}
          </button>
          <div style={{ marginTop: 3 }}>
            <AddrInput accentColor="#ef4444" onSelect={(pt) => handleAddrSelect('dest', pt)} />
          </div>
        </div>

        {/* 계산 버튼 */}
        <button onClick={handleCalcRoute} disabled={!canCalc} style={{
          width: '100%', padding: '7px 0', borderRadius: 5, fontWeight: 600, fontSize: 11,
          background: canCalc ? '#1f6feb' : '#21262d',
          border: `1px solid ${canCalc ? '#1f6feb' : '#30363d'}`,
          color: canCalc ? '#fff' : '#484f58',
          cursor: canCalc ? 'pointer' : 'not-allowed',
        }}>
          {routeLoading ? '계산 중...' : '경로 계산'}
        </button>

        {/* 결과 */}
        {routeResult && (
          <div style={{ background: '#0a1a0a', border: '1px solid #1a3a1a', borderRadius: 6, padding: '10px 12px' }}>
            <div style={{ fontSize: 9, color: '#3fb950', fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>계산 결과</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 10, color: '#484f58' }}>도로 거리</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#3fb950', fontFamily: 'monospace' }}>{fmtDist(routeResult.distance)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: '#484f58' }}>예상 시간</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#58a6ff', fontFamily: 'monospace' }}>{fmtDur(routeResult.duration)}</span>
            </div>
          </div>
        )}

        {routeError && (
          <div style={{ background: '#2d0f0f', border: '1px solid #6e3030', borderRadius: 6, padding: '8px 10px', fontSize: 11, color: '#f85149' }}>
            {routeError}
          </div>
        )}

        {(routeOrigin || routeDest) && (
          <button onClick={handleClearRoute} style={{
            width: '100%', background: 'transparent', border: '1px solid #30363d',
            borderRadius: 4, padding: '4px 0', cursor: 'pointer', color: '#6e7681', fontSize: 10,
          }}>초기화</button>
        )}

        <div style={{ borderTop: '1px solid #30363d', margin: '2px 0' }} />

        {/* 격자 크기 */}
        <p style={{ color: '#8b949e', fontSize: 10, fontWeight: 700, letterSpacing: 1, margin: 0 }}>격자 크기</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
          {[10, 100, 500, 1000].map(size => (
            <button key={size} onClick={() => { setGridSize(size); if (gridVisible) handleRemoveGrid(); }} style={{
              padding: '4px 0', fontSize: 10, fontWeight: 600, borderRadius: 4, cursor: 'pointer',
              background: gridSize === size ? '#0e2a3a' : '#0d1117',
              border: `1px solid ${gridSize === size ? '#4fc3f7' : '#30363d'}`,
              color: gridSize === size ? '#4fc3f7' : '#8b949e',
            }}>{size >= 1000 ? `${size / 1000}km` : `${size}m`}</button>
          ))}
        </div>
        <button onClick={handleLoadGrid} disabled={gridLoading || gridVisible} style={{
          width: '100%', background: gridVisible ? '#21262d' : '#1f6feb',
          border: `1px solid ${gridVisible ? '#30363d' : '#1f6feb'}`,
          borderRadius: 5, padding: '7px 0', cursor: gridVisible ? 'default' : 'pointer',
          color: gridVisible ? '#8b949e' : '#fff', fontSize: 11, fontWeight: 600,
        }}>
          {gridLoading ? '생성 중...' : gridVisible ? `격자 ${gridCells.length}개 표시 중` : `${gridSize >= 1000 ? `${gridSize / 1000}km` : `${gridSize}m`} 격자 표시`}
        </button>
        {gridVisible && (
          <button onClick={handleRemoveGrid} style={{
            width: '100%', background: 'transparent', border: '1px solid #6e3030',
            borderRadius: 5, padding: '5px 0', cursor: 'pointer', color: '#f85149', fontSize: 11, fontWeight: 600,
          }}>격자 취소</button>
        )}
      </div>

      {/* ── 지도 영역 ── */}
      <div style={{ flex: 1, position: 'relative', background: '#0d1117' }}>
        <div ref={mapDivRef} style={{ position: 'absolute', inset: 0 }} />
        <InfoPanel info={hoverInfo} />

        {/* 포인트 찍기 안내 배너 */}
        {pickingMode && (
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            background: pickingMode === 'origin' ? 'rgba(30,58,95,0.95)' : 'rgba(58,26,26,0.95)',
            border: `1px solid ${pickingMode === 'origin' ? '#3b82f6' : '#ef4444'}`,
            borderRadius: 6, padding: '8px 16px', zIndex: 1000,
            color: pickingMode === 'origin' ? '#93c5fd' : '#fca5a5',
            fontSize: 12, fontWeight: 600, pointerEvents: 'none',
          }}>
            {pickingMode === 'origin' ? '출발지' : '도착지'}를 지도에서 클릭하세요 — ESC로 취소
          </div>
        )}

        {/* 지형 토글 버튼 + Start Project 버튼 */}
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000, display: 'flex', alignItems: 'center', gap: 8 }}>
          {savedNotice && (
            <div style={{ background: '#1a3a1a', border: '1px solid #2ea043', borderRadius: 5, padding: '6px 12px', color: '#3fb950', fontSize: 11, fontWeight: 600 }}>✓ 프로젝트 저장됨</div>
          )}
          <button
            onClick={() => setOverlayVisible(v => !v)}
            title={overlayVisible ? '지형 레이어 숨기기' : '지형 레이어 표시 (OSM)'}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: overlayVisible ? '#0e2a1a' : '#161b22',
              border: `1px solid ${overlayVisible ? '#22c55e' : '#30363d'}`,
              borderRadius: 6, padding: '6px 11px', cursor: 'pointer',
              color: overlayVisible ? '#22c55e' : '#8b949e',
              fontSize: 11, fontWeight: 600, backdropFilter: 'blur(4px)',
              transition: 'all 0.15s',
            }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
              <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
            </svg>
            {overlayVisible ? '지형 숨기기' : '지형 보기'}
          </button>
          <button onClick={() => setShowModal(true)} style={{
            background: '#238636', border: '1px solid #2ea043', borderRadius: 5,
            padding: '7px 14px', color: '#fff', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(35,134,54,0.3)',
          }}>▶ Start Project</button>
        </div>
      </div>

      {showModal && (
        <ProjectModal
          mapLevel={mapLevel} selectedFilter={selectedFilter}
          gridCells={gridCells} gridSize={gridSize}
          onClose={() => setShowModal(false)} onSaved={handleProjectSaved}
        />
      )}
    </div>
  );
}
