import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import detector from 'js-aruco2';
import {estimatePose} from '../src/ar/pose.ts';
import {MARKER_ID} from '../backend/world.mjs';

const {AR}=detector;
const read=()=>readFileSync(new URL('../public/ar/marker.svg',import.meta.url),'utf8');
const close=(a,b,eps=1e-9)=>a.forEach((v,i)=>assert(Math.abs(v-b[i])<eps,String(a)+' ≠ '+String(b)));
test('distributed print marker matches detector at all four rotations',()=>{
  const svg=read();
  assert.equal(svg,new AR.Dictionary('ARUCO_MIP_36h12').generateSVG(MARKER_ID));
  const squares=[...svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" fill="(white|black)"/g)];
  const width=460,height=360,grid=18, left=120,top=70;
  for(let rotation=0;rotation<4;rotation++){
    const pixels=new Uint8ClampedArray(width*height*4).fill(239);
    for(const [_,x,y,w,h,color] of squares)for(let gy=+y;gy<+y+ +h;gy++)for(let gx=+x;gx<+x+ +w;gx++){
      let dx=gx,dy=gy;
      for(let i=0;i<rotation;i++) [dx,dy]=[9-dy,dx];
      for(let py=top+dy*grid;py<top+(dy+1)*grid;py++)for(let px=left+dx*grid;px<left+(dx+1)*grid;px++){
        const j=(py*width+px)*4;
        pixels[j]=pixels[j+1]=pixels[j+2]=color==='white'?255:0;
        pixels[j+3]=255;
      }
    }
    const m=new AR.Detector({dictionaryName:'ARUCO_MIP_36h12',maxHammingDistance:2}).detect({width,height,data:pixels}).find(x=>x.id===MARKER_ID);
    assert(m,'marker not found on rotation '+rotation);
    assert(estimatePose(m.corners,width,height,410));
    const expected=[[138,88],[281,88],[281,231],[138,231]][rotation];
    close([m.corners[0].x,m.corners[0].y],expected,2);
  }
});
test('estimated marker transform matches a synthetic tilted camera pose',()=>{
  const W=640,H=480,F=520, theta=.51,c=Math.cos(theta),s=Math.sin(theta);
  const pos=[.19,-.08,3.2];
  const corners=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].map(([x,y])=>({
    x:W/2+F*(pos[0]+x)/(pos[2]+s*y),
    y:H/2+F*(pos[1]+c*y)/(pos[2]+s*y),
  }));
  const p=estimatePose(corners,W,H,F);
  assert(p);
  close(p.position,[pos[0],-pos[1],-pos[2]]);
  close(p.right,[1,0,0]); close(p.up,[0,-s,c]); close(p.front,[0,-c,-s]);
  assert.equal(estimatePose(Array(4).fill({x:1,y:2}),W,H,F),null);
});
