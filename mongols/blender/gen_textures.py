"""Per-shot texture generator for the Blender tilted map (Knowledgia look).
ENV: TEX (out dir), BBOX="lon0,lat0,lon1,lat1", PPD (pixels per degree, default 80), FONT
Outputs: basecolor.png, rough.png, h_grid.npy, meta.json  (+ label report, machine-verified)
Sources (all public domain): NASA GIBS BlueMarble_NextGeneration (WMS), NOAA ETOPO 2022 (DEM), Natural Earth.
LOOK-TEST: political fills use modern Natural Earth countries as stand-ins.
"""
import os, sys, io, json, math, zipfile, urllib.request, numpy as np, tifffile, shapefile
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import zoom, distance_transform_edt, gaussian_filter, binary_dilation
T=os.environ.get("TEX","/var/tmp/bl/tex/"); os.makedirs(T,exist_ok=True)
LON0,LAT0,LON1,LAT1=[float(v) for v in os.environ.get("BBOX","-22,26,16,53").split(",")]
PPD=float(os.environ.get("PPD","80")); W=int((LON1-LON0)*PPD); H=int((LAT1-LAT0)*PPD)
FONT=os.environ.get("FONT","public/fonts/Cinzel.ttf"); KX=math.cos(math.radians((LAT0+LAT1)/2))
f32=np.float32
def get(url,path):
    if os.path.exists(path) and os.path.getsize(path)>1000: return
    req=urllib.request.Request(url,headers={"User-Agent":"atlas-doc/1.0"})
    with urllib.request.urlopen(req,timeout=600) as r, open(path,"wb") as f: f.write(r.read())
tag=f"{LON0}_{LAT0}_{LON1}_{LAT1}_{W}x{H}"
get(f"https://gis.ngdc.noaa.gov/arcgis/rest/services/DEM_mosaics/DEM_all/ImageServer/exportImage?bbox={LON0},{LAT0},{LON1},{LAT1}&bboxSR=4326&imageSR=4326&size={min(W,4000)},{min(H,4000)}&format=tiff&pixelType=F32&noData=&interpolation=RS_BilinearInterpolation&f=image",T+f"dem_{tag}.tif")
get(f"https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=BlueMarble_NextGeneration&CRS=EPSG:4326&BBOX={LAT0},{LON0},{LAT1},{LON1}&WIDTH={W}&HEIGHT={H}&FORMAT=image/jpeg",T+f"bm_{tag}.jpg")
get("https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_0_countries.zip",T+"ne_admin0.zip")
get("https://naciscdn.org/naturalearth/10m/physical/ne_10m_geography_marine_polys.zip",T+"ne_marine.zip")
for z,d in [("ne_admin0.zip","ne0"),("ne_marine.zip","nemar")]:
    if not os.path.exists(T+d): zipfile.ZipFile(T+z).extractall(T+d)
def xy(lon,lat): return ((lon-LON0)/(LON1-LON0)*W, (LAT1-lat)/(LAT1-LAT0)*H)

# ---------- DEM / masks
dem=tifffile.imread(T+f"dem_{tag}.tif").astype(f32)
if dem.shape!=(H,W): dem=zoom(dem,(H/dem.shape[0],W/dem.shape[1]),order=1).astype(f32)
seam=dem<=0
GX,GY=int(os.environ.get("GX","1600")),int(os.environ.get("GY",str(int(1600*H/W))))
h=np.clip(dem,0,None); hg=zoom(h,(GY/H,GX/W),order=1); hg=gaussian_filter(hg,1.0)
np.save(T+"h_grid.npy",((hg/4500.0)**0.6).astype(f32)); del h,hg

# ---------- land (sharp satellite, pushed toward the painted look)
bm=np.asarray(Image.open(T+f"bm_{tag}.jpg").convert("RGB").resize((W,H),Image.LANCZOS)).astype(f32)/f32(255)
g=bm.mean(axis=2,keepdims=True,dtype=f32)
land=np.clip((bm-g)*f32(1.25)+g,0,1)              # +saturation
land=np.clip(land*f32(1.10)+f32(0.04),0,1).astype(f32)   # brighter
del bm,g

# ---------- sea: rich blue, wide soft shelf, bright coastline, foam wisps
sea_sh=(np.array([0xa9,0xcf,0xdc])/255).astype(f32); sea_md=(np.array([0x6d,0x9c,0xb3])/255).astype(f32); sea_dp=(np.array([0x4b,0x74,0x8b])/255).astype(f32)
dcoast=distance_transform_edt(seam).astype(f32)/f32(PPD)      # degrees from coast
t1=np.clip(dcoast/f32(0.9),0,1); t2=np.clip((dcoast-0.9)/f32(3.0),0,1)
sea=(sea_sh*(1-t1)[...,None]+sea_md*t1[...,None]); sea=(sea*(1-t2)[...,None]+sea_dp*t2[...,None]).astype(f32)
rs=np.random.RandomState(11)
foam=gaussian_filter(rs.rand(H//4,W//4).astype(f32),9); foam=zoom(foam,(H/foam.shape[0],W/foam.shape[1]),order=1)[:H,:W]
foam=np.clip((foam-foam.mean())/foam.std(),0,None); foam=np.clip(foam-0.8,0,1)*f32(0.35)
sea=np.clip(sea+(foam*np.clip(dcoast/0.5,0,1))[...,None],0,1).astype(f32); del foam,t1,t2
col=np.where(seam[...,None],sea,land).astype(f32); del sea,land
coast=binary_dilation(~seam,iterations=max(1,int(PPD/40)))&seam     # 1-2px bright rim on the water side
col[coast]=col[coast]*f32(0.35)+np.array([0.93,0.97,0.98],f32)*f32(0.65)

# ---------- political fills (opaque flat colour + dark outline + light inner rim)
sf=shapefile.Reader(T+"ne0/ne_10m_admin_0_countries.shp"); fields=[f[0] for f in sf.fields[1:]]
fills={"Spain":(0xd2,0xaa,0x2e),"Portugal":(0x3f,0x86,0xa4),"Morocco":(0x5f,0xb0,0x5c),"Algeria":(0x9c,0xd4,0x55),"Tunisia":(0x6f,0x8d,0x2f),
       "France":(0x4f,0x6f,0x9a),"Italy":(0xb4,0x7a,0x70),"Hungary":(0xd2,0xaa,0x2e),"Poland":(0x3f,0x86,0xa4)}
masks={}
for sr in sf.iterShapeRecords():
    name=sr.record[fields.index("ADMIN")]
    if name not in fills: continue
    m=Image.new("L",(W,H),0); md=ImageDraw.Draw(m); sh=sr.shape; parts=list(sh.parts)+[len(sh.points)]
    for i in range(len(parts)-1):
        ring=[xy(x,y) for x,y in sh.points[parts[i]:parts[i+1]]]
        if len(ring)>=3: md.polygon(ring,fill=255)
    mk=(np.asarray(m)>0)&~seam
    if mk.sum()==0: continue
    masks[name]=mk
    c=(np.array(fills[name])/255).astype(f32)
    col[mk]=col[mk]*f32(0.16)+c*f32(0.84)
    inner=mk&~binary_dilation(~mk,iterations=max(2,int(PPD/14)))      # inner rim band
    rim=mk&~inner; col[rim]=np.clip(col[rim]*f32(0.75)+c*f32(0.25)+f32(0.08),0,1)
    edge=binary_dilation(mk,iterations=max(1,int(PPD/50)))&~mk        # dark outline just outside
    col[edge]=col[edge]*f32(0.45)+np.array([0.16,0.16,0.17],f32)*f32(0.55)

# ---------- labels (machine-verified: 0 pixels outside polygon)
img=Image.fromarray((np.clip(col,0,1)*255).astype(np.uint8)).convert("RGBA"); del col
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from label_fit import fit_label
LABELS=[("Castile","Spain",int(PPD*1.1)),("Portugal","Portugal",int(PPD*0.6)),("Marinid","Morocco",int(PPD*1.0)),("Tlemcen","Algeria",int(PPD*0.9)),
        ("Hafsid","Tunisia",int(PPD*0.6)),("France","France",int(PPD*1.1)),("Italy","Italy",int(PPD*0.9)),("Hungary","Hungary",int(PPD*0.9)),("Poland","Poland",int(PPD*0.9))]
SEA=[("Alboran Sea",int(PPD*0.4)),("Mediterranean Sea",int(PPD*0.45)),("Bay of Biscay",int(PPD*0.4)),("Balearic Sea",int(PPD*0.35)),("Tyrrhenian Sea",int(PPD*0.4)),("Ligurian Sea",int(PPD*0.3)),("Adriatic Sea",int(PPD*0.4))]
msf=shapefile.Reader(T+"nemar/ne_10m_geography_marine_polys.shp"); mf=[x[0] for x in msf.fields[1:]]
sea_polys={}
for sr in msf.iterShapeRecords():
    nm=sr.record[mf.index("name")]
    if nm not in [t for t,_ in SEA]: continue
    m=Image.new("L",(W,H),0); md=ImageDraw.Draw(m); sh=sr.shape; parts=list(sh.parts)+[len(sh.points)]
    for i in range(len(parts)-1):
        ring=[xy(x,y) for x,y in sh.points[parts[i]:parts[i+1]]]
        if len(ring)>=3: md.polygon(ring,fill=255)
    mk=(np.asarray(m)>0)&seam
    if mk.sum()>0: sea_polys[nm]=mk
report=[]
def place(r,text):
    im=r.pop("img"); img.alpha_composite(im,(int(r["x"]-im.size[0]/2),int(r["y"]-im.size[1]/2))); report.append((text,r))
for text,poly,mx in LABELS:
    if poly not in masks: report.append((text,"not in bbox")); continue
    r=fit_label(masks[poly],text,FONT,max_size=mx,kx=KX)
    if r is None: report.append((text,"FAIL")); continue
    place(r,text)
for text,mx in SEA:
    if text not in sea_polys: report.append((text,"not in bbox")); continue
    r=fit_label(sea_polys[text],text,FONT,max_size=mx,min_size=12,italic=True,alpha=210,angle=0,kx=KX)
    if r is None: report.append((text,"SKIP (too small at this resolution)")); continue
    place(r,text)
print("LABEL REPORT"); [print(" ",t,r) for t,r in report]
fails=[t for t,r in report if r=="FAIL"]
img.convert("RGB").save(T+"basecolor.png")
rough=np.where(seam,0.3,0.8).astype(f32)
for mk in masks.values(): rough[mk]=0.55
Image.fromarray((rough*255).astype(np.uint8)).save(T+"rough.png")
json.dump({"bbox":[LON0,LAT0,LON1,LAT1],"W":W,"H":H,"PPD":PPD,"KX":KX,"GX":GX,"GY":GY},open(T+"meta.json","w"))
if fails: raise SystemExit("LABELS NOT FITTED: %s"%fails)
print("textures ok",W,H)
