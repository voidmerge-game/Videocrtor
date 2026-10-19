import os, sys, time, math
import bpy, numpy as np
T=os.environ.get("TEX","/var/tmp/bl/tex/"); OUT=os.environ.get("OUT","/var/tmp/bl/render_test.png")
RES=int(os.environ.get("RES","1920")); SAMPLES=int(os.environ.get("SAMPLES","48"))
import json
M=json.load(open(T+'meta.json')); LON0,LAT0,LON1,LAT1=M['bbox']; KX=M['KX']; SX=(LON1-LON0)*KX; SY=(LAT1-LAT0)
GX,GY=M["GX"],M["GY"]; ZMAX=float(os.environ.get("ZMAX","0.35"))
def lonlat(lon,lat): return ((lon-(LON0+LON1)/2)*KX, lat-(LAT0+LAT1)/2)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene; sc.render.engine='CYCLES'; sc.cycles.device='CPU'; sc.cycles.samples=SAMPLES
sc.cycles.use_denoising=(os.environ.get('DENOISE','1')=='1'); sc.cycles.denoiser='OPENIMAGEDENOISE'; sc.render.threads_mode='AUTO'
sc.render.resolution_x=RES; sc.render.resolution_y=RES*9//16; sc.render.film_transparent=False
sc.view_settings.view_transform='Standard'; sc.view_settings.look='None'
# --- terrain grid
hz=np.load(T+"h_grid.npy")*ZMAX
bpy.ops.mesh.primitive_grid_add(x_subdivisions=GX-1,y_subdivisions=GY-1,size=1)
ob=bpy.context.object; ob.name="Map"; ob.scale=(SX,SY,1); me=ob.data
co=np.empty(len(me.vertices)*3,dtype=np.float32); me.vertices.foreach_get("co",co); co=co.reshape(-1,3)
# grid verts ordered row-major from -y to +y ; our hz row 0 = north -> flip
zz=np.flipud(hz).reshape(-1); co[:,2]=zz; me.vertices.foreach_set("co",co.reshape(-1)); me.update()
for p in me.polygons: p.use_smooth=True
# --- material
mat=bpy.data.materials.new("MapMat"); mat.use_nodes=True; nt=mat.node_tree; bsdf=nt.nodes["Principled BSDF"]
def img(name,cs):
    n=nt.nodes.new("ShaderNodeTexImage"); n.image=bpy.data.images.load(T+name); n.image.colorspace_settings.name=cs; n.interpolation='Cubic'; return n
c=img("basecolor.png","sRGB"); r=img("rough.png","Non-Color")
nt.links.new(c.outputs[0],bsdf.inputs["Base Color"]); nt.links.new(r.outputs[0],bsdf.inputs["Roughness"])
bsdf.inputs["Specular IOR Level"].default_value=0.35
ob.data.materials.append(mat)
# --- signpost test near Lisbon
def post(lon,lat,label_h=1.0):
    x,y=lonlat(lon,lat); z=0.05
    bpy.ops.mesh.primitive_cylinder_add(radius=0.035,depth=1.3,location=(x,y,z+0.65)); pole=bpy.context.object
    m=bpy.data.materials.new("Wood"); m.diffuse_color=(0.25,0.15,0.08,1); m.use_nodes=True; m.node_tree.nodes["Principled BSDF"].inputs[0].default_value=(0.25,0.15,0.08,1); pole.data.materials.append(m)
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,y,z+1.25)); pl=bpy.context.object; pl.scale=(0.9,0.06,0.28); pl.rotation_euler=(TILT_R,0,0)
    m2=bpy.data.materials.new("Plaque"); m2.use_nodes=True; m2.node_tree.nodes["Principled BSDF"].inputs[0].default_value=(0.85,0.82,0.74,1); pl.data.materials.append(m2)
    bpy.ops.mesh.primitive_plane_add(size=1,location=(x,y-0.03,z+0.72)); bn=bpy.context.object; bn.scale=(0.7,1,0.9); bn.rotation_euler=(TILT_R,0,0)
    m3=bpy.data.materials.new("Banner"); m3.use_nodes=True; m3.node_tree.nodes["Principled BSDF"].inputs[0].default_value=(0.55,0.06,0.08,1); bn.data.materials.append(m3)
TILT_R=math.radians(float(os.environ.get('TILT','35')))
TILT_R=math.radians(float(os.environ.get('TILT','35')))
post(-9.1,38.7)
# --- safety backdrop (deep sea colour) under and around the map
bpy.ops.mesh.primitive_plane_add(size=2000,location=(0,0,-0.02)); bd=bpy.context.object; bd.name="Backdrop"
mb=bpy.data.materials.new("Backdrop"); mb.use_nodes=True; mb.node_tree.nodes["Principled BSDF"].inputs[0].default_value=(0.055,0.13,0.17,1); bd.data.materials.append(mb)
# --- light & world
bpy.ops.object.light_add(type='SUN',location=(0,0,30)); sun=bpy.context.object; sun.data.energy=3.4; sun.data.color=(1.0,0.97,0.92); sun.data.angle=math.radians(1.5)
sun.rotation_euler=(math.radians(42),0,math.radians(-35))
w=bpy.data.worlds.new("W"); sc.world=w; w.use_nodes=True; bg=w.node_tree.nodes["Background"]; bg.inputs[0].default_value=(0.55,0.62,0.68,1); bg.inputs[1].default_value=0.5
# --- camera: over Iberia, tilted 35deg from nadir, looking north
cx,cy=lonlat(float(os.environ.get("CLON","-3.5")),float(os.environ.get("CLAT","38.5"))); tilt=math.radians(float(os.environ.get("TILT","35"))); dist=float(os.environ.get("DIST","19"))
bpy.ops.object.camera_add(location=(cx,cy-math.sin(tilt)*dist,math.cos(tilt)*dist)); cam=bpy.context.object
cam.rotation_euler=(tilt,0,0); cam.data.lens=35; cam.data.sensor_width=36
cam.data.dof.use_dof=(os.environ.get('DOF','0')=='1'); cam.data.dof.focus_distance=dist; cam.data.dof.aperture_fstop=5.6
sc.camera=cam
def frustum_check():
    bpy.context.view_layer.update()
    fr=cam.data.view_frame(scene=sc); mw=cam.matrix_world; o=mw.translation; bad=[]
    for v in fr:
        p=mw@v; d=(p-o).normalized()
        if d.z>=-1e-6: bad.append(("horizon",None)); continue
        t=-o.z/d.z; hit=o+d*t
        if abs(hit.x)>SX/2*0.98 or abs(hit.y)>SY/2*0.98: bad.append(("off-map",(round(hit.x,1),round(hit.y,1))))
    if bad: raise SystemExit("FRUSTUM_FAIL %s (map %.1fx%.1f)"%(bad,SX,SY))
    print("FRUSTUM_OK")
frustum_check()
sc.render.filepath=OUT; sc.render.image_settings.file_format='PNG'
t=time.time(); bpy.ops.render.render(write_still=True); print("RENDER_SECONDS",round(time.time()-t,1),"res",RES,"samples",SAMPLES)
