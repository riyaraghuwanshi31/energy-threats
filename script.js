const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const loadingEl = document.getElementById('loading');

const COLORS = ['#ff3cac','#00eaff','#39ff6a','#ff8c00','#bf00ff'];
const COLORS_RGB = [[255,60,172],[0,234,255],[57,255,106],[255,140,0],[191,0,255]];
const FINGERTIPS = [4,8,12,16,20];

let handsData = [];
let time = 0;

function resize(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

function toC(lm){
  return {
    x:(1-lm.x)*canvas.width,
    y:lm.y*canvas.height
  };
}

function convexHull(pts){
  if(pts.length<3) return pts;
  let s = pts.reduce((a,b)=>a.x<b.x?a:b);
  let hull=[],cur=s;
  do{
    hull.push(cur);
    let nxt=pts[0];
    for(let p of pts){
      let cr=(nxt.x-cur.x)*(p.y-cur.y)-(nxt.y-cur.y)*(p.x-cur.x);
      if(nxt===cur||cr<0) nxt=p;
    }
    cur=nxt;
  } while(cur!==s && hull.length<=pts.length+2);
  return hull;
}

function drawCrystal(lms, alpha){
  const pts = lms.map(lm=>toC(lm));
  const hull = convexHull(pts);
  if(hull.length<3) return;

  const cx=hull.reduce((s,p)=>s+p.x,0)/hull.length;
  const cy=hull.reduce((s,p)=>s+p.y,0)/hull.length;

  ctx.save();
  ctx.globalAlpha=alpha*0.07;
  ctx.beginPath();
  ctx.moveTo(hull[0].x,hull[0].y);
  hull.forEach(p=>ctx.lineTo(p.x,p.y));
  ctx.closePath();
  ctx.fillStyle='#ffffff';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha=alpha*0.75;

  for(let i=0;i<hull.length;i++){
    const a=hull[i], b=hull[(i+1)%hull.length];
    const c=COLORS[i%COLORS.length];
    ctx.shadowColor=c;
    ctx.shadowBlur=10;
    ctx.strokeStyle=c;
    ctx.lineWidth=1.3;
    ctx.beginPath();
    ctx.moveTo(a.x,a.y);
    ctx.lineTo(b.x,b.y);
    ctx.stroke();
  }

  ctx.globalAlpha=alpha*0.18;
  hull.forEach((p,i)=>{
    ctx.strokeStyle=COLORS[i%COLORS.length];
    ctx.shadowColor=COLORS[i%COLORS.length];
    ctx.shadowBlur=8;
    ctx.lineWidth=0.6;
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.lineTo(p.x,p.y);
    ctx.stroke();
  });

  ctx.restore();
}

function drawDot(x,y,color,r,a){
  ctx.save();
  ctx.globalAlpha=a;
  ctx.shadowColor=color;
  ctx.shadowBlur=22;

  ctx.beginPath();
  ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fillStyle=color;
  ctx.fill();

  ctx.shadowBlur=5;
  ctx.beginPath();
  ctx.arc(x,y,r*0.38,0,Math.PI*2);
  ctx.fillStyle='#fff';
  ctx.fill();

  ctx.restore();
}

function drawThread(x1,y1,x2,y2,color,bright,lw,a){
  const dist=Math.hypot(x2-x1,y2-y1);
  const maxD=Math.hypot(canvas.width,canvas.height)*0.7;
  const stretch=Math.min(dist/maxD,1);

  const mx=(x1+x2)/2, my=(y1+y2)/2;
  const dx=x2-x1, dy=y2-y1;
  const len=Math.sqrt(dx*dx+dy*dy)||1;

  const nx=-dy/len, ny=dx/len;
  const wave=Math.sin(time*2.5+stretch*8)*stretch*9;

  const qx=mx+nx*wave, qy=my+ny*wave;

  const glow=bright?(0.45+stretch*0.55):0.28;
  const blur=bright?(12+stretch*26):5;

  ctx.save();
  ctx.globalAlpha=a*glow;
  ctx.shadowColor=color;
  ctx.shadowBlur=blur;
  ctx.strokeStyle=color;
  ctx.lineWidth=lw;
  ctx.lineCap='round';

  ctx.beginPath();
  ctx.moveTo(x1,y1);
  ctx.quadraticCurveTo(qx,qy,x2,y2);
  ctx.stroke();

  if(bright){
    ctx.globalAlpha=a*glow*0.45;
    ctx.shadowBlur=blur*0.3;
    ctx.lineWidth=lw*0.3;
    ctx.strokeStyle='#fff';

    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.quadraticCurveTo(qx,qy,x2,y2);
    ctx.stroke();
  }

  ctx.restore();
}

function blend(i,j){
  const a=COLORS_RGB[i], b=COLORS_RGB[j];
  return `rgb(${Math.round((a[0]+b[0])/2)},${Math.round((a[1]+b[1])/2)},${Math.round((a[2]+b[2])/2)})`;
}

function render(){
  time+=0.016;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle='rgba(0,0,0,0.3)';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  const pulse=Math.sin(time*2)*0.5+0.5;

  if(handsData.length===2){
    statusEl.style.display='none';

    const lms0=handsData[0].landmarks;
    const lms1=handsData[1].landmarks;

    drawCrystal(lms0,0.82+pulse*0.18);
    drawCrystal(lms1,0.82+pulse*0.18);

    const t0=FINGERTIPS.map(i=>toC(lms0[i]));
    const t1=FINGERTIPS.map(i=>toC(lms1[i]));

    for(let i=0;i<5;i++) for(let j=0;j<5;j++){
      if(i===j) continue;
      drawThread(t0[i].x,t0[i].y,t1[j].x,t1[j].y,blend(i,j),false,0.75,0.22);
    }

    for(let h=0;h<2;h++){
      const t=h===0?t0:t1;
      for(let i=0;i<5;i++) for(let j=i+1;j<5;j++){
        drawThread(t[i].x,t[i].y,t[j].x,t[j].y,blend(i,j),false,0.55,0.14);
      }
    }

    for(let i=0;i<5;i++){
      drawThread(t0[i].x,t0[i].y,t1[i].x,t1[i].y,COLORS[i],true,2.4,1.0);
    }

    for(let i=0;i<5;i++){
      drawDot(t0[i].x,t0[i].y,COLORS[i],7,0.95);
      drawDot(t1[i].x,t1[i].y,COLORS[i],7,0.95);
    }

  } else {
    statusEl.style.display='block';

    if(handsData.length===1){
      statusEl.innerHTML='One hand detected<div class="sub">show your other hand to activate</div>';
      const lms=handsData[0].landmarks;

      drawCrystal(lms,0.5);

      FINGERTIPS.forEach((fi,i)=>{
        const p=toC(lms[fi]);
        drawDot(p.x,p.y,COLORS[i],5,0.5);
      });

    } else {
      statusEl.innerHTML='Show both hands<div class="sub">bring close · pull apart · feel the energy</div>';
    }
  }

  requestAnimationFrame(render);
}

// MediaPipe setup
const handsMP = new Hands({
  locateFile: f=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
});

handsMP.setOptions({
  maxNumHands:2,
  modelComplexity:1,
  minDetectionConfidence:0.7,
  minTrackingConfidence:0.6
});

handsMP.onResults(results=>{
  handsData=[];
  if(results.multiHandLandmarks){
    results.multiHandLandmarks.forEach((lm,i)=>{
      handsData.push({
        landmarks:lm,
        handedness:results.multiHandedness[i]
      });
    });
  }
});

async function startCamera(){
  try{
    const stream=await navigator.mediaDevices.getUserMedia({
      video:{
        width:{ideal:1280},
        height:{ideal:720},
        facingMode:'user'
      }
    });

    video.srcObject=stream;

    video.onloadedmetadata=()=>{
      video.play();
      loadingEl.style.display='none';
      statusEl.style.display='block';

      render();

      const cam=new Camera(video,{
        onFrame:async()=>{ await handsMP.send({image:video}); },
        width:1280,
        height:720
      });

      cam.start();
    };

  } catch(e){
    loadingEl.innerHTML='<span style="color:#ff5555">Camera access denied</span><br><span style="font-size:10px;color:rgba(255,255,255,0.3)">Allow camera permission and reload</span>';
  }
}

startCamera();
