"""Generate map textures for the Blender tilted-map probe.
Outputs into TEX dir: dem_eu.tif, basecolor.png, rough.png, h_{GX}x{GY}.npy
LOOK-TEST ONLY: political fills use modern Natural Earth countries as stand-ins.
"""
import os, sys, io, zipfile, urllib.request, numpy as np, tifffile, shapefile
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from scipy.ndimage import zoom
T=os.environ.get("TEX","/var/tmp/bl/tex/"); os.makedirs(T,exist_ok=True)
W,H=3000,1600; LON0,LON1,LAT0,LAT1=-15,60,25,65
FONT=os.environ.get("FONT","public/fonts/Cinzel.ttf")
def get(url,path):
    if os.path.exists(path) and os.path.getsize(path)>1000: return
    req=urllib.request.Request(url,headers={"User-Agent":"atlas-doc/1.0"})
    with urllib.request.urlopen(req,timeout=600) as r, open(path,"wb") as f: f.write(r.read())
get(f"https://gis.ngdc.noaa.gov/arcgis/rest/services/DEM_mosaics/DEM_all/ImageServer/exportImage?bbox={LON0},{LAT0},{LON1},{LAT1}&bboxSR=4326&imageSR=4326&size={W},{H}&format=tiff&pixelType=F32&noData=&interpolation=RS_BilinearInterpolation&f=image",T+"dem_eu.tif")
get("https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73751/world.topo.bathy.200407.3x5400x2700.jpg",T+"bm_5400.jpg")
get("https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_0_countries.zip",T+"ne_admin0.zip")
if not os.path.exists(T+"ne0"): zipfile.ZipFile(T+"ne_admin0.zip").extractall(T+"ne0")
def xy(lon,lat): return ((lon-LON0)/(LON1-LON0)*W, (LAT1-lat)/(LAT1-LAT0)*H)
dem=tifffile.imread(T+"dem_eu.tif").astype(np.float32)
h=np.clip(dem,0,None)
for GX,GY in [(900,480),(1500,800)]:
    np.save(T+f"h_{GX}x{GY}.npy",(zoom(h,(GY/h.shape[0],GX/h.shape[1]),order=1)/5000.0)**0.7)
bm=Image.open(T+"bm_5400.jpg"); px=5400/360
crop=bm.crop((int((LON0+180)*px),int((90-LAT1)*px),int((LON1+180)*px),int((90-LAT0)*px))).resize((W,H),Image.LANCZOS)
base=np.asarray(crop).astype(np.float32)/255
g=base.mean(axis=2,keepdims=True); land=base*0.75+g*0.25; land=land*0.92+0.06
sea_sh=np.array([0xb9,0xd4,0xdf])/255; sea_dp=np.array([0x5b,0x80,0x90])/255
d=np.clip(-dem,0,3000)/3000; t=np.sqrt(d)[...,None]; sea=sea_sh*(1-t)+sea_dp*t
mask=(dem<=0)[...,None]; col=np.where(mask,sea,land)
sf=shapefile.Reader(T+"ne0/ne_10m_admin_0_countries.shp"); fields=[f[0] for f in sf.fields[1:]]
fills={"Hungary":(0xc9,0xa9,0x3a),"Poland":(0x4a,0x86,0xa0),"Spain":(0x8e,0x39,0x62),"Morocco":(0x66,0xa6,0x6b),"Algeria":(0x9a,0xd0,0x5a)}
over=Image.new("RGBA",(W,H),(0,0,0,0)); od=ImageDraw.Draw(over); edge=Image.new("L",(W,H),0); ed=ImageDraw.Draw(edge)
for sr in sf.iterShapeRecords():
    name=sr.record[fields.index("ADMIN")]
    if name not in fills: continue
    sh=sr.shape; parts=list(sh.parts)+[len(sh.points)]
    for i in range(len(parts)-1):
        ring=[xy(x,y) for x,y in sh.points[parts[i]:parts[i+1]]]
        if len(ring)<3: continue
        od.polygon(ring,fill=fills[name]+(255,)); ed.line(ring+[ring[0]],fill=255,width=4)
ov=np.asarray(over).astype(np.float32)/255; a=ov[...,3:4]*0.78; col=col*(1-a)+ov[...,:3]*a
e=np.asarray(edge.filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32)/255; col=col*(1-e[...,None]*0.55)
img=Image.fromarray((np.clip(col,0,1)*255).astype(np.uint8)).convert("RGBA")
def label(text,lon,lat,size,angle=0,italic=False,alpha=235):
    f=ImageFont.truetype(FONT,size); pad=size; tw,th=f.getbbox(text)[2:]
    im=Image.new("RGBA",(tw+2*pad,th+2*pad),(0,0,0,0)); dd=ImageDraw.Draw(im)
    dd.text((pad,pad),text,font=f,fill=(20,25,30,255),stroke_width=max(2,size//14),stroke_fill=(20,25,30,255))
    im=im.filter(ImageFilter.GaussianBlur(size/10)); dd=ImageDraw.Draw(im)
    dd.text((pad,pad),text,font=f,fill=(255,255,255,alpha),stroke_width=max(1,size//40),stroke_fill=(60,60,60,alpha))
    if italic: im=im.transform(im.size,Image.AFFINE,(1,0.22,-0.22*im.size[1]/2,0,1,0),Image.BICUBIC)
    im=im.rotate(angle,expand=True,resample=Image.BICUBIC); x,y=xy(lon,lat)
    img.alpha_composite(im,(int(x-im.size[0]/2),int(y-im.size[1]/2)))
label("Castile",-4.2,40.6,64); label("Portugal",-8.2,39.6,34,angle=80); label("Marinid",-6.0,32.3,56,angle=-25)
label("Tlemcen",1.2,34.6,40,angle=-10); label("Alboran Sea",-3.2,36.1,26,italic=True,alpha=200)
label("Mediterranean Sea",4.5,38.3,28,italic=True,alpha=200); label("Bay of Biscay",-4.5,45.0,24,italic=True,alpha=200)
label("Hungary",19.3,47.2,48); label("Poland",19.5,52.0,48)
img.convert("RGB").save(T+"basecolor.png")
rough=np.where(mask[...,0],0.35,0.85); rough=np.where(ov[...,3]>0.5,0.6,rough)
Image.fromarray((rough*255).astype(np.uint8)).save(T+"rough.png"); print("textures ok")
