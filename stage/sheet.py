import sys,glob,os
from PIL import Image, ImageDraw
lib,t=sys.argv[1],sys.argv[2]; names=sys.argv[3:]
fs=sorted(glob.glob(f'out/{lib}/*-{t}.thumb.png'))
if names: fs=[f for f in fs if os.path.basename(f).replace(f'-{t}.thumb.png','') in names]
cols=6; W=240; H=150
for page in range(0,len(fs),36):
  chunk=fs[page:page+36]; rows=(len(chunk)+cols-1)//cols
  S=Image.new('RGB',(cols*(W+6)+6,rows*(H+20)+6),'#888'); d=ImageDraw.Draw(S)
  for k,f in enumerate(chunk):
    x=6+(k%cols)*(W+6); y=6+(k//cols)*(H+20)
    S.paste(Image.open(f).convert('RGB').resize((W,H)),(x,y)); d.text((x,y+H+3),os.path.basename(f).replace(f'-{t}.thumb.png','')[:34],fill='black')
  S.save(f'sheet-{lib}-{t}-{page//36}.png'); print(f'sheet-{lib}-{t}-{page//36}.png')
