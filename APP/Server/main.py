from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import networkx as nx

app = FastAPI()

# Allow CORS for all origins (for development; restrict in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ComputeRequest(BaseModel):
    metric: Dict[str, float]  # {"bandwidth": 0.4, "delay": 0.6}
    topo: List[Dict[str, Any]]  # [{'source': 'openflow:1', 'target': 'openflow:2', 'weight': 2}, ...]
    algo: str  # e.g., "dijkstra_path"

def is_switch(node):
    return isinstance(node, str) and node.startswith("openflow:")

def _get_str(x):
    """Helper to extract string node id from dict or str."""
    if isinstance(x, dict):
        # Try common keys, or fallback to string
        return x.get('id') or x.get('name') or str(x)
    return x

@app.post("/compute")
async def compute_shortest_paths(data: ComputeRequest):
    G = nx.Graph()
    # Defensive: make sure src/dst are always strings
    for edge in data.topo:
        src = _get_str(edge.get('source') or edge.get('src'))
        dst = _get_str(edge.get('target') or edge.get('dst'))
        w = edge.get('weight', 1)
        print("ADDING EDGE:", repr(src), repr(dst), w, type(src), type(dst))
        G.add_edge(src, dst, weight=w)
    
    switches = [n for n in G.nodes if is_switch(n)]
    result = {}
    algo = data.algo

    single_source_algos = {
        "shortest_path", "dijkstra_path", "bellman_ford_path",
        "astar_path", "bidirectional_dijkstra"
    }
    all_pairs_algos = {
        "all_shortest_paths", "all_pairs_dijkstra_path",
        "all_pairs_bellman_ford_path"
    }

    if algo in single_source_algos:
        for i, src in enumerate(switches):
            for dst in switches[i+1:]:
                try:
                    if algo == "shortest_path":
                        path = nx.shortest_path(G, source=src, target=dst, weight='weight')
                    elif algo == "dijkstra_path":
                        path = nx.dijkstra_path(G, source=src, target=dst, weight='weight')
                    elif algo == "bellman_ford_path":
                        path = nx.bellman_ford_path(G, source=src, target=dst, weight='weight')
                    elif algo == "astar_path":
                        # For demonstration, no heuristic (use as Dijkstra)
                        path = nx.astar_path(G, source=src, target=dst, weight='weight')
                    elif algo == "bidirectional_dijkstra":
                        path, _ = nx.bidirectional_dijkstra(G, source=src, target=dst, weight='weight')
                    else:
                        return {"error": "Algorithm not supported"}
                    key = f"{src}_{dst}"
                    result.setdefault(key, []).append(path)
                except Exception as e:
                    result.setdefault(f"{src}_{dst}", []).append({"error": str(e)})
    elif algo in all_pairs_algos:
        if algo == "all_shortest_paths":
            for i, src in enumerate(switches):
                for dst in switches[i+1:]:
                    try:
                        all_paths = list(nx.all_shortest_paths(G, source=src, target=dst, weight='weight'))
                        key = f"{src}_{dst}"
                        result[key] = all_paths
                    except Exception as e:
                        result[f"{src}_{dst}"] = [{"error": str(e)}]
        elif algo == "all_pairs_dijkstra_path":
            all_paths = dict(nx.all_pairs_dijkstra_path(G, weight='weight'))
            for src in switches:
                for dst in switches:
                    if src != dst and src in all_paths and dst in all_paths[src]:
                        key = f"{src}_{dst}"
                        result.setdefault(key, []).append(all_paths[src][dst])
        elif algo == "all_pairs_bellman_ford_path":
            all_paths = dict(nx.all_pairs_bellman_ford_path(G, weight='weight'))
            for src in switches:
                for dst in switches:
                    if src != dst and src in all_paths and dst in all_paths[src]:
                        key = f"{src}_{dst}"
                        result.setdefault(key, []).append(all_paths[src][dst])
        else:
            return {"error": "Algorithm not supported"}
    else:
        return {"error": "Algorithm not recognized."}
    return result
