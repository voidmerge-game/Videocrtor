"""Automatic on-surface label placement with machine verification.
fit_label(mask, text, font_path, ...) -> dict(x,y,angle,size,outside=0) or None
Rule: every text pixel (alpha>0 after halo) must lie inside the polygon mask.
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from scipy.ndimage import distance_transform_edt

def render_text(text, font_path, size, italic=False, alpha=235):
    f=ImageFont.truetype(font_path,size); pad=size
    tw,th=f.getbbox(text)[2:]
    im=Image.new("RGBA",(tw+2*pad,th+2*pad),(0,0,0,0)); d=ImageDraw.Draw(im)
    d.text((pad,pad),text,font=f,fill=(20,25,30,255),stroke_width=max(2,size//14),stroke_fill=(20,25,30,255))
    im=im.filter(ImageFilter.GaussianBlur(size/10)); d=ImageDraw.Draw(im)
    d.text((pad,pad),text,font=f,fill=(255,255,255,alpha),stroke_width=max(1,size//40),stroke_fill=(60,60,60,alpha))
    if italic: im=im.transform(im.size,Image.AFFINE,(1,0.22,-0.22*im.size[1]/2,0,1,0),Image.BICUBIC)
    return im

def principal_angle(mask):
    ys,xs=np.nonzero(mask)
    if len(xs)<10: return 0.0
    x=xs-xs.mean(); y=ys-ys.mean(); cov=np.cov(np.vstack([x,y]))
    w,v=np.linalg.eigh(cov); vx,vy=v[:,np.argmax(w)]
    ang=np.degrees(np.arctan2(-vy,vx))  # image y down -> negate
    if ang>90: ang-=180
    if ang<-90: ang+=180
    return float(np.clip(ang,-80,80))

def outside_count(mask, im, cx, cy):
    a=np.asarray(im)[...,3]>8
    h,w=a.shape; x0=int(round(cx-w/2)); y0=int(round(cy-h/2))
    H,W=mask.shape
    if x0<0 or y0<0 or x0+w>W or y0+h>H: return int(a.sum())
    sub=mask[y0:y0+h,x0:x0+w]
    return int((a & ~sub).sum())

def fit_label(mask, text, font_path, max_size=64, min_size=14, italic=False, alpha=235, angle=None, prefer=None):
    """mask: bool HxW. prefer: optional (x,y) hint; else pole of inaccessibility."""
    mask=mask.astype(bool).copy()
    mask[0,:]=mask[-1,:]=False; mask[:,0]=mask[:,-1]=False  # image border counts as outside
    if mask.sum()<50: return None
    dist=distance_transform_edt(mask)
    if prefer is None:
        cy,cx=np.unravel_index(np.argmax(dist),dist.shape)
    else:
        cx,cy=prefer
        # snap to nearest deep point within 120px window
        x0,x1=max(0,int(cx)-120),min(mask.shape[1],int(cx)+120); y0,y1=max(0,int(cy)-120),min(mask.shape[0],int(cy)+120)
        sub=dist[y0:y1,x0:x1]; yy,xx=np.unravel_index(np.argmax(sub),sub.shape); cx,cy=x0+xx,y0+yy
    angs=[angle] if angle is not None else [principal_angle(mask),0.0]
    for ang in angs:
        for size in range(max_size,min_size-1,-2):
            im=render_text(text,font_path,size,italic,alpha).rotate(ang,expand=True,resample=Image.BICUBIC)
            # try centre, then small nudges along the shape
            for dx,dy in [(0,0),(-size,0),(size,0),(0,-size//2),(0,size//2),(-2*size,0),(2*size,0)]:
                out=outside_count(mask,im,cx+dx,cy+dy)
                if out==0:
                    return {"x":float(cx+dx),"y":float(cy+dy),"angle":float(ang),"size":size,"outside":0,"img":im}
    return None
