from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import os, math, httpx

app = FastAPI(title="h2-platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


# ── Location Optimization ──────────────────────────────────────────────

class OptCell(BaseModel):
    key: str
    lat: float
    lng: float

class OptPin(BaseModel):
    id: int
    lat: float
    lng: float
    weight: float = 1.0
    type: str  # 'demand' | 'supply'
    quantity: float = 0.0

class OptimizeRequest(BaseModel):
    cells: List[OptCell]
    pins: List[OptPin]


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6_371_000
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    dφ = math.radians(lat2 - lat1)
    dλ = math.radians(lng2 - lng1)
    a = math.sin(dφ / 2) ** 2 + math.cos(φ1) * math.cos(φ2) * math.sin(dλ / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def solve_location_milp(cells, pins, dist_matrix, sources_info, dests_info):
    """
    MIP facility location (HiGHS via scipy).

    Variables
    ---------
    x[i]    ∈ {0,1}  : factory placed at cell i
    f[i,k]  ≥ 0      : water procured from supply k to factory at i  (m³/day)
    g[i,j]  ≥ 0      : H₂ delivered from factory at i to demand j   (kg/day)

    Objective
    ---------
    min  Σ_{i,k} d_sup[i,k] · f[i,k]  +  Σ_{i,j} d_dem[i,j] · g[i,j]

    Constraints
    -----------
    1.  Σ_i x[i] = 1                          (one factory)
    2.  Σ_i g[i,j] ≥ demand_j   ∀j            (meet all H₂ demand)
    3.  Σ_i f[i,k] ≤ supply_k   ∀k            (supply capacity)
    4.  f[i,k] ≤ supply_k · x[i]  ∀i,k        (link: only through open factory)
    5.  g[i,j] ≤ demand_j · x[i]  ∀i,j        (link: only through open factory)
    6.  Σ_k f[i,k] ≥ 0.009 · Σ_j g[i,j]  ∀i  (water balance: 9 L/kg H₂)

    Returns None when infeasible or scipy unavailable.
    """
    try:
        import numpy as np
        from scipy.optimize import milp, LinearConstraint, Bounds
        from scipy.sparse import lil_matrix, csr_matrix
    except ImportError:
        print("[MILP] scipy not installed – skipping", flush=True)
        return None

    try:
        supply_pairs = [(j, p) for j, p in enumerate(pins) if p.type == 'supply']
        demand_pairs = [(j, p) for j, p in enumerate(pins) if p.type == 'demand']
        N, S, D = len(cells), len(supply_pairs), len(demand_pairs)

        if S == 0 or D == 0:
            return None  # can't form a flow problem without both sides

        supply_caps = [max(p.quantity or 0, 1e-9) for _, p in supply_pairs]
        demand_reqs = [max(p.quantity or 0, 1e-9) for _, p in demand_pairs]
        water_needed = sum(demand_reqs) * 0.009  # m³ of water per kg H₂

        # Full hybrid distance (cell snap + road + pin snap) in metres
        def hdist(i: int, j: int) -> float:
            cs = sources_info[i].get('distance', 0) if i < len(sources_info) else 0
            ds = dests_info[j].get('distance', 0)   if j < len(dests_info)   else 0
            rd = dist_matrix[i][j]
            return cs + (rd if rd is not None else 1_000_000) + ds

        d_sup = np.array([[hdist(i, j) for j, _ in supply_pairs] for i in range(N)])
        d_dem = np.array([[hdist(i, j) for j, _ in demand_pairs] for i in range(N)])

        # ── Variable index helpers ──
        # Layout: [x_0…x_{N-1} | f_{0,0}…f_{N-1,S-1} | g_{0,0}…g_{N-1,D-1}]
        n_vars = N + N * S + N * D

        def ix(i):      return i
        def ifk(i, k):  return N + i * S + k
        def igj(i, j):  return N + N * S + i * D + j

        # Objective vector
        c_obj = np.zeros(n_vars)
        for i in range(N):
            for k in range(S): c_obj[ifk(i, k)] = d_sup[i, k]
            for j in range(D): c_obj[igj(i, j)] = d_dem[i, j]

        integrality = np.zeros(n_vars)
        integrality[:N] = 1  # x binary

        lb = np.zeros(n_vars)
        ub = np.full(n_vars, np.inf)
        ub[:N] = 1.0

        # ── Constraint matrix ──
        n_con = 1 + D + S + N * S + N * D + N
        A   = lil_matrix((n_con, n_vars))
        b_lo = np.full(n_con, -np.inf)
        b_hi = np.full(n_con,  np.inf)
        r = 0

        # 1. Σ x_i = 1
        for i in range(N): A[r, ix(i)] = 1.0
        b_lo[r] = b_hi[r] = 1.0
        r += 1

        # 2. Demand satisfaction: Σ_i g[i,j] ≥ demand_j
        for j in range(D):
            for i in range(N): A[r, igj(i, j)] = 1.0
            b_lo[r] = demand_reqs[j]
            r += 1

        # 3. Supply capacity: Σ_i f[i,k] ≤ supply_k
        for k in range(S):
            for i in range(N): A[r, ifk(i, k)] = 1.0
            b_hi[r] = supply_caps[k]
            r += 1

        # 4. Linking f: f[i,k] ≤ supply_k · x_i
        for i in range(N):
            for k in range(S):
                A[r, ifk(i, k)] =  1.0
                A[r, ix(i)]     = -supply_caps[k]
                b_hi[r] = 0.0
                r += 1

        # 5. Linking g: g[i,j] ≤ demand_j · x_i
        for i in range(N):
            for j in range(D):
                A[r, igj(i, j)] =  1.0
                A[r, ix(i)]     = -demand_reqs[j]
                b_hi[r] = 0.0
                r += 1

        # 6. Water balance: Σ_k f[i,k] ≥ 0.009 · Σ_j g[i,j]
        for i in range(N):
            for k in range(S): A[r, ifk(i, k)] =  1.0
            for j in range(D): A[r, igj(i, j)] = -0.009
            b_lo[r] = 0.0
            r += 1

        constraint = LinearConstraint(csr_matrix(A), b_lo, b_hi)
        result = milp(c_obj, constraints=constraint,
                      integrality=integrality, bounds=Bounds(lb, ub))

        if not result.success:
            print(f"[MILP] {result.message}", flush=True)
            return None

        x_sol  = result.x
        best_i = int(np.argmax(x_sol[:N]))

        supply_alloc = [
            {
                'pin_id':    p.id,
                'allocated': round(float(x_sol[ifk(best_i, k)]), 3),
                'needed':    float(x_sol[ifk(best_i, k)]) > 0.01,
            }
            for k, (_, p) in enumerate(supply_pairs)
        ]

        print(f"[MILP] solved OK — best cell idx {best_i} "
              f"(key={cells[best_i].key}), obj={result.fun:.0f}", flush=True)

        return {
            'best_key':     cells[best_i].key,
            'supply_alloc': supply_alloc,
            'obj_value':    float(result.fun),
        }

    except Exception as exc:
        import traceback
        print(f"[MILP ERROR] {exc}\n{traceback.format_exc()}", flush=True)
        return None


@app.post("/optimize")
async def optimize(body: OptimizeRequest):
    if not body.cells or not body.pins:
        return {"scores": {}, "method": "none"}

    OSRM_URL = os.getenv("OSRM_URL", "http://osrm:5000")

    # ── Try OSRM road-network distances ──────────────────────────────
    try:
        all_coords = [f"{c.lng},{c.lat}" for c in body.cells] + \
                     [f"{p.lng},{p.lat}" for p in body.pins]

        n_cells      = len(body.cells)
        sources      = ";".join(str(i) for i in range(n_cells))
        destinations = ";".join(str(n_cells + j) for j in range(len(body.pins)))
        coords_str   = ";".join(all_coords)

        url = (f"{OSRM_URL}/table/v1/driving/{coords_str}"
               f"?sources={sources}&destinations={destinations}&annotations=distance")

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                raise RuntimeError(f"OSRM HTTP {resp.status_code}")
            data = resp.json()

        if data.get("code") != "Ok":
            raise RuntimeError(f"OSRM error: {data.get('message', 'unknown')}")

        distances = data.get("distances")
        if not distances:
            raise RuntimeError("OSRM returned no distance matrix")

        sources_info = data.get("sources", [])
        dests_info   = data.get("destinations", [])

        # Heatmap scores: weighted-sum-of-distances (kept for visualisation)
        UNREACHABLE = 1_000_000_000
        scores = {}
        for i, cell in enumerate(body.cells):
            cell_snap = sources_info[i].get("distance", 0) if i < len(sources_info) else 0
            cost = sum(
                pin.weight * (
                    cell_snap +
                    (distances[i][j] if distances[i][j] is not None else UNREACHABLE) +
                    (dests_info[j].get("distance", 0) if j < len(dests_info) else 0)
                )
                for j, pin in enumerate(body.pins)
            )
            scores[cell.key] = cost

        snap_pins = [
            {"lat": d["location"][1], "lng": d["location"][0], "dist": d.get("distance", 0)}
            for d in dests_info
        ] if dests_info else []

        # HiGHS MIP — joint location + supply allocation optimisation
        milp_result = solve_location_milp(
            body.cells, body.pins, distances, sources_info, dests_info
        )

        return {
            "scores":      scores,
            "method":      "osrm",
            "snap_pins":   snap_pins,
            "milp_result": milp_result,
        }

    except Exception as exc:
        import traceback
        print(f"[OSRM FALLBACK] {exc}\n{traceback.format_exc()}", flush=True)

        # Haversine distance matrix for MIP fallback
        hav_matrix = [
            [haversine_m(cell.lat, cell.lng, pin.lat, pin.lng) for pin in body.pins]
            for cell in body.cells
        ]

        scores = {
            cell.key: sum(
                pin.weight * hav_matrix[i][j]
                for j, pin in enumerate(body.pins)
            )
            for i, cell in enumerate(body.cells)
        }

        milp_result = solve_location_milp(
            body.cells, body.pins, hav_matrix, [], []
        )

        return {
            "scores":      scores,
            "method":      "haversine",
            "osrm_error":  str(exc),
            "milp_result": milp_result,
        }
