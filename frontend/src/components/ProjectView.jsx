import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';

const STORAGE_KEY = 'khnp_projects';
const MAP_LEVELS  = {
  sido:    { label: '시도',   url: '/korea_sido.geojson',    codeKey: 'SIDO_CD',    nameKey: 'SIDO_NM' },
  sigungu: { label: '시군구', url: '/korea_sigungu.geojson', codeKey: 'SIGUNGU_CD', nameKey: 'SIGUNGU_NM' },
  emd:     { label: '읍면동', url: '/korea_emd.geojson',     codeKey: 'ADM_CD',     nameKey: 'ADM_NM' },
};

/* ── 핀 타입 정의 ── */
const PIN_TYPES = {
  demand:  { label: '수요지', color: '#ef4444', unit: 'kg/일',  unitLabel: 'H₂ 수요량',  shape: 'demand'  },
  supply:  { label: '원료',   color: '#38bdf8', unit: 'm³/일',  unitLabel: '공급 가능량', shape: 'supply'  },
  pv:      { label: 'PV',    color: '#fbbf24', unit: 'MW',     unitLabel: '설비 용량',   shape: 'pv'      },
  wind:    { label: '풍력',   color: '#34d399', unit: 'MW',     unitLabel: '설비 용량',   shape: 'wind'    },
  nuclear: { label: '원전',   color: '#c084fc', unit: 'MW',     unitLabel: '발전 용량',   shape: 'nuclear' },
  factory: { label: '공장',   color: '#f97316', unit: 'kg/일',  unitLabel: '생산 용량',   shape: 'factory' },
};

/* ── SVG 아이콘 경로 (32×32 viewBox) ── */
function _pinSvgBody(shape, c) {
  switch (shape) {
    case 'demand': return `
      <path d="M16 2C10 2 5 7.5 5 14c0 8 11 20 11 20s11-12 11-20C27 7.5 22 2 16 2Z" fill="${c}" stroke="white" stroke-width="2"/>
      <text x="16" y="17" text-anchor="middle" font-size="9" font-weight="900" fill="white" font-family="sans-serif">H₂</text>`;
    case 'supply': return `
      <path d="M16 2C16 2 5 13 5 20a11 11 0 0 0 22 0C27 13 16 2 16 2Z" fill="${c}" stroke="white" stroke-width="2"/>
      <path d="M9 19q3.5-3.5 7 0t7 0" fill="none" stroke="white" stroke-width="1.8" opacity=".85" stroke-linecap="round"/>
      <path d="M10 23q3 -2.5 6 0t6 0" fill="none" stroke="white" stroke-width="1.2" opacity=".5" stroke-linecap="round"/>`;
    case 'pv': return `
      <rect x="4" y="6" width="24" height="18" rx="2" fill="${c}" stroke="white" stroke-width="2"/>
      <line x1="4" y1="12" x2="28" y2="12" stroke="white" stroke-width="1" opacity=".55"/>
      <line x1="4" y1="18" x2="28" y2="18" stroke="white" stroke-width="1" opacity=".55"/>
      <line x1="12" y1="6" x2="12" y2="24" stroke="white" stroke-width="1" opacity=".55"/>
      <line x1="20" y1="6" x2="20" y2="24" stroke="white" stroke-width="1" opacity=".55"/>
      <text x="16" y="30" text-anchor="middle" font-size="7" font-weight="700" fill="${c}" font-family="sans-serif">PV</text>`;
    case 'wind': return `
      <circle cx="16" cy="15" r="12" fill="${c}" stroke="white" stroke-width="2"/>
      <circle cx="16" cy="15" r="2.5" fill="white"/>
      <path d="M16 12.5L15 4Q16 2 17 4Z" fill="white" opacity=".9"/>
      <path d="M13.8 16.5L7 21Q5.5 22.5 8 23Z" fill="white" opacity=".9"/>
      <path d="M18.2 16.5L25 21Q26.5 22.5 24 23Z" fill="white" opacity=".9"/>`;
    case 'nuclear': return `
      <polygon points="16,2 26,8 26,22 16,28 6,22 6,8" fill="${c}" stroke="white" stroke-width="2"/>
      <circle cx="16" cy="15" r="3" fill="white"/>
      <ellipse cx="16" cy="15" rx="9.5" ry="4" fill="none" stroke="white" stroke-width="1.5"/>
      <ellipse cx="16" cy="15" rx="9.5" ry="4" fill="none" stroke="white" stroke-width="1.5" transform="rotate(60 16 15)"/>
      <ellipse cx="16" cy="15" rx="9.5" ry="4" fill="none" stroke="white" stroke-width="1.5" transform="rotate(-60 16 15)"/>`;
    case 'factory': return `
      <rect x="5" y="16" width="22" height="14" rx="1" fill="${c}" stroke="white" stroke-width="2"/>
      <rect x="7" y="9" width="6" height="9" fill="${c}" stroke="white" stroke-width="1.5"/>
      <rect x="15" y="12" width="5" height="6" fill="${c}" stroke="white" stroke-width="1.5"/>
      <rect x="8" y="20" width="4" height="6" rx=".5" fill="white" opacity=".55"/>
      <rect x="16" y="20" width="4" height="6" rx=".5" fill="white" opacity=".55"/>
      <circle cx="10" cy="7" r="2.5" fill="white" opacity=".4"/>
      <circle cx="18" cy="10" r="2" fill="white" opacity=".35"/>`;
    default: return `<circle cx="16" cy="16" r="11" fill="${c}" stroke="white" stroke-width="2"/>`;
  }
}

function makePinIcon(L, type) {
  const cfg = PIN_TYPES[type];
  const html = `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 5px rgba(0,0,0,0.55))">${_pinSvgBody(cfg.shape, cfg.color)}</svg>`;
  return L.divIcon({ html, className: '', iconSize: [32, 32], iconAnchor: [16, 16] });
}

/* 최적화 결과 자동 공장 아이콘 (보라색 + ★ 배지) */
function makeAutoFactoryIcon(L) {
  const c = '#a855f7';
  const html = `<svg width="38" height="38" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 8px rgba(168,85,247,0.6))">
    <rect x="6" y="18" width="24" height="16" rx="1" fill="${c}" stroke="white" stroke-width="2"/>
    <rect x="8" y="10" width="7" height="10" fill="${c}" stroke="white" stroke-width="1.5"/>
    <rect x="17" y="13" width="6" height="7" fill="${c}" stroke="white" stroke-width="1.5"/>
    <rect x="9" y="23" width="5" height="7" rx=".5" fill="white" opacity=".55"/>
    <rect x="19" y="23" width="5" height="7" rx=".5" fill="white" opacity=".55"/>
    <circle cx="11.5" cy="8" r="3" fill="white" opacity=".4"/>
    <circle cx="20" cy="11" r="2.2" fill="white" opacity=".35"/>
    <circle cx="31" cy="7" r="7" fill="#fbbf24" stroke="white" stroke-width="1.5"/>
    <text x="31" y="10.5" text-anchor="middle" font-size="9" font-weight="900" fill="#0d1117" font-family="sans-serif">★</text>
  </svg>`;
  return L.divIcon({ html, className: '', iconSize: [38, 38], iconAnchor: [16, 19] });
}

function loadProjects() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}
function saveProjects(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

const PIN_STATE_KEY = 'khnp_pin_state';
function loadPinState(projectId) {
  try { return JSON.parse(localStorage.getItem(`${PIN_STATE_KEY}_${projectId}`) || 'null'); }
  catch { return null; }
}
function savePinState(projectId, state) {
  try { localStorage.setItem(`${PIN_STATE_KEY}_${projectId}`, JSON.stringify(state)); }
  catch {}
}
function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function pointInPolygon(lng, lat, coords) {
  let inside = false;
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const [xi, yi] = coords[i], [xj, yj] = coords[j];
    if (((yi > lat) !== (yj > lat)) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function filterFeatures(features, codeKey, code) {
  if (!code) return features;
  return features.filter(f => String(f.properties[codeKey] ?? '') === String(code));
}

function generateGrid(features, gridSizeMeters = 1000) {
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  const featureRings = features.map(f => {
    const geom = f.geometry;
    if (!geom) return { props: f.properties, rings: [] };
    const polys = geom.type === 'MultiPolygon' ? geom.coordinates.flat(1) : geom.coordinates;
    for (const ring of polys) for (const [lng, lat] of ring) {
      if (lng < minLng) minLng = lng; if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
    }
    return { props: f.properties, rings: polys };
  });
  const dLat = gridSizeMeters / 111000;
  const dLng = dLat / Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
  if (Math.ceil((maxLng-minLng)/dLng) * Math.ceil((maxLat-minLat)/dLat) > 500000)
    return { cells: null };
  const cells = [];
  let row = 0;
  for (let lat = minLat; lat < maxLat; lat += dLat, row++) {
    let col = 0;
    for (let lng = minLng; lng < maxLng; lng += dLng, col++) {
      const cLng = lng + dLng / 2, cLat = lat + dLat / 2;
      for (const { props, rings } of featureRings) {
        let found = false;
        for (const ring of rings) { if (pointInPolygon(cLng, cLat, ring)) { found = true; break; } }
        if (found) { cells.push({ key: `${lng.toFixed(5)}_${lat.toFixed(5)}`, lat, lng, dLat, dLng, props, row, col }); break; }
      }
    }
  }
  return { cells };
}

function scoreToColor(t) {
  const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
  if (t < 0.5) {
    const s = t * 2;
    return `rgb(${clamp(34+200*s)},${clamp(197-18*s)},${clamp(94-86*s)})`;
  }
  const s = (t - 0.5) * 2;
  return `rgb(${clamp(234+5*s)},${clamp(179-111*s)},${clamp(8+60*s)})`;
}

function findContiguousRegion(cells, scores, N, startKey = null) {
  if (!cells.length || N <= 0) return [];
  const cellByRC  = new Map(cells.map(c => [`${c.row},${c.col}`, c]));
  const cellByKey = new Map(cells.map(c => [c.key, c]));
  const sorted = [...cells].sort((a, b) => (scores[a.key] ?? Infinity) - (scores[b.key] ?? Infinity));
  const seed = (startKey && cellByKey.has(startKey)) ? startKey : sorted[0].key;
  const selected = new Set([seed]);
  const getCandidates = () => {
    const cands = new Map();
    for (const key of selected) {
      const c = cellByKey.get(key);
      if (!c) continue;
      for (const nb of [cellByRC.get(`${c.row-1},${c.col}`), cellByRC.get(`${c.row+1},${c.col}`), cellByRC.get(`${c.row},${c.col-1}`), cellByRC.get(`${c.row},${c.col+1}`)]) {
        if (nb && !selected.has(nb.key)) cands.set(nb.key, scores[nb.key] ?? Infinity);
      }
    }
    return cands;
  };
  while (selected.size < N) {
    const cands = getCandidates();
    if (!cands.size) break;
    let bestKey = null, bestScore = Infinity;
    for (const [key, score] of cands) { if (score < bestScore) { bestScore = score; bestKey = key; } }
    if (!bestKey) break;
    selected.add(bestKey);
  }
  return [...selected];
}

const _geoCache = {};

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
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

/* ── Project Detail ── */
function ProjectDetail({ project, onProjectUpdated }) {
  const mapDivRef       = useRef(null);
  const mapRef          = useRef(null);
  const leafletRef      = useRef(null);
  const gridLayerRef    = useRef(null);
  const boundaryLayerRef = useRef(null);   // GeoJSON 경계 레이어
  const overlayLayerRef  = useRef(null);   // OSM 타일 오버레이
  const maskLayerRef     = useRef(null);   // 역마스크 폴리곤
  const rectsRef        = useRef(new Map());
  const pinMarkersRef   = useRef(new Map());
  const routeLayersRef  = useRef([]);

  const autoFactoryMarkersRef = useRef([]);

  const accessibleKeysRef    = useRef(null); // null = 필터 없음, Set = 도로 접근 가능 셀 키
  const roadNetworkLayerRef  = useRef([]);   // 도로망 시각화 레이어 목록
  const gridReadyRef         = useRef(false); // grid 생성 완료 후 true → auto-save 활성화

  const [mapReady,        setMapReady]        = useState(false);
  const [overlayVisible,  setOverlayVisible]  = useState(false);
  const [heatmapVisible,  setHeatmapVisible]  = useState(true);
  const heatmapVisibleRef = useRef(true);
  useEffect(() => { heatmapVisibleRef.current = heatmapVisible; }, [heatmapVisible]);
  const [gridCells,      setGridCells]      = useState([]);
  const [gridLoading,    setGridLoading]    = useState(false);
  const [roadFiltering,     setRoadFiltering]     = useState(false);
  const [roadFilterInfo,    setRoadFilterInfo]    = useState(null); // { total, accessible } | null
  const [roadNetworkVisible, setRoadNetworkVisible] = useState(false);
  const [roadNetworkLoading, setRoadNetworkLoading] = useState(false);
  const [pins,          setPins]          = useState([]);
  const [placingPin,    setPlacingPin]    = useState(null);
  const [transportCost, setTransportCost] = useState(1.0);
  const [optimizing,    setOptimizing]    = useState(false);
  const [scores,        setScores]        = useState({});
  const [selectedKeys,  setSelectedKeys]  = useState([]);
  const [optMethod,     setOptMethod]     = useState(null);
  const [snapPins,      setSnapPins]      = useState([]); // 백엔드의 pin 스냅 포인트
  const [supplyAlloc,   setSupplyAlloc]   = useState([]); // [{pin, allocated, needed, distToBest}]

  const placingPinRef = useRef(null);
  const gridCellsRef  = useRef([]);
  const pinsRef       = useRef([]);
  useEffect(() => { placingPinRef.current = placingPin; }, [placingPin]);
  useEffect(() => { gridCellsRef.current  = gridCells;  }, [gridCells]);
  useEffect(() => { pinsRef.current       = pins;       }, [pins]);

  /* ── 핀 순번 맵 (같은 타입 핀에 1, 2, 3 … 번호 부여) ── */
  const pinSeqMap = useMemo(() => {
    const map = {}, counts = {};
    pins.forEach(pin => {
      counts[pin.type] = (counts[pin.type] || 0) + 1;
      map[pin.id] = counts[pin.type];
    });
    return map;
  }, [pins]);

  /* ── 핀 번호 툴팁 업데이트 ── */
  useEffect(() => {
    if (!mapReady) return;
    const counts = {};
    pins.forEach(pin => {
      counts[pin.type] = (counts[pin.type] || 0) + 1;
      const marker = pinMarkersRef.current.get(pin.id);
      if (!marker) return;
      const label = `${PIN_TYPES[pin.type].label} ${counts[pin.type]}`;
      marker.unbindTooltip();
      marker.bindTooltip(label, { permanent: true, direction: 'top', offset: [0, -14] });
    });
  }, [pins, mapReady]);

  /* ── 프로젝트 상태 자동 저장 (grid 준비된 후에만) ── */
  useEffect(() => {
    if (!gridReadyRef.current) return;
    savePinState(project.id, { pins, scores, selectedKeys, optMethod, gridSize });
  }, [pins, scores, selectedKeys, optMethod]); // eslint-disable-line

  const totalFlowArea  = (project.flows || []).reduce((s, f) => s + (f.totalArea || 0), 0);
  const gridSize       = project.gridSize || 1000;
  const gridCellAreaM2 = gridSize * gridSize;
  const requiredCells  = totalFlowArea > 0 ? Math.ceil(totalFlowArea / gridCellAreaM2) : 0;

  /* ── Leaflet init ── */
  useEffect(() => {
    let destroyed = false;
    import('leaflet').then(({ default: L }) => {
      if (destroyed || !mapDivRef.current) return;
      leafletRef.current = L;
      const map = L.map(mapDivRef.current, { zoomControl: true, attributionControl: false });
      map.createPane('terrain').style.zIndex = 250;
      map.createPane('mask').style.zIndex    = 350;
      mapRef.current = map;
      setTimeout(() => { map.invalidateSize(); setMapReady(true); }, 120);
    });
    return () => {
      destroyed = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  /* ── Load GeoJSON + grid ── */
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    let cancelled = false;

    gridReadyRef.current = false;
    setGridCells([]); setScores({}); setSelectedKeys([]); setOptMethod(null);
    setSnapPins([]); setSupplyAlloc([]);
    setRoadFilterInfo(null); accessibleKeysRef.current = null;
    roadNetworkLayerRef.current.forEach(l => l.remove()); roadNetworkLayerRef.current = [];
    setRoadNetworkVisible(false);
    pinMarkersRef.current.forEach(m => m.remove()); pinMarkersRef.current.clear();
    autoFactoryMarkersRef.current.forEach(m => m.remove()); autoFactoryMarkersRef.current = [];
    setPins([]); setPlacingPin(null);
    if (gridLayerRef.current)   { gridLayerRef.current.remove();   gridLayerRef.current = null; }
    if (overlayLayerRef.current){ overlayLayerRef.current.remove(); overlayLayerRef.current = null; }
    if (maskLayerRef.current)   { maskLayerRef.current.remove();   maskLayerRef.current = null; }
    boundaryLayerRef.current = null;
    rectsRef.current.clear();
    routeLayersRef.current.forEach(l => l.remove()); routeLayersRef.current = [];
    mapRef.current.eachLayer(l => { if (l.feature !== undefined || l._latlngs) mapRef.current.removeLayer(l); });

    const level  = project.region?.level  ?? 'sido';
    const filter = project.region?.filter ?? null;
    const cfg    = MAP_LEVELS[level];

    const build = async () => {
      const { default: L } = await import('leaflet');
      if (cancelled || !mapRef.current) return;

      if (!_geoCache[level]) _geoCache[level] = await fetch(cfg.url).then(r => r.json());
      if (cancelled || !mapRef.current) return;

      const features = filterFeatures(_geoCache[level].features, cfg.codeKey, filter?.code);
      const boundary = L.geoJSON({ type: 'FeatureCollection', features }, {
        smoothFactor: 0,
        style: { color: '#4fc3f7', weight: 1.2, fill: true, fillColor: '#0e1a2e', fillOpacity: 1 },
      }).addTo(mapRef.current);
      boundaryLayerRef.current = boundary;
      if (boundary.getBounds().isValid()) mapRef.current.fitBounds(boundary.getBounds(), { padding: [20, 20] });
      if (cancelled) return;

      setGridLoading(true);
      await new Promise(r => setTimeout(r, 30));
      if (cancelled) return;

      const result = generateGrid(features, gridSize);
      if (!result.cells || cancelled) { setGridLoading(false); return; }
      const cells = result.cells;
      setGridCells(cells);

      const layerGroup = L.layerGroup();
      cells.forEach(cell => {
        const defStyle = { color: '#4fc3f7', weight: 0.5, fillColor: '#4fc3f7', fillOpacity: 0.10 };
        const rect = L.rectangle([[cell.lat, cell.lng], [cell.lat + cell.dLat, cell.lng + cell.dLng]], { ...defStyle });
        rectsRef.current.set(cell.key, rect);
        layerGroup.addLayer(rect);
      });
      layerGroup.addTo(mapRef.current);
      gridLayerRef.current = layerGroup;
      setGridLoading(false);

      /* ── 저장된 핀/점수 복원 ── */
      const saved = loadPinState(project.id);
      if (saved?.pins?.length > 0 && saved.gridSize === gridSize) {
        saved.pins.forEach(pin => {
          const marker = L.marker([pin.lat, pin.lng], { icon: makePinIcon(L, pin.type) })
            .addTo(mapRef.current);
          marker.on('click', (ev) => {
            L.DomEvent.stopPropagation(ev);
            marker.remove();
            pinMarkersRef.current.delete(pin.id);
            setPins(p => p.filter(x => x.id !== pin.id));
          });
          pinMarkersRef.current.set(pin.id, marker);
        });
        setPins(saved.pins);

        if (saved.scores && Object.keys(saved.scores).length > 0) {
          const newScores = saved.scores;
          const vals = Object.values(newScores).filter(v => isFinite(v));
          if (vals.length > 0) {
            const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
            rectsRef.current.forEach((rect, key) => {
              const s = newScores[key]; if (s == null) return;
              const t = (s - min) / range;
              rect.setStyle({ fillColor: scoreToColor(t), fillOpacity: 0.65, color: scoreToColor(t), weight: 0.3 });
            });
          }
          const keySet = new Set(saved.selectedKeys || []);
          rectsRef.current.forEach((rect, key) => {
            if (keySet.has(key)) rect.setStyle({ color: '#a3e635', fillColor: '#a3e635', fillOpacity: 0.85, weight: 2 });
          });
          setScores(newScores);
          setSelectedKeys(saved.selectedKeys || []);
          setOptMethod(saved.optMethod);
        }
      }
      gridReadyRef.current = true;
    };

    build();
    return () => { cancelled = true; };
  }, [mapReady, project.id, gridSize]);

  /* ── 핀 배치 클릭 핸들러 (mapReady 의존) ── */
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;

    const handler = (e) => {
      const type = placingPinRef.current;
      if (!type) return;

      const cells = gridCellsRef.current;
      let { lat, lng } = e.latlng;

      /* 격자 스냅: 클릭한 좌표가 속한 셀의 중심으로 이동 */
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

      const id  = Date.now();
      const icon = makePinIcon(L, type);

      const marker = L.marker([lat, lng], { icon })
        .addTo(mapRef.current);

      marker.on('click', (ev) => {
        L.DomEvent.stopPropagation(ev);
        marker.remove();
        pinMarkersRef.current.delete(id);
        setPins(p => p.filter(x => x.id !== id));
      });

      pinMarkersRef.current.set(id, marker);
      setPins(p => [...p, { id, lat, lng, type, quantity: 0 }]);
    };

    mapRef.current.on('click', handler);
    return () => { mapRef.current?.off('click', handler); };
  }, [mapReady]);

  /* ── 히트맵 ON/OFF 토글 ── */
  useEffect(() => {
    if (!Object.keys(scores).length) return;
    const vals = Object.values(scores).filter(v => isFinite(v));
    const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
    if (heatmapVisible) {
      rectsRef.current.forEach((rect, key) => {
        const s = scores[key]; if (s == null) return;
        const t = (s - min) / range;
        rect.setStyle({ fillColor: scoreToColor(t), fillOpacity: 0.65, color: scoreToColor(t), weight: 0.3 });
      });
      const keySet = new Set(selectedKeys);
      if (keySet.size > 0) {
        rectsRef.current.forEach((rect, key) => {
          if (keySet.has(key)) rect.setStyle({ color: '#a3e635', fillColor: '#a3e635', fillOpacity: 0.85, weight: 2 });
        });
      }
    } else {
      rectsRef.current.forEach(rect => rect.setStyle({ color: '#4fc3f7', weight: 0.4, fillColor: '#4fc3f7', fillOpacity: 0.06 }));
    }
  }, [heatmapVisible]); // eslint-disable-line

  /* ── ESC 취소 ── */
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setPlacingPin(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ── OSM 지형 오버레이 토글 ── */
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;

    if (overlayVisible) {
      /* OSM 타일 (terrain pane: z-index 250) — bounds로 한국 외부 타일 로드 차단 */
      if (!overlayLayerRef.current) {
        const bounds = boundaryLayerRef.current?.getBounds();
        overlayLayerRef.current = L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          { pane: 'terrain', opacity: 0.9, attribution: '© OpenStreetMap contributors', ...(bounds ? { bounds } : {}) }
        ).addTo(mapRef.current);
      }
      /* 역마스크 (mask pane: z-index 350) — 지역 바깥을 다시 어둡게 덮음 */
      if (boundaryLayerRef.current && !maskLayerRef.current) {
        maskLayerRef.current = buildMaskPolygon(L, boundaryLayerRef.current, 'mask')
          .addTo(mapRef.current);
      }
      /* 경계 GeoJSON 채우기 완전 투명 (테두리만 남김, overlayPane z-index 400) */
      boundaryLayerRef.current?.setStyle({ fillOpacity: 0 });
    } else {
      overlayLayerRef.current?.remove(); overlayLayerRef.current = null;
      maskLayerRef.current?.remove();    maskLayerRef.current = null;
      boundaryLayerRef.current?.setStyle({ fillOpacity: 1, fillColor: '#0e1a2e' });
    }
  }, [overlayVisible, mapReady]);

  /* ── 최적화 ── */
  const handleOptimize = useCallback(async () => {
    if (!gridCells.length || !pins.length) return;
    setOptimizing(true);

    routeLayersRef.current.forEach(l => l.remove()); routeLayersRef.current = [];
    autoFactoryMarkersRef.current.forEach(m => m.remove()); autoFactoryMarkersRef.current = [];

    try {
      /* factory 핀은 입지 계산에서 제외 (공장 위치를 찾는 것이 목적) */
      const calcPins = pins.filter(p => p.type === 'demand' || p.type === 'supply');
      /* 도로 필터가 켜져 있으면 접근 가능한 셀만 최적화에 포함 */
      const activeCells = accessibleKeysRef.current
        ? gridCells.filter(c => accessibleKeysRef.current.has(c.key))
        : gridCells;
      const cellData = activeCells.map(c => ({ key: c.key, lat: c.lat + c.dLat/2, lng: c.lng + c.dLng/2 }));
      const resp = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cells: cellData, pins: calcPins.map(p => ({ ...p, weight: p.quantity || 1 })) }),
      });
      if (!resp.ok) throw new Error(`서버 오류 ${resp.status}`);
      const data = await resp.json();
      const newScores   = data.scores;
      const milpResult  = data.milp_result ?? null; // HiGHS MIP result (may be null)
      setScores(newScores);
      setOptMethod(data.method + (milpResult ? '+highs' : ''));
      setSnapPins(data.snap_pins || []);

      /* 히트맵 색상 (heatmapVisible ON 시에만) */
      const vals = Object.values(newScores).filter(v => isFinite(v));
      const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
      if (heatmapVisibleRef.current) {
        rectsRef.current.forEach((rect, key) => {
          const s = newScores[key]; if (s == null) return;
          const t = (s - min) / range;
          rect.setStyle({ fillColor: scoreToColor(t), fillOpacity: 0.65, color: scoreToColor(t), weight: 0.3 });
        });
      }

      /* MIP best key가 있으면 해당 셀 기준으로 연속 구역 탐색 */
      const milpBestKey = milpResult?.best_key ?? null;
      const keys = requiredCells > 0
        ? findContiguousRegion(activeCells, newScores, requiredCells, milpBestKey)
        : [milpBestKey ?? Object.entries(newScores).sort((a,b) => a[1]-b[1])[0]?.[0]].filter(Boolean);

      if (keys.length > 0) {
        setSelectedKeys(keys);
        if (heatmapVisibleRef.current) {
          const keySet = new Set(keys);
          rectsRef.current.forEach((rect, key) => {
            if (keySet.has(key)) rect.setStyle({ color: '#a3e635', fillColor: '#a3e635', fillOpacity: 0.85, weight: 2 });
          });
        }

        const bestKey  = keys.reduce((b, k) => (newScores[k] ?? Infinity) < (newScores[b] ?? Infinity) ? k : b, keys[0]);
        const bestCell = gridCells.find(c => c.key === bestKey);

        if (bestCell && mapRef.current && leafletRef.current) {
          const L    = leafletRef.current;
          const bLat = bestCell.lat + bestCell.dLat / 2;
          const bLng = bestCell.lng + bestCell.dLng / 2;

          /* 자동 공장 마커: 수동 공장 용량이 수요를 충족 못 하거나 없을 때 */
          const totalDemand  = pins.filter(p => p.type === 'demand').reduce((s, p) => s + (p.quantity || 0), 0);
          const factoryCap   = pins.filter(p => p.type === 'factory').reduce((s, p) => s + (p.quantity || 0), 0);
          const hasFactory   = pins.some(p => p.type === 'factory');
          const needAuto     = !hasFactory || (totalDemand > 0 && factoryCap < totalDemand);

          if (needAuto) {
            const autoMarker = L.marker([bLat, bLng], { icon: makeAutoFactoryIcon(L), zIndexOffset: 1000 })
              .addTo(mapRef.current)
              .bindPopup(`<b style="color:#a855f7">최적 입지 공장 (자동)</b><br/><span style="font-size:11px">위도 ${bLat.toFixed(4)}, 경도 ${bLng.toFixed(4)}</span>`);
            autoFactoryMarkersRef.current.push(autoMarker);
          }

          /* ── 원료 수급 계획: HiGHS MIP 결과 우선, greedy fallback ── */
          let allocation;
          if (milpResult?.supply_alloc?.length) {
            allocation = milpResult.supply_alloc
              .map(item => {
                const pin = pins.find(p => p.id === item.pin_id);
                if (!pin) return null;
                return {
                  pin,
                  allocated:  item.allocated,
                  needed:     item.needed,
                  distToBest: haversineM(bLat, bLng, pin.lat, pin.lng),
                };
              })
              .filter(Boolean)
              .sort((a, b) => a.distToBest - b.distToBest);
          } else {
            const supplyPins  = pins.filter(p => p.type === 'supply');
            const waterNeeded = totalDemand * 0.009;
            const sortedSup   = [...supplyPins].sort(
              (a, b) => haversineM(bLat, bLng, a.lat, a.lng) - haversineM(bLat, bLng, b.lat, b.lng)
            );
            let remaining = waterNeeded;
            allocation = sortedSup.map(pin => {
              const distM    = haversineM(bLat, bLng, pin.lat, pin.lng);
              const avail    = pin.quantity || 0;
              const allocate = Math.min(avail, Math.max(0, remaining));
              remaining     -= allocate;
              return { pin, allocated: allocate, needed: allocate > 0, distToBest: distM };
            });
          }
          setSupplyAlloc(allocation);

          /* 원료 마커 투명도: 수급 필요 → 불투명, 불필요 → 반투명 */
          allocation.forEach(({ pin, needed }) => {
            const marker = pinMarkersRef.current.get(pin.id);
            if (marker) marker.setOpacity(needed ? 1.0 : 0.32);
          });

          /* 필요 원료 pin id 집합 (경로 색상 구분용) */
          const neededSupplyIds = new Set(allocation.filter(a => a.needed).map(a => a.pin.id));

          /* 경로 표시 */
          if (data.method === 'osrm') {
            /* 최적 셀 → 도로 스냅 포인트 (직선 마지막 구간) */
            let cellSnap = null;
            try {
              const nr = await fetch(`http://localhost:5000/nearest/v1/driving/${bLng},${bLat}?number=1`).then(r => r.json());
              if (nr.waypoints?.[0]) {
                const wp = nr.waypoints[0];
                cellSnap = { lat: wp.location[1], lng: wp.location[0], dist: wp.distance };
              }
            } catch { /* skip */ }
            const SNAP_THRESHOLD = 100; // 100m 미만은 마지막 구간 생략
            if (cellSnap && cellSnap.dist > SNAP_THRESHOLD) {
              routeLayersRef.current.push(L.polyline([[bLat, bLng], [cellSnap.lat, cellSnap.lng]], {
                color: '#94a3b8', weight: 1.5, opacity: 0.75, dashArray: '4,4'
              }).addTo(mapRef.current));
            }

            for (let j = 0; j < calcPins.length; j++) {
              const pin       = calcPins[j];
              const isSupply  = pin.type === 'supply';
              const pinNeeded = !isSupply || neededSupplyIds.has(pin.id);

              if (pinNeeded) {
                /* 수급 필요 핀 → 초록 도로망 경로 */
                try {
                  const rd = await fetch(`http://localhost:5000/route/v1/driving/${bLng},${bLat};${pin.lng},${pin.lat}?overview=full&geometries=geojson`).then(r => r.json());
                  if (rd.routes?.[0]) routeLayersRef.current.push(L.geoJSON(rd.routes[0].geometry, { style: { color: '#22c55e', weight: 3.5, opacity: 0.9 } }).addTo(mapRef.current));
                } catch { /* skip */ }
                const sp = (data.snap_pins || [])[j];
                if (sp && sp.dist > SNAP_THRESHOLD) {
                  routeLayersRef.current.push(L.polyline([[sp.lat, sp.lng], [pin.lat, pin.lng]], {
                    color: '#94a3b8', weight: 1.5, opacity: 0.75, dashArray: '4,4'
                  }).addTo(mapRef.current));
                }
              } else {
                /* 수급 불필요 원료 → 가는 회색 점선 (직선) */
                routeLayersRef.current.push(L.polyline([[bLat, bLng], [pin.lat, pin.lng]], {
                  color: '#4b5563', weight: 1.2, opacity: 0.45, dashArray: '3,7'
                }).addTo(mapRef.current));
              }
            }
          } else {
            for (const pin of calcPins) {
              const isSupply  = pin.type === 'supply';
              const pinNeeded = !isSupply || neededSupplyIds.has(pin.id);
              routeLayersRef.current.push(L.polyline([[bLat, bLng], [pin.lat, pin.lng]], {
                color: pinNeeded ? '#eab308' : '#4b5563',
                weight: pinNeeded ? 2.5 : 1.2,
                opacity: pinNeeded ? 0.85 : 0.45,
                dashArray: pinNeeded ? '8,5' : '3,7',
              }).addTo(mapRef.current));
            }
          }
        }
      }
    } catch (e) { alert('최적화 실패: ' + e.message); }
    finally { setOptimizing(false); }
  }, [gridCells, pins, requiredCells]);

  const handleClearOpt = useCallback(() => {
    setScores({}); setSelectedKeys([]); setOptMethod(null); setSnapPins([]); setSupplyAlloc([]);
    /* 도로 필터가 켜져 있으면 접근 불가 셀은 회색 유지 */
    rectsRef.current.forEach((rect, key) => {
      const accessible = !accessibleKeysRef.current || accessibleKeysRef.current.has(key);
      rect.setStyle(accessible
        ? { color: '#4fc3f7', weight: 0.4, fillColor: '#4fc3f7', fillOpacity: 0.06 }
        : { color: '#374151', weight: 0.2, fillColor: '#1f2937', fillOpacity: 0.5 }
      );
    });
    /* 원료 마커 투명도 복원 */
    pinMarkersRef.current.forEach(marker => marker.setOpacity(1.0));
    routeLayersRef.current.forEach(l => l.remove()); routeLayersRef.current = [];
    autoFactoryMarkersRef.current.forEach(m => m.remove()); autoFactoryMarkersRef.current = [];
  }, []);

  /* ── 도로 접근 가능 격자 필터링 (OSRM nearest) ── */
  const handleRoadFilter = useCallback(async () => {
    if (!gridCells.length) return;
    setRoadFiltering(true);

    const threshold = Math.max(gridCells[0].dLat * 111000, 300); // 셀 크기 or 최소 300m
    const BATCH = 40;
    const accessible = new Set();

    for (let i = 0; i < gridCells.length; i += BATCH) {
      const batch = gridCells.slice(i, i + BATCH);
      await Promise.all(batch.map(async cell => {
        const lat = cell.lat + cell.dLat / 2;
        const lng = cell.lng + cell.dLng / 2;
        try {
          const res  = await fetch(`http://localhost:5000/nearest/v1/driving/${lng},${lat}?number=1`);
          const data = await res.json();
          const dist = data?.waypoints?.[0]?.distance ?? Infinity;
          if (dist <= threshold) accessible.add(cell.key);
        } catch {
          accessible.add(cell.key); // OSRM 오류 시 기본 포함
        }
      }));
    }

    accessibleKeysRef.current = accessible;
    setRoadFilterInfo({ total: gridCells.length, accessible: accessible.size });

    /* 접근 불가 셀 회색 처리 */
    rectsRef.current.forEach((rect, key) => {
      if (accessible.has(key)) {
        rect.setStyle({ color: '#4fc3f7', weight: 0.4, fillColor: '#4fc3f7', fillOpacity: 0.06 });
      } else {
        rect.setStyle({ color: '#374151', weight: 0.2, fillColor: '#1f2937', fillOpacity: 0.5 });
      }
    });

    setRoadFiltering(false);
  }, [gridCells]);

  const handleClearRoadFilter = useCallback(() => {
    accessibleKeysRef.current = null;
    setRoadFilterInfo(null);
    rectsRef.current.forEach(rect =>
      rect.setStyle({ color: '#4fc3f7', weight: 0.4, fillColor: '#4fc3f7', fillOpacity: 0.06 })
    );
  }, []);

  /* ── 도로망 시각화 (격자 샘플링 → OSRM route → 주황 폴리라인) ── */
  const handleToggleRoadNetwork = useCallback(async () => {
    if (roadNetworkVisible) {
      roadNetworkLayerRef.current.forEach(l => l.remove());
      roadNetworkLayerRef.current = [];
      setRoadNetworkVisible(false);
      return;
    }
    if (!mapRef.current || !leafletRef.current) return;
    setRoadNetworkLoading(true);

    /* 접근 가능 셀 우선, 없으면 전체 셀 */
    const base = accessibleKeysRef.current
      ? gridCells.filter(c => accessibleKeysRef.current.has(c.key))
      : gridCells;
    if (!base.length) { setRoadNetworkLoading(false); return; }

    /* 행(row) 기준으로 정렬 → 지그재그 순서로 샘플 */
    const sorted = [...base].sort((a, b) => a.row !== b.row ? a.row - b.row : (a.row % 2 === 0 ? a.col - b.col : b.col - a.col));
    const step   = Math.max(1, Math.floor(sorted.length / 80)); // 최대 80 샘플
    const sampled = sorted.filter((_, i) => i % step === 0);

    const L      = leafletRef.current;
    const layers = [];
    const CHUNK  = 20; // waypoint per request

    for (let i = 0; i < sampled.length; i += CHUNK - 1) {
      const chunk = sampled.slice(i, i + CHUNK);
      if (chunk.length < 2) continue;
      const coords = chunk.map(c => `${(c.lng + c.dLng / 2).toFixed(5)},${(c.lat + c.dLat / 2).toFixed(5)}`).join(';');
      try {
        const res  = await fetch(`http://localhost:5000/route/v1/driving/${coords}?overview=full&geometries=geojson`);
        const data = await res.json();
        if (data.routes?.[0]?.geometry) {
          layers.push(
            L.geoJSON(data.routes[0].geometry, {
              style: { color: '#f97316', weight: 1.8, opacity: 0.65 },
            }).addTo(mapRef.current)
          );
        }
      } catch { /* 해당 청크 skip */ }
    }

    roadNetworkLayerRef.current = layers;
    setRoadNetworkVisible(true);
    setRoadNetworkLoading(false);
  }, [gridCells, roadNetworkVisible]);

  const handleClearPins = useCallback(() => {
    pinMarkersRef.current.forEach(m => m.remove()); pinMarkersRef.current.clear();
    setPins([]); setPlacingPin(null); handleClearOpt();
  }, [handleClearOpt]);

  /* 최적 셀 = 선택 구역 중 점수 최소 셀; 비용 = 총 가중 거리(m) */
  const bestScore    = selectedKeys.length > 0 ? Math.min(...selectedKeys.map(k => scores[k] ?? Infinity)) : null;
  const estTransport = bestScore != null ? (bestScore / 1000 * transportCost).toFixed(0) : null;

  /* 수요/공급 분석 */
  const totalDemandKg  = pins.filter(p => p.type === 'demand').reduce((s, p) => s + (p.quantity || 0), 0);
  const factoryCapKg   = pins.filter(p => p.type === 'factory').reduce((s, p) => s + (p.quantity || 0), 0);
  const totalWaterM3   = pins.filter(p => p.type === 'supply').reduce((s, p) => s + (p.quantity || 0), 0);
  const totalPowerMW   = pins.filter(p => ['pv','wind','nuclear'].includes(p.type)).reduce((s, p) => s + (p.quantity || 0), 0);
  const waterNeededM3  = +(totalDemandKg * 0.009).toFixed(1);   // ~9 kg water / kg H₂
  const h2FromPower    = +(totalPowerMW * 24000 / 55).toFixed(0); // kWh/day ÷ 55 kWh/kg

  const pinTypeList = Object.entries(PIN_TYPES);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', background:'#0d1117' }}>
      {/* Header */}
      <div style={{ padding:'10px 16px', borderBottom:'1px solid #30363d', flexShrink:0, display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <h3 style={{ color:'#c9d1d9', fontSize:13, fontWeight:700, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{project.name}</h3>
          {project.description && <p style={{ color:'#8b949e', fontSize:11, margin:'2px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{project.description}</p>}
        </div>
        <span style={{ fontSize:10, color:'#484f58', flexShrink:0 }}>{formatDate(project.createdAt)}</span>
      </div>

      {/* Body */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* Map */}
        <div style={{ flex:1, position:'relative' }}>
          <div ref={mapDivRef} style={{ position:'absolute', inset:0 }} />

          {gridLoading && (
            <div style={{ position:'absolute', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(13,17,23,0.6)', backdropFilter:'blur(2px)' }}>
              <p style={{ color:'#4fc3f7', fontSize:13, fontWeight:600 }}>격자 생성 중...</p>
            </div>
          )}

          {/* 핀 배치 모드 배너 */}
          {placingPin && (() => {
            const cfg = PIN_TYPES[placingPin];
            return (
              <div style={{
                position:'absolute', top:12, left:'50%', transform:'translateX(-50%)', zIndex:1000,
                background: `${cfg.color}22`, border: `1px solid ${cfg.color}`,
                borderRadius:20, padding:'6px 16px', fontSize:11, fontWeight:700,
                color: cfg.color, pointerEvents:'none', backdropFilter:'blur(4px)',
              }}>
                {cfg.label} 핀 — 지도를 클릭하세요 (ESC 취소)
              </div>
            );
          })()}

          {/* 지형 + 히트맵 + 도로망 토글 버튼 그룹 */}
          <div style={{ position:'absolute', top:10, right:10, zIndex:1000, display:'flex', gap:6 }}>
            {/* 도로망 시각화 토글 */}
            {gridCells.length > 0 && (
              <button onClick={handleToggleRoadNetwork} disabled={roadNetworkLoading}
                title="격자를 샘플링하여 OSRM 도로망을 주황 선으로 표시"
                style={{
                  display:'flex', alignItems:'center', gap:5,
                  background: roadNetworkVisible ? '#1a0e00' : '#161b22',
                  border: `1px solid ${roadNetworkVisible ? '#f97316' : '#30363d'}`,
                  borderRadius:6, padding:'6px 11px', cursor: roadNetworkLoading ? 'not-allowed' : 'pointer',
                  color: roadNetworkVisible ? '#f97316' : '#8b949e',
                  fontSize:11, fontWeight:600, backdropFilter:'blur(4px)', transition:'all 0.15s',
                  opacity: roadNetworkLoading ? 0.6 : 1,
                }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 12h4l3-9 4 18 3-9h4"/>
                </svg>
                {roadNetworkLoading ? '조회 중...' : roadNetworkVisible ? '도로망 ON' : '도로망 OFF'}
              </button>
            )}

            {/* 히트맵 토글 */}
            {Object.keys(scores).length > 0 && (
              <button onClick={() => setHeatmapVisible(v => !v)}
                title={heatmapVisible ? '히트맵 숨기기' : '히트맵 표시'}
                style={{
                  display:'flex', alignItems:'center', gap:5,
                  background: heatmapVisible ? '#1a1a0e' : '#161b22',
                  border: `1px solid ${heatmapVisible ? '#eab308' : '#30363d'}`,
                  borderRadius:6, padding:'6px 11px', cursor:'pointer',
                  color: heatmapVisible ? '#eab308' : '#8b949e',
                  fontSize:11, fontWeight:600, backdropFilter:'blur(4px)', transition:'all 0.15s',
                }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
                {heatmapVisible ? '히트맵 ON' : '히트맵 OFF'}
              </button>
            )}
            {/* 지형 토글 */}
            <button onClick={() => setOverlayVisible(v => !v)}
              title={overlayVisible ? '지형 레이어 숨기기' : '지형 레이어 표시 (OSM)'}
              style={{
                display:'flex', alignItems:'center', gap:6,
                background: overlayVisible ? '#0e2a1a' : '#161b22',
                border: `1px solid ${overlayVisible ? '#22c55e' : '#30363d'}`,
                borderRadius:6, padding:'6px 11px', cursor:'pointer',
                color: overlayVisible ? '#22c55e' : '#8b949e',
                fontSize:11, fontWeight:600, backdropFilter:'blur(4px)', transition:'all 0.15s',
              }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
                <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
              </svg>
              {overlayVisible ? '지형 숨기기' : '지형 보기'}
            </button>
          </div>

          {/* 범례 */}
          {Object.keys(scores).length > 0 && (
            <div style={{ position:'absolute', bottom:16, left:12, zIndex:1000, background:'rgba(13,17,23,0.92)', border:'1px solid #30363d', borderRadius:7, padding:'10px 12px', backdropFilter:'blur(4px)', pointerEvents:'none', minWidth:176 }}>
              {heatmapVisible && (
                <>
                  <p style={{ color:'#8b949e', fontSize:9, fontWeight:700, letterSpacing:1, margin:'0 0 5px' }}>입지 비용 히트맵</p>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:7 }}>
                    <span style={{ fontSize:9, color:'#22c55e', fontWeight:700 }}>최적</span>
                    <div style={{ flex:1, height:6, borderRadius:3, background:'linear-gradient(to right, #22c55e, #eab308, #ef4444)' }} />
                    <span style={{ fontSize:9, color:'#ef4444', fontWeight:700 }}>비최적</span>
                  </div>
                </>
              )}
              {/* 공장 마커 범례 */}
              {autoFactoryMarkersRef.current.length > 0 && (
                <>
                  <p style={{ color:'#8b949e', fontSize:9, fontWeight:700, letterSpacing:1, margin:'0 0 5px' }}>공장 핀</p>
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:'#f97316', flexShrink:0 }} />
                    <span style={{ fontSize:9, color:'#f97316' }}>수동 배치 공장</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:7 }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:'#a855f7', flexShrink:0 }} />
                    <span style={{ fontSize:9, color:'#a855f7' }}>최적 입지 공장 (★)</span>
                  </div>
                </>
              )}
              {routeLayersRef.current.length > 0 && (
                <>
                  <p style={{ color:'#8b949e', fontSize:9, fontWeight:700, letterSpacing:1, margin:'0 0 5px' }}>최적 입지 → 핀 경로</p>
                  {optMethod === 'osrm' ? (
                    <>
                      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4 }}>
                        <div style={{ width:24, height:3, background:'#22c55e', borderRadius:2, flexShrink:0 }} />
                        <span style={{ fontSize:9, color:'#22c55e' }}>도로망 (OSRM)</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <div style={{ width:24, height:2, flexShrink:0, backgroundImage:'repeating-linear-gradient(to right,#94a3b8 0,#94a3b8 4px,transparent 4px,transparent 8px)' }} />
                        <span style={{ fontSize:9, color:'#94a3b8' }}>마지막 구간 (직선)</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <div style={{ width:24, height:2, flexShrink:0, backgroundImage:'repeating-linear-gradient(to right,#eab308 0,#eab308 6px,transparent 6px,transparent 10px)' }} />
                      <span style={{ fontSize:9, color:'#eab308' }}>직선 거리 (Haversine)</span>
                    </div>
                  )}
                </>
              )}
              {optMethod && (
                <p style={{ color:'#484f58', fontSize:8, margin:'6px 0 0', fontStyle:'italic' }}>
                  {optMethod === 'osrm' ? '도로망+마지막구간 직선 혼합' : 'OSRM 오류 — 직선거리 대체'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ width:230, flexShrink:0, borderLeft:'1px solid #30363d', overflowY:'auto', background:'#161b22', display:'flex', flexDirection:'column' }}>

          {/* 공정 면적 */}
          <Section label="공정 면적">
            <Row label="첨부 공정" value={`${(project.flows||[]).length}개`} />
            <Row label="총 면적"   value={totalFlowArea > 0 ? `${totalFlowArea.toLocaleString()} m²` : '—'} hi={totalFlowArea > 0} />
            <Row label="격자 크기" value={`${gridSize >= 1000 ? `${gridSize/1000}km` : `${gridSize}m`} (${(gridCellAreaM2/10000).toFixed(1)}ha)`} />
            <Row label="필요 격자" value={requiredCells > 0 ? `${requiredCells}칸` : '—'} hi={requiredCells > 0} />
          </Section>

          <Divider />

          {/* 운송비 */}
          <Section label="운송비 설정">
            <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:6 }}>
              <input type="number" min="0" step="0.1" value={transportCost}
                onChange={e => setTransportCost(parseFloat(e.target.value)||0)}
                style={{ flex:1, background:'#0d1117', border:'1px solid #30363d', borderRadius:4, padding:'5px 7px', color:'#c9d1d9', fontSize:11, outline:'none' }} />
              <span style={{ color:'#484f58', fontSize:10, flexShrink:0 }}>만원/km</span>
            </div>
            {bestScore != null && (
              <>
                <Row label="최적 입지 거리 합계" value={`${(bestScore/1000).toFixed(1)} km`} hi />
                {estTransport != null && <Row label="예상 운송비" value={`${Number(estTransport).toLocaleString()} 만원/일`} hi />}
              </>
            )}
          </Section>

          <Divider />

          {/* 핀 배치 */}
          <Section label="핀 배치">
            {/* 핀 타입 버튼 (2열 그리드) */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, marginBottom:8 }}>
              {pinTypeList.map(([type, cfg]) => {
                const active = placingPin === type;
                return (
                  <button key={type}
                    onClick={() => setPlacingPin(p => p === type ? null : type)}
                    style={{
                      padding:'6px 4px', fontSize:10, fontWeight:700, borderRadius:5, cursor:'pointer',
                      background: active ? `${cfg.color}22` : '#0d1117',
                      border: `1px solid ${active ? cfg.color : '#30363d'}`,
                      color: active ? cfg.color : '#8b949e',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:5,
                    }}>
                    <span style={{ width:8, height:8, borderRadius: type==='pv'?'2px': type==='wind'||type==='demand'?'50%':'1px', background: cfg.color, flexShrink:0, transform: type==='wind'?undefined:type==='nuclear'?'rotate(15deg)':undefined, clipPath: type==='nuclear'?'polygon(50% 0%,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)':type==='factory'?'polygon(20% 100%,20% 40%,35% 40%,35% 0%,65% 0%,65% 40%,80% 40%,80% 100%)':undefined }} />
                    {active ? '✕ 완료' : cfg.label}
                  </button>
                );
              })}
            </div>

            {/* 배치된 핀 목록 */}
            {pins.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:240, overflowY:'auto', marginBottom:6 }}>
                {pins.map(pin => {
                  const cfg = PIN_TYPES[pin.type];
                  const seq = pinSeqMap[pin.id] || '';
                  return (
                    <div key={pin.id} style={{ background:'#0d1117', border:'1px solid #21262d', borderRadius:6, padding:'6px 8px' }}>
                      {/* 헤더: 타입+번호 + 좌표 + 삭제 */}
                      <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:5 }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background: cfg.color }} />
                        <span style={{ fontSize:10, fontWeight:700, color: cfg.color, flex:1 }}>{cfg.label} {seq}</span>
                        <span style={{ fontSize:9, color:'#484f58' }}>{pin.lat.toFixed(3)},{pin.lng.toFixed(3)}</span>
                        <button onClick={() => {
                          pinMarkersRef.current.get(pin.id)?.remove();
                          pinMarkersRef.current.delete(pin.id);
                          setPins(p => p.filter(x => x.id !== pin.id));
                        }} style={{ background:'none', border:'none', color:'#f85149', cursor:'pointer', fontSize:14, padding:'0 2px', lineHeight:1, flexShrink:0 }}>×</button>
                      </div>
                      {/* 수량 입력 */}
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <span style={{ fontSize:9, color:'#484f58', whiteSpace:'nowrap' }}>{cfg.unitLabel}</span>
                        <input type="number" min="0" step="any" value={pin.quantity || ''}
                          placeholder="0"
                          onChange={e => setPins(p => p.map(x => x.id===pin.id ? {...x, quantity: parseFloat(e.target.value)||0} : x))}
                          style={{ flex:1, minWidth:0, fontSize:10, textAlign:'right', padding:'3px 5px', background:'#161b22', border:'1px solid #30363d', borderRadius:3, color:'#c9d1d9', outline:'none' }} />
                        <span style={{ fontSize:9, color:'#484f58', whiteSpace:'nowrap' }}>{cfg.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {pins.length > 0 && (
              <button onClick={handleClearPins} style={{ width:'100%', padding:'4px 0', fontSize:10, borderRadius:4, cursor:'pointer', background:'transparent', border:'1px solid #6e3030', color:'#f85149' }}>
                핀 초기화
              </button>
            )}

            {pins.length === 0 && (
              <p style={{ fontSize:10, color:'#484f58', margin:0, fontStyle:'italic', textAlign:'center' }}>위 버튼을 눌러 지도에 핀을 배치하세요</p>
            )}
          </Section>

          <Divider />

          {/* 도로 접근성 필터 */}
          <Section label="도로 접근성 필터">
            {!gridCells.length ? (
              <p style={{ fontSize:9, color:'#484f58', margin:0 }}>격자 생성 후 사용 가능</p>
            ) : roadFilterInfo ? (
              <>
                <div style={{ background:'#0a1a0a', border:'1px solid #1a3a1a', borderRadius:5, padding:'6px 9px', marginBottom:6 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, marginBottom:3 }}>
                    <span style={{ color:'#484f58' }}>전체 격자</span>
                    <span style={{ color:'#8b949e', fontWeight:600 }}>{roadFilterInfo.total.toLocaleString()}칸</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, marginBottom:3 }}>
                    <span style={{ color:'#484f58' }}>도로 접근 가능</span>
                    <span style={{ color:'#4fc3f7', fontWeight:700 }}>{roadFilterInfo.accessible.toLocaleString()}칸</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:10 }}>
                    <span style={{ color:'#484f58' }}>제외 (도로 없음)</span>
                    <span style={{ color:'#374151', fontWeight:600 }}>{(roadFilterInfo.total - roadFilterInfo.accessible).toLocaleString()}칸</span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:4 }}>
                  <div style={{ flex:1, height:5, borderRadius:2, overflow:'hidden', background:'#21262d' }}>
                    <div style={{ height:'100%', width:`${(roadFilterInfo.accessible/roadFilterInfo.total*100).toFixed(1)}%`, background:'#4fc3f7', borderRadius:2 }} />
                  </div>
                </div>
                <button onClick={handleClearRoadFilter} style={{ width:'100%', marginTop:6, padding:'4px 0', fontSize:10, borderRadius:4, cursor:'pointer', background:'transparent', border:'1px solid #30363d', color:'#8b949e' }}>
                  필터 해제
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize:9, color:'#484f58', margin:'0 0 6px' }}>
                  OSRM으로 각 격자의 도로 접근 가능 여부를 조회합니다. 도로가 없는 격자(산지·수역 등)는 회색으로 표시되고 최적화에서 제외됩니다.
                </p>
                {gridCells.length > 2000 && (
                  <p style={{ fontSize:9, color:'#eab308', margin:'0 0 6px' }}>⚠ 격자 수가 많아 조회에 시간이 걸릴 수 있습니다</p>
                )}
                <button onClick={handleRoadFilter} disabled={roadFiltering}
                  style={{ width:'100%', padding:'7px 0', fontSize:11, fontWeight:700, borderRadius:5, cursor: roadFiltering ? 'not-allowed' : 'pointer',
                    background: roadFiltering ? '#21262d' : '#0e2a3a',
                    border: `1px solid ${roadFiltering ? '#30363d' : '#4fc3f7'}`,
                    color: roadFiltering ? '#484f58' : '#4fc3f7',
                  }}>
                  {roadFiltering ? `조회 중... (OSRM)` : '도로 접근성 조회'}
                </button>
              </>
            )}
          </Section>

          <Divider />

          {/* 최적화 */}
          <Section label="입지 최적화">
            <button onClick={handleOptimize}
              disabled={optimizing || !gridCells.length || !pins.length}
              style={{
                width:'100%', padding:'8px 0', fontSize:11, fontWeight:700, borderRadius:5, cursor:'pointer',
                background: (optimizing||!gridCells.length||!pins.length) ? '#21262d' : '#1f6feb',
                border: `1px solid ${(optimizing||!gridCells.length||!pins.length) ? '#30363d' : '#1f6feb'}`,
                color: (optimizing||!gridCells.length||!pins.length) ? '#484f58' : '#fff',
                marginBottom:4,
              }}>
              {optimizing ? '계산 중...' : '최적화 실행'}
            </button>

            {!gridCells.length && <p style={{ fontSize:9, color:'#484f58', margin:0 }}>격자 생성 완료 후 사용 가능</p>}
            {gridCells.length > 0 && !pins.length && <p style={{ fontSize:9, color:'#484f58', margin:0 }}>핀을 배치한 후 실행하세요</p>}

            {selectedKeys.length > 0 && (() => {
              const autoPlaced  = autoFactoryMarkersRef.current.length > 0;
              const balance     = factoryCapKg - totalDemandKg;
              const waterSurplus = totalWaterM3 > 0 ? totalWaterM3 - waterNeededM3 : null;
              return (
                <>
                  <div style={{ background:'#0d1117', border:'1px solid #1a3a1a', borderRadius:5, padding:'6px 8px', marginTop:4 }}>
                    <p style={{ color:'#3fb950', fontSize:9, fontWeight:700, letterSpacing:0.6, margin:'0 0 4px' }}>최적 구역</p>
                    <Row label="격자 수" value={`${selectedKeys.length}칸`} hi />
                    {optMethod && <Row label="거리 기준" value={
                      optMethod.startsWith('osrm') ? '도로망+스냅' : '직선(Haversine)'
                    } />}
                    {optMethod?.includes('highs') && <Row label="입지 솔버" value="HiGHS MIP" hi />}
                  </div>

                  {/* 수요/공급 균형 */}
                  {(totalDemandKg > 0 || factoryCapKg > 0 || totalWaterM3 > 0) && (
                    <div style={{ background:'#0d1117', border:'1px solid #21262d', borderRadius:5, padding:'6px 8px', marginTop:6 }}>
                      <p style={{ color:'#8b949e', fontSize:9, fontWeight:700, letterSpacing:0.6, margin:'0 0 5px' }}>수요·공급 분석</p>
                      {totalDemandKg > 0 && <Row label="H₂ 수요량" value={`${totalDemandKg.toLocaleString()} kg/일`} />}
                      {factoryCapKg > 0 && <Row label="공장 생산량" value={`${factoryCapKg.toLocaleString()} kg/일`} />}
                      {autoPlaced && <Row label="자동 공장" value="최적 입지 배치됨" />}
                      {totalDemandKg > 0 && factoryCapKg > 0 && (
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, marginBottom:3 }}>
                          <span style={{ color:'#484f58' }}>균형</span>
                          <span style={{ color: balance >= 0 ? '#22c55e' : '#ef4444', fontWeight:700 }}>
                            {balance >= 0 ? `+${balance.toLocaleString()}` : balance.toLocaleString()} kg/일
                          </span>
                        </div>
                      )}
                      {totalDemandKg > 0 && factoryCapKg === 0 && (
                        <div style={{ fontSize:9, color:'#ef4444', marginBottom:3 }}>⚠ 공장 핀 없음 — 자동 입지 산출</div>
                      )}
                      {totalWaterM3 > 0 && (
                        <>
                          <div style={{ height:1, background:'#21262d', margin:'4px 0' }} />
                          <Row label="공급 물" value={`${totalWaterM3.toLocaleString()} m³/일`} />
                          {totalDemandKg > 0 && <Row label="필요 물 (추산)" value={`${waterNeededM3.toLocaleString()} m³/일`} />}
                          {waterSurplus != null && waterSurplus > 0 && (
                            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, marginBottom:3 }}>
                              <span style={{ color:'#484f58' }}>잉여 물</span>
                              <span style={{ color:'#4fc3f7', fontWeight:600 }}>{waterSurplus.toLocaleString()} m³/일</span>
                            </div>
                          )}
                          {waterSurplus != null && waterSurplus < 0 && (
                            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, marginBottom:3 }}>
                              <span style={{ color:'#484f58' }}>물 부족</span>
                              <span style={{ color:'#ef4444', fontWeight:600 }}>{Math.abs(waterSurplus).toLocaleString()} m³/일</span>
                            </div>
                          )}
                        </>
                      )}
                      {totalPowerMW > 0 && (
                        <>
                          <div style={{ height:1, background:'#21262d', margin:'4px 0' }} />
                          <Row label="가용 전력" value={`${totalPowerMW.toLocaleString()} MW`} />
                          <Row label="전력→H₂ (추산)" value={`${h2FromPower.toLocaleString()} kg/일`} />
                        </>
                      )}
                    </div>
                  )}

                  {/* 원료 수급 계획 */}
                  {supplyAlloc.length > 0 && (
                    <div style={{ background:'#0d1117', border:'1px solid #21262d', borderRadius:5, padding:'6px 8px', marginTop:6 }}>
                      <p style={{ color:'#8b949e', fontSize:9, fontWeight:700, letterSpacing:0.6, margin:'0 0 5px' }}>원료 수급 계획</p>
                      {supplyAlloc.map(({ pin, allocated, needed, distToBest }, idx) => {
                        const seq = pinSeqMap[pin.id] ?? idx + 1;
                        return (
                          <div key={pin.id} style={{
                            display:'flex', alignItems:'center', gap:5,
                            padding:'3px 5px', borderRadius:4, marginBottom:3,
                            background: needed ? '#0f2718' : '#161b22',
                            border: `1px solid ${needed ? '#1a4a28' : '#21262d'}`,
                            opacity: needed ? 1 : 0.6,
                          }}>
                            <span style={{ fontSize:9, color: needed ? '#4ade80' : '#6b7280', fontWeight:700, minWidth:16 }}>
                              {needed ? '●' : '○'}
                            </span>
                            <span style={{ flex:1, fontSize:9, color: needed ? '#c9d1d9' : '#6b7280' }}>
                              원료지 {seq}
                            </span>
                            <span style={{ fontSize:9, color:'#484f58', marginRight:4 }}>
                              {(distToBest / 1000).toFixed(1)} km
                            </span>
                            {needed ? (
                              <span style={{ fontSize:9, color:'#4ade80', fontWeight:600 }}>
                                {allocated.toLocaleString()} m³/일
                              </span>
                            ) : (
                              <span style={{ fontSize:9, color:'#6b7280' }}>불필요</span>
                            )}
                          </div>
                        );
                      })}
                      <div style={{ height:1, background:'#21262d', margin:'5px 0 4px' }} />
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:9 }}>
                        <span style={{ color:'#484f58' }}>수급 원료지</span>
                        <span style={{ color:'#4ade80', fontWeight:600 }}>
                          {supplyAlloc.filter(a => a.needed).length} / {supplyAlloc.length} 곳
                        </span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, marginTop:2 }}>
                        <span style={{ color:'#484f58' }}>총 수급량</span>
                        <span style={{ color:'#4ade80', fontWeight:600 }}>
                          {supplyAlloc.reduce((s, a) => s + a.allocated, 0).toLocaleString()} m³/일
                        </span>
                      </div>
                    </div>
                  )}

                  <button onClick={handleClearOpt} style={{ width:'100%', padding:'4px 0', fontSize:10, borderRadius:4, cursor:'pointer', background:'transparent', border:'1px solid #30363d', color:'#8b949e', marginTop:6 }}>
                    결과 초기화
                  </button>
                </>
              );
            })()}
          </Section>

          <Divider />

          {/* 첨부 공정 */}
          <Section label={`첨부 공정 (${(project.flows||[]).length})`}>
            {(project.flows||[]).length === 0 ? (
              <p style={{ color:'#484f58', fontSize:10, margin:0, fontStyle:'italic' }}>FLOW 탭에서 내보내기로 추가하세요</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {(project.flows||[]).map(f => (
                  <div key={f.id} style={{ background:'#0d1117', border:'1px solid #21262d', borderRadius:5, padding:'7px 9px' }}>
                    <div style={{ color:'#c9d1d9', fontSize:11, fontWeight:600, marginBottom:2 }}>{f.name}</div>
                    {f.description && <div style={{ color:'#8b949e', fontSize:10, marginBottom:3 }}>{f.description}</div>}
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#484f58' }}>
                      <span>노드 {f.nodes?.length ?? 0}개</span>
                      <span style={{ color: f.totalArea > 0 ? '#34D399' : '#484f58' }}>
                        {f.totalArea > 0 ? `${f.totalArea.toLocaleString()} m²` : '—'}
                      </span>
                    </div>
                    <div style={{ fontSize:9, color:'#484f58', marginTop:2 }}>{formatDate(f.exportedAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ padding:'10px 12px' }}>
      <p style={{ color:'#8b949e', fontSize:9, fontWeight:700, letterSpacing:1, textTransform:'uppercase', margin:'0 0 8px' }}>{label}</p>
      {children}
    </div>
  );
}
function Divider() { return <div style={{ height:1, background:'#21262d', flexShrink:0 }} />; }
function Row({ label, value, hi }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
      <span style={{ color:'#484f58' }}>{label}</span>
      <span style={{ color: hi ? '#c9d1d9' : '#8b949e', fontWeight: hi ? 600 : 400 }}>{value}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#484f58', gap:10, padding:40 }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
        <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 8h18"/><path d="M8 3v2M16 3v2"/><path d="M8 13h4M8 16h6" strokeLinecap="round"/>
      </svg>
      <p style={{ fontSize:13, margin:0 }}>프로젝트를 선택하세요</p>
    </div>
  );
}

/* ── Main ProjectView ── */
export default function ProjectView() {
  const [projects,   setProjects]   = useState(loadProjects);
  const [selectedId, setSelectedId] = useState(null);
  const [search,     setSearch]     = useState('');

  const selectedProject = projects.find(p => p.id === selectedId) || null;

  const handleDelete = (id) => {
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated); saveProjects(updated);
    if (selectedId === id) setSelectedId(null);
  };

  const handleProjectUpdated = (updated) => {
    const list = projects.map(p => p.id === updated.id ? updated : p);
    setProjects(list); saveProjects(list);
  };

  const filtered = search
    ? projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.description||'').toLowerCase().includes(search.toLowerCase()))
    : projects;

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden', background:'#0d1117' }}>
      {/* Project list */}
      <div style={{ width:260, flexShrink:0, borderRight:'1px solid #30363d', display:'flex', flexDirection:'column', overflow:'hidden', background:'#161b22' }}>
        <div style={{ padding:'12px 12px 8px', flexShrink:0, borderBottom:'1px solid #21262d' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <h3 style={{ color:'#c9d1d9', fontSize:13, fontWeight:700, margin:0, flex:1 }}>프로젝트</h3>
            <span style={{ color:'#484f58', fontSize:11 }}>{projects.length}개</span>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="프로젝트 검색..."
            style={{ width:'100%', boxSizing:'border-box', background:'#0d1117', border:'1px solid #30363d', borderRadius:5, padding:'6px 9px', color:'#c9d1d9', fontSize:11, outline:'none' }} />
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:8, display:'flex', flexDirection:'column', gap:5 }}>
          {filtered.length === 0 && (
            <div style={{ padding:'24px 12px', textAlign:'center', color:'#484f58' }}>
              {projects.length === 0
                ? <><p style={{ fontSize:12, margin:'0 0 6px' }}>저장된 프로젝트가 없습니다</p><p style={{ fontSize:11, margin:0 }}>MAP 탭에서 지역을 설정하고<br/>"Start Project"를 눌러 시작하세요</p></>
                : <p style={{ fontSize:12, margin:0 }}>검색 결과 없음</p>}
            </div>
          )}
          {filtered.map(p => {
            const isActive = selectedId === p.id;
            const level = MAP_LEVELS[p.region?.level]?.label ?? '';
            return (
              <div key={p.id} onClick={() => setSelectedId(p.id)} style={{
                background: isActive ? '#1f2d3d' : '#0d1117',
                border: `1px solid ${isActive ? '#1f6feb' : '#30363d'}`,
                borderRadius:7, padding:'10px 11px', cursor:'pointer',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                  <span style={{ color:'#c9d1d9', fontSize:12, fontWeight:600, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</span>
                  <span style={{ background:'#1f3a5a', color:'#4fc3f7', fontSize:8, fontWeight:700, padding:'1px 5px', borderRadius:3, flexShrink:0 }}>{level}</span>
                </div>
                {p.description && <p style={{ color:'#8b949e', fontSize:10, margin:'0 0 4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.description}</p>}
                <div style={{ display:'flex', gap:10, fontSize:10, color:'#484f58' }}>
                  <span>{p.region?.filter?.name ?? '전체'}</span>
                  <span>격자 {p.gridCellCount||0}개</span>
                  {(p.flows?.length ?? 0) > 0 && <span style={{ color:'#1f6feb' }}>공정 {p.flows.length}</span>}
                </div>
                <div style={{ display:'flex', justifyContent:'flex-end', marginTop:6 }}>
                  <button onClick={e => { e.stopPropagation(); handleDelete(p.id); }} style={{
                    background:'transparent', border:'1px solid #6e3030', borderRadius:4,
                    padding:'3px 7px', color:'#f85149', fontSize:10, cursor:'pointer',
                  }}>삭제</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Project detail */}
      <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        {selectedProject
          ? <ProjectDetail key={selectedProject.id} project={selectedProject} onProjectUpdated={handleProjectUpdated} />
          : <EmptyState />}
      </div>
    </div>
  );
}
