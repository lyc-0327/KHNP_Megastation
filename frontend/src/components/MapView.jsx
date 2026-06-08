import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import 'leaflet/dist/leaflet.css';

const MAP_LEVELS = {
  sido:    { label: '시도',   url: '/korea_sido.geojson',    codeKey: 'SIDO_CD',    nameKey: 'SIDO_NM' },
  sigungu: { label: '시군구', url: '/korea_sigungu.geojson', codeKey: 'SIGUNGU_CD', nameKey: 'SIGUNGU_NM' },
  emd:     { label: '읍면동', url: '/korea_emd.geojson',     codeKey: 'ADM_CD',     nameKey: 'ADM_NM' },
};

const FACILITY_TYPES = {
  hydrogenProduction: { label: 'H₂ Production', color: '#4fc3f7', cells: 10 },
  storageTank:        { label: 'Storage Tank',   color: '#81c784', cells: 4  },
  compressor:         { label: 'Compressor',     color: '#ffb74d', cells: 2  },
  pipeline:           { label: 'Pipeline',       color: '#ce93d8', cells: 1  },
  demandNode:         { label: 'Demand Node',    color: '#ef9a9a', cells: 3  },
};

/* 현재 레벨의 codeKey로 정확히 일치하는 feature만 반환 */
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
      position: 'absolute', bottom: 16, right: 16, width: 220, minHeight: 140,
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
        <div style={{ borderTop: '1px solid #21262d', margin: '8px 0' }} />
        <InfoRow label="격자 수" value={info.gridCount !== null ? `${info.gridCount}개` : '—'} />
        <InfoRow label="시설 수" value={info.facilityCount !== null ? `${info.facilityCount}개` : '—'} />
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
          btnRef.current && !btnRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const filtered = search
    ? options.filter(o => String(o.name).includes(search))
    : options;
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
          {/* 인라인 검색 입력 */}
          <input
            autoFocus
            placeholder="검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onClick={e => e.stopPropagation()}
            style={{
              background: '#161b22', border: 'none', borderBottom: '1px solid #30363d',
              color: '#c9d1d9', fontSize: 11, padding: '7px 9px', outline: 'none', flexShrink: 0,
            }}
          />
          {/* 옵션 목록 */}
          <div style={{ overflowY: 'auto', maxHeight: 220 }}>
            <div
              onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
              style={{
                padding: '6px 9px', cursor: 'pointer', fontSize: 11,
                color: !value ? '#4fc3f7' : '#8b949e',
                background: !value ? '#0e2a3a' : 'transparent',
              }}
              onMouseEnter={e => { if (value) e.currentTarget.style.background = '#1a2332'; }}
              onMouseLeave={e => { if (value) e.currentTarget.style.background = 'transparent'; }}
            >전체 {levelLabel}</div>

            {filtered.map(o => {
              const isSelected = String(value) === String(o.code);
              return (
                <div key={o.code}
                  onClick={() => { onChange(String(o.code)); setOpen(false); setSearch(''); }}
                  style={{
                    padding: '6px 9px', cursor: 'pointer', fontSize: 11,
                    color: isSelected ? '#4fc3f7' : '#c9d1d9',
                    background: isSelected ? '#0e2a3a' : 'transparent',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#1a2332'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? '#0e2a3a' : 'transparent'; }}
                >{o.name}</div>
              );
            })}

            {filtered.length === 0 && (
              <div style={{ padding: '8px 9px', color: '#484f58', fontSize: 11 }}>검색 결과 없음</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/* ── 프로젝트 저장 모달 ── */
const STORAGE_KEY = 'khnp_projects';
function saveProjectToStorage(project) {
  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  localStorage.setItem(STORAGE_KEY, JSON.stringify([project, ...existing]));
}

function ProjectModal({ mapLevel, selectedFilter, placements, gridCells, onClose, onSaved }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const levelLabel = MAP_LEVELS[mapLevel].label;
  const regionLabel = selectedFilter?.name ?? '전체 대한민국';

  const handleSave = () => {
    if (!name.trim()) return;
    const project = {
      id: Date.now().toString(),
      name: name.trim(),
      description: desc.trim(),
      createdAt: new Date().toISOString(),
      region: { level: mapLevel, filter: selectedFilter },
      placements,
      gridGenerated: gridCells.length > 0,
      gridCellCount: gridCells.length,
    };
    saveProjectToStorage(project);
    onSaved(project);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: 24, width: 340,
      }}>
        <p style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 700, margin: '0 0 16px' }}>새 프로젝트 시작</p>
        <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 6, padding: '8px 12px', marginBottom: 14 }}>
          <InfoRow label="지도 레벨" value={levelLabel} />
          <InfoRow label="대상 지역" value={regionLabel} />
          <InfoRow label="시설 배치" value={`${Object.keys(placements).length}개`} />
          <InfoRow label="격자" value={gridCells.length > 0 ? `${gridCells.length}칸` : '미생성'} />
        </div>
        <input
          placeholder="프로젝트명 *" value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#0d1117', border: `1px solid ${name ? '#1f6feb' : '#30363d'}`,
            borderRadius: 5, padding: '8px 10px', color: '#c9d1d9', fontSize: 12,
            marginBottom: 8, outline: 'none',
          }}
        />
        <textarea
          placeholder="설명 (선택)" value={desc} onChange={e => setDesc(e.target.value)} rows={3}
          style={{
            width: '100%', boxSizing: 'border-box', resize: 'none',
            background: '#0d1117', border: '1px solid #30363d',
            borderRadius: 5, padding: '8px 10px', color: '#c9d1d9', fontSize: 12,
            marginBottom: 14, outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSave} disabled={!name.trim()} style={{
            flex: 1, padding: '8px 0', borderRadius: 5, fontWeight: 600, fontSize: 12,
            cursor: name ? 'pointer' : 'not-allowed',
            background: name ? '#1f6feb' : '#21262d', border: 'none',
            color: name ? '#fff' : '#484f58',
          }}>저장</button>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: 5, fontWeight: 600, fontSize: 12, cursor: 'pointer',
            background: 'transparent', border: '1px solid #30363d', color: '#8b949e',
          }}>취소</button>
        </div>
      </div>
    </div>
  );
}

/* GeoJSON 캐시 */
const _geoCache = {};

export default function MapView({ activeProject }) {
  const mapDivRef     = useRef(null);
  const mapRef        = useRef(null);
  const koreaLayerRef = useRef(null);
  const gridLayerRef  = useRef(null);

  const [mapReady,        setMapReady]        = useState(false);
  const [mapLevel,        setMapLevel]        = useState(activeProject?.region?.level ?? 'sido');
  const [selectedFilter,  setSelectedFilter]  = useState(activeProject?.region?.filter ?? null);
  const [filterOptions,   setFilterOptions]   = useState([]);

  const [placements,   setPlacements]   = useState(activeProject?.placements ?? {});
  const [selectedTool, setSelectedTool] = useState(null);
  const [gridVisible,  setGridVisible]  = useState(false);
  const [gridLoading,  setGridLoading]  = useState(false);
  const [gridCells,    setGridCells]    = useState([]);
  const [gridSize,     setGridSize]     = useState(1000);
  const [hoverInfo,    setHoverInfo]    = useState(null);
  const [showModal,    setShowModal]    = useState(false);
  const [savedNotice,  setSavedNotice]  = useState(false);

  const selectedToolRef = useRef(selectedTool);
  const placementsRef   = useRef(placements);
  const gridCellsRef    = useRef(gridCells);
  useEffect(() => { selectedToolRef.current = selectedTool; }, [selectedTool]);
  useEffect(() => { placementsRef.current = placements; }, [placements]);
  useEffect(() => { gridCellsRef.current = gridCells; }, [gridCells]);

  /* ── Leaflet 초기화 ── */
  useEffect(() => {
    if (mapRef.current) return;
    let destroyed = false;
    import('leaflet').then(({ default: L }) => {
      if (destroyed || !mapDivRef.current) return;
      const map = L.map(mapDivRef.current, { zoomControl: true, attributionControl: false });
      mapRef.current = map;
      setTimeout(() => { map.invalidateSize(); setMapReady(true); }, 100);
    });
    return () => {
      destroyed = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  /* ── 레벨 변경 시: 드롭다운 옵션 로드 ── */
  useEffect(() => {
    setFilterOptions([]);
    const levelCfg = MAP_LEVELS[mapLevel];
    const load = async () => {
      if (!_geoCache[mapLevel]) {
        _geoCache[mapLevel] = await fetch(levelCfg.url).then(r => r.json());
      }
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
      if (!_geoCache[mapLevel]) {
        _geoCache[mapLevel] = await fetch(levelCfg.url).then(r => r.json());
      }
      if (cancelled) return;

      const allFeatures = _geoCache[mapLevel].features;
      const features = filterFeatures(allFeatures, levelCfg.codeKey, selectedFilter?.code);
      const filteredGeo = { type: 'FeatureCollection', features };

      if (koreaLayerRef.current) { koreaLayerRef.current.remove(); koreaLayerRef.current = null; }
      if (gridLayerRef.current)  { gridLayerRef.current.remove();  gridLayerRef.current = null; }
      setGridVisible(false); setGridCells([]); setHoverInfo(null);

      const layer = L.geoJSON(filteredGeo, {
        smoothFactor: 0,
        style: { color: '#4fc3f7', weight: 0.5, fill: true, fillColor: '#1a2332', fillOpacity: 1 },
        onEachFeature: (feature, lyr) => {
          lyr.on('mouseover', (e) => {
            lyr.setStyle({ fillColor: '#1e3a4a', weight: 1.2, color: '#7dd3fc' });
            const code = feature.properties[levelCfg.codeKey];
            const name = feature.properties[levelCfg.nameKey];
            const cells = gridCellsRef.current;
            let gridCount = null, facilityCount = null;
            if (cells.length > 0) {
              gridCount = 0; facilityCount = 0;
              const geom = feature.geometry;
              const polys = geom.type === 'MultiPolygon' ? geom.coordinates.flat(1) : geom.coordinates;
              for (const cell of cells) {
                const cLng = cell.lng + cell.dLng / 2, cLat = cell.lat + cell.dLat / 2;
                for (const ring of polys) {
                  if (pointInPolygon(cLng, cLat, ring)) {
                    gridCount++;
                    if (placementsRef.current[cell.key]) facilityCount++;
                    break;
                  }
                }
              }
            }
            setHoverInfo({ name, code: String(code), lat: e.latlng.lat, lng: e.latlng.lng, gridCount, facilityCount });
          });
          lyr.on('mousemove', (e) => setHoverInfo(p => p ? { ...p, lat: e.latlng.lat, lng: e.latlng.lng } : p));
          lyr.on('mouseout', () => { lyr.setStyle({ fillColor: '#1a2332', weight: 0.5, color: '#4fc3f7' }); setHoverInfo(null); });
        },
      }).addTo(mapRef.current);

      koreaLayerRef.current = layer;
      mapRef.current.invalidateSize();
      mapRef.current.fitBounds(layer.getBounds(), { padding: [20, 20] });
    };

    buildLayer();
    return () => { cancelled = true; };
  }, [mapLevel, selectedFilter, mapReady]);

  /* ── 격자 취소 ── */
  const handleRemoveGrid = useCallback(() => {
    if (gridLayerRef.current) { gridLayerRef.current.remove(); gridLayerRef.current = null; }
    setGridVisible(false); setGridCells([]); setPlacements({}); setHoverInfo(null);
  }, []);

  /* ── 격자 생성 ── */
  const handleLoadGrid = useCallback(() => {
    if (!_geoCache[mapLevel]) return;
    setGridLoading(true);
    const levelCfg = MAP_LEVELS[mapLevel];
    setTimeout(async () => {
      const allFeatures = _geoCache[mapLevel].features;
      const features = filterFeatures(allFeatures, levelCfg.codeKey, selectedFilter?.code);
      const result = generateGrid(features, gridSize);
      if (!result.cells) {
        alert(`격자 수가 너무 많습니다 (약 ${Math.round(result.estimatedCells / 10000)}만개 예상).\n더 큰 격자 크기를 선택하거나 지역을 좁혀주세요.`);
        setGridLoading(false);
        return;
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
          const placed = placementsRef.current[cell.key];
          if (!placed) rect.setStyle({ fillOpacity: 0.28, color: '#7dd3fc', weight: 1 });
          setHoverInfo({
            name: cell.props?.[levelCfg.nameKey] ?? '—',
            code: String(cell.props?.[levelCfg.codeKey] ?? '—'),
            lat: e.latlng.lat, lng: e.latlng.lng, gridCount: null, facilityCount: null,
          });
        });
        rect.on('mousemove', (e) => setHoverInfo(p => p ? { ...p, lat: e.latlng.lat, lng: e.latlng.lng } : p));
        rect.on('mouseout', () => {
          const placed = placementsRef.current[cell.key];
          rect.setStyle(placed
            ? { color: FACILITY_TYPES[placed.type].color, fillColor: FACILITY_TYPES[placed.type].color, fillOpacity: 0.6 }
            : defaultStyle);
          setHoverInfo(null);
        });
        rect.on('click', () => {
          const tool = selectedToolRef.current;
          if (!tool) return;
          const key = cell.key;
          const prev = placementsRef.current;
          const next = prev[key]?.type === tool
            ? (({ [key]: _, ...rest }) => rest)(prev)
            : { ...prev, [key]: { type: tool } };
          placementsRef.current = next;
          setPlacements(next);
          const placed = next[key];
          rect.setStyle(placed
            ? { color: FACILITY_TYPES[placed.type].color, fillColor: FACILITY_TYPES[placed.type].color, fillOpacity: 0.6 }
            : defaultStyle);
        });
        layerGroup.addLayer(rect);
      });
      layerGroup.addTo(mapRef.current);
      gridLayerRef.current = layerGroup;
      setGridVisible(true);
      setGridLoading(false);
    }, 50);
  }, [mapLevel, selectedFilter, gridSize]);

  const facilityCount = Object.values(placements).reduce((acc, p) => {
    acc[p.type] = (acc[p.type] || 0) + 1; return acc;
  }, {});

  const handleLevelChange = (level) => {
    setMapLevel(level);
    setSelectedFilter(null);
    setGridVisible(false); setGridCells([]); setPlacements({});
  };

  const handleFilterChange = (code) => {
    const item = code ? (filterOptions.find(o => String(o.code) === code) ?? null) : null;
    setSelectedFilter(item);
    setGridVisible(false); setGridCells([]); setPlacements({});
  };

  const handleProjectSaved = () => {
    setShowModal(false);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative' }}>

      {/* 좌측 패널 */}
      <div style={{
        width: 185, flexShrink: 0, background: '#161b22',
        borderRight: '1px solid #30363d',
        display: 'flex', flexDirection: 'column', gap: 5, padding: 12, overflowY: 'auto',
      }}>
        <p style={{ color: '#8b949e', fontSize: 10, fontWeight: 700, letterSpacing: 1, margin: 0 }}>지도 설정</p>

        {/* 레벨 선택 */}
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

        {/* 레벨별 검색 드롭다운 */}
        {filterOptions.length > 0 && (
          <SearchableSelect
            options={filterOptions}
            value={selectedFilter?.code ?? ''}
            onChange={handleFilterChange}
            levelLabel={MAP_LEVELS[mapLevel].label}
          />
        )}

        <div style={{ borderTop: '1px solid #30363d', margin: '2px 0' }} />

        {/* 시설 배치 */}
        <p style={{ color: '#8b949e', fontSize: 10, fontWeight: 700, letterSpacing: 1, margin: 0 }}>시설 배치</p>
        {Object.entries(FACILITY_TYPES).map(([key, f]) => (
          <button key={key} onClick={() => setSelectedTool(prev => prev === key ? null : key)} style={{
            background: selectedTool === key ? f.color + '22' : '#0d1117',
            border: `1px solid ${selectedTool === key ? f.color : '#30363d'}`,
            borderRadius: 5, padding: '6px 8px', cursor: 'pointer',
            color: selectedTool === key ? f.color : '#c9d1d9', textAlign: 'left', fontSize: 11,
          }}>
            <div style={{ fontWeight: 600 }}>{f.label}</div>
            <div style={{ color: '#8b949e', fontSize: 9 }}>{f.cells}칸 점유</div>
          </button>
        ))}

        {/* 격자 버튼 */}
        <div style={{ borderTop: '1px solid #30363d', paddingTop: 8, marginTop: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
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
            {gridLoading ? '생성 중...' : gridVisible
              ? `격자 ${gridCells.length}개 표시 중`
              : `${gridSize >= 1000 ? `${gridSize / 1000}km` : `${gridSize}m`} 격자 표시`}
          </button>
          {gridVisible && (
            <button onClick={handleRemoveGrid} style={{
              width: '100%', background: 'transparent', border: '1px solid #6e3030',
              borderRadius: 5, padding: '5px 0', cursor: 'pointer', color: '#f85149', fontSize: 11, fontWeight: 600,
            }}>격자 취소</button>
          )}
        </div>

        {/* 배치 현황 */}
        {Object.keys(facilityCount).length > 0 && (
          <div style={{ borderTop: '1px solid #30363d', paddingTop: 8 }}>
            <p style={{ color: '#8b949e', fontSize: 10, fontWeight: 700, margin: '0 0 4px' }}>배치 현황</p>
            {Object.entries(facilityCount).map(([type, count]) => (
              <div key={type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#c9d1d9', marginBottom: 2 }}>
                <span style={{ color: FACILITY_TYPES[type].color }}>{FACILITY_TYPES[type].label}</span>
                <span>{count}개</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => { setPlacements({}); setSelectedTool(null); }} style={{
          marginTop: 'auto', background: 'transparent', border: '1px solid #30363d',
          borderRadius: 5, padding: '5px 8px', color: '#f85149', cursor: 'pointer', fontSize: 11,
        }}>전체 초기화</button>
      </div>

      {/* 지도 영역 */}
      <div style={{ flex: 1, position: 'relative', background: '#0d1117' }}>
        <div ref={mapDivRef} style={{ position: 'absolute', inset: 0 }} />
        <InfoPanel info={hoverInfo} />

        {/* Start Project 버튼 */}
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000, display: 'flex', alignItems: 'center', gap: 8 }}>
          {savedNotice && (
            <div style={{
              background: '#1a3a1a', border: '1px solid #2ea043', borderRadius: 5,
              padding: '6px 12px', color: '#3fb950', fontSize: 11, fontWeight: 600,
            }}>✓ 프로젝트 저장됨</div>
          )}
          <button onClick={() => setShowModal(true)} style={{
            background: '#238636', border: '1px solid #2ea043', borderRadius: 5,
            padding: '7px 14px', color: '#fff', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(35,134,54,0.3)',
          }}>▶ Start Project</button>
        </div>
      </div>

      {/* 저장 모달 */}
      {showModal && (
        <ProjectModal
          mapLevel={mapLevel}
          selectedFilter={selectedFilter}
          placements={placements}
          gridCells={gridCells}
          onClose={() => setShowModal(false)}
          onSaved={handleProjectSaved}
        />
      )}
    </div>
  );
}
