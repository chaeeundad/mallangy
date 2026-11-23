document.querySelector('#print').addEventListener('click', () => window.print());
const chooser=document.querySelector('#number'), img=document.querySelector('#marker'), cap=document.querySelector('#caption'), save=document.querySelector('#save');
let current;
const dictionary=new window.AR.Dictionary("ARUCO_MIP_36h12");
function choose(value){
  const n=Number(value);
  if(value===""||!Number.isInteger(n)||n<0||n>249)return;
  const number=String(n).padStart(3,"0");
  const src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(dictionary.generateSVG(n));
  if(current!==n)img.src=save.href=src;
  current=n;
  chooser.value=n;
  cap.textContent="말랑말랑 친구들 · 카드 "+number;
  save.download="mallangy-marker-"+number+".svg";
}
chooser.addEventListener('change',()=>choose(chooser.value));
choose(new URL(location.href).searchParams.get('id')||"42");
