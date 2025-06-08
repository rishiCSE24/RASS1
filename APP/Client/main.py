from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
import requests

app = FastAPI()
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

# Simple in-memory session store (not for production!)
session = {}

def extract_links(topology_json):
    """
    Extracts the network edges from an OpenDaylight topology JSON in a D3-friendly format.
    """
    try:
        links = []
        topologies = topology_json.get("network-topology", {}).get("topology", [])
        for topo in topologies:
            for link in topo.get("link", []):
                src = link.get("source", {}).get("source-node")
                dst = link.get("destination", {}).get("dest-node")
                if src and dst:
                    links.append({"source": src, "target": dst, "cost": 1})
        return links
    except Exception as e:
        return [{"error": str(e)}]

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse(
        "index.html", {"request": request, "result": None, "topology": None}
    )

@app.post("/connect-odl", response_class=HTMLResponse)
async def connect_odl(
    request: Request,
    odl_ip: str = Form(...),
    odl_port: str = Form(...),
    odl_user: str = Form(...),
    odl_pass: str = Form(...),
):
    url = f"http://{odl_ip}:{odl_port}/restconf/operational/network-topology:network-topology"
    try:
        resp = requests.get(url, auth=(odl_user, odl_pass))
        resp.raise_for_status()
        topology = resp.json()
        session["odl"] = {
            "ip": odl_ip,
            "port": odl_port,
            "user": odl_user,
            "pass": odl_pass,
        }
        session["topology"] = topology

        filtered_topology = extract_links(topology)

        return templates.TemplateResponse(
            "index.html",
            {
                "request": request,
                "result": "Topology fetched",
                "topology": filtered_topology,
            },
        )
    except Exception as e:
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "result": f"Error: {str(e)}", "topology": None},
        )
