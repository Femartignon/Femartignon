from PIL import Image, ImageOps, ImageFilter, ImageEnhance
import numpy as np
src = Image.open('/root/.claude/uploads/cf73b9ee-726c-5906-88f3-bcf44900ebbb/99a2cc72-image.jpg').convert('RGB')
k = 1.288
box = tuple(int(v*k) for v in (0, 140, 1000, 672))
im = src.crop(box).resize((806, 428), Image.LANCZOS)
L = np.asarray(ImageOps.autocontrast(im.convert('L'), cutoff=1)).astype(float)/255
L = np.clip((L-0.15)/0.85, 0, 1) ** 1.35
stops = [(0,'#060d1f'),(0.30,'#13203f'),(0.55,'#3a1d3c'),(0.75,'#9a2a2c'),(0.9,'#e2592b'),(1,'#ffb36b')]
def h(c): return np.array([int(c[i:i+2],16) for i in (1,3,5)], float)
xs = [s[0] for s in stops]; cs = np.stack([h(s[1]) for s in stops])
out = np.stack([np.interp(L, xs, cs[:,i]) for i in range(3)], -1)
# céu: escurece de cima para baixo (azul-marinho no topo, brilho no horizonte)
y = np.linspace(0,1,428)[:,None,None]
top = h('#0b1730')
w = np.clip(1 - y/0.45, 0, 1) ** 1.4
out = out*(1-w*0.7) + top*w*0.7
Image.fromarray(out.astype('uint8')).save('v6/img/rio-entardecer.webp', quality=78, method=6)
Image.fromarray(out.astype('uint8')).save('v6/img/check.png')
