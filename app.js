const $=id=>document.getElementById(id);
let photoData=[],suppliers=[],currentId=null,recognition=null,activeMic=null,workCounter=0,accessibleFieldCounter=0,commandRecognition=null,voiceCommandQueue=Promise.resolve(),voiceControlOn=false,activeWorkIndex=0,pages=[],activePageIndex=0,renderingPage=false,autoSaveTimer=null,changeVersion=0,lastSavedVersion=0,isSaving=false,photoEditorState=null;
const fields=['projectTitle','projectDate','contactName','contactPhone','contactEmail','address','notes','supplier','hardwareRef','hardwareNeed'];
const workTypes=['','Fenêtre',"Porte d'entrée",'Porte intérieure','Porte de garage','Baie coulissante','Volet roulant motorisé','Volet roulant manuel','Volet bois','Store','Escalier','Parquet','Placard','Agencement','Garde-corps / main courante','Bardage','Vitrage','Autre'];
const materials=['','Bois','Aluminium','PVC','Acier','Mixte','Stratifié','Autre'];
const installs=['','Rénovation','Dépose totale','En tunnel','En applique',"Avec tapées d'isolation",'En feuillure','Neuf','Autre'];
const tapeThicknesses=['','100','120','140','160','180','200','Autre'];
const specificSchemas={
  'Parquet':[
    ['roomLength','Longueur de la pièce','m','decimal'],['roomWidth','Largeur de la pièce','m','decimal'],['roomArea','Surface calculée / relevée','m²','decimal'],
    ['parquetType','Type de parquet','Massif|Contrecollé|Stratifié|Autre','select'],['layingPattern','Sens / motif de pose','À l’anglaise|À bâtons rompus|Point de Hongrie|Dalles|Autre','select'],
    ['layingMethod','Mode de pose','Flottante|Collée|Clouée|Autre','select'],['boardSize','Dimensions des lames','mm','text'],['parquetThickness','Épaisseur du parquet','mm','decimal'],
    ['supportType','Support existant','Dalle béton|Chape|Plancher bois|Carrelage|Ancien parquet|Autre','select'],['supportState','État / planéité / humidité du support','À préciser','text'],
    ['skirting','Plinthes : type, hauteur et longueur','ml','text'],['thresholds','Seuils, raccords et jeux périphériques','À préciser','text'],['finish','Essence, teinte et finition','À préciser','text']
  ],
  'Escalier':[
    ['floorHeight','Hauteur sol fini à sol fini','mm','decimal'],['openingLength','Longueur de la trémie','mm','decimal'],['openingWidth','Largeur de la trémie','mm','decimal'],
    ['trimmerThickness','Épaisseur du linçoir','mm','decimal'],['slabThickness','Épaisseur plancher / dalle','mm','decimal'],['stairWidth','Largeur souhaitée de l’escalier','mm','decimal'],
    ['stairShape','Forme de l’escalier','Droit|Quart tournant bas|Quart tournant haut|Deux quarts tournants|Hélicoïdal|Escamotable|Autre','select'],['turnDirection','Sens du tournant en montant','Droite|Gauche|Sans objet','select'],
    ['stepCount','Nombre de marches existant / souhaité','Nombre','numeric'],['stepHeight','Hauteur de marche','mm','decimal'],['tread','Giron','mm','decimal'],
    ['headroom','Échappée disponible','mm','decimal'],['startingSpace','Reculement disponible','mm','decimal'],['stringer','Type de limon','À la française|Crémaillère|Central|Sans limon|Autre','select'],
    ['guardrail','Garde-corps / main courante','Description','text'],['stairMaterial','Essence / matériau / finition','Description','text']
  ],
  'Fenêtre':[['leafCount','Nombre de vantaux','Nombre','numeric'],['opening','Type d’ouverture','Fixe|À la française|Oscillo-battant|Soufflet|Coulissant|Autre','select'],['openingOther','Nature de la configuration','Ex. 2 vantaux et un fixe, avec allège','text'],['glazing','Composition du vitrage','Description','text'],['color','Couleur intérieure / extérieure','RAL / finition','text'],['ventilation','Entrée d’air','Débit / type','text']],
  "Porte d'entrée":[['openingDirection','Sens d’ouverture','Droite poussante|Gauche poussante|Droite tirante|Gauche tirante','select'],['clearPassage','Passage utile','mm','decimal'],['threshold','Type de seuil','PMR 20 mm|Standard|Autre','select'],['lock','Serrure / cylindre / contrôle d’accès','Description','text'],['glazing','Vitrage / panneau / imposte','Description','text'],['color','Couleur intérieure / extérieure','RAL / finition','text']],
  'Porte intérieure':[['openingDirection','Sens d’ouverture','Droite poussante|Gauche poussante|Va-et-vient|Coulissante','select'],['wallThickness','Épaisseur de cloison finie','mm','decimal'],['doorLeaf','Dimensions du vantail','mm','text'],['doorType','Type de porte','Isoplane|Postformée|Stratifiée|Hydrofuge|Coupe-feu|Acoustique|Autre','select'],['hardware','Quincaillerie / serrure','Description','text']],
  'Porte de garage':[['garageType','Type','Sectionnelle plafond|Sectionnelle latérale|Basculante|Enroulable|Battante|Autre','select'],['clearOpening','Baie / passage libre','mm','text'],['headroom','Retombée de linteau','mm','decimal'],['sideRoom','Écoinçons gauche / droite','mm','text'],['motorization','Manœuvre / motorisation','Manuelle|Motorisée radio|Autre','select']],
  'Baie coulissante':[['leafCount','Nombre de vantaux / rails','Description','text'],['glazing','Composition du vitrage','Description','text'],['clearPassage','Passage utile','mm','decimal'],['color','Couleur intérieure / extérieure','RAL / finition','text']],
  'Volet roulant motorisé':[['boxType','Type de coffre','Rénovation|Traditionnel|Bloc-baie|Tunnel|Existant','select'],['boxSize','Dimensions / accès du coffre','mm','text'],['guides','Coulisses / lame finale','Description','text'],['apron','Tablier : matière, lame, couleur','Description','text'],['motor','Moteur / commande / alimentation','Description','text']],
  'Volet roulant manuel':[['boxType','Type de coffre','Rénovation|Traditionnel|Bloc-baie|Tunnel|Existant','select'],['boxSize','Dimensions / accès du coffre','mm','text'],['operation','Manœuvre','Sangle|Tringle oscillante|Tirage direct|Autre','select'],['apron','Tablier : matière, lame, couleur','Description','text']],
  'Volet bois':[['leafCount','Nombre de vantaux','Nombre','numeric'],['shutterType','Type','Battant|Persienné|Plein|Barres et écharpes|Coulissant|Autre','select'],['hinges','Gonds / arrêts / espagnolette','Description','text'],['woodFinish','Essence et finition','Description','text']],
  'Store':[['storeType','Type de store','Screen extérieur|Banne|Enrouleur intérieur|Vénitien|Autre','select'],['fabric','Toile / coloris / transparence','Description','text'],['guides','Guidage / coulisses','Description','text'],['operation','Manœuvre / motorisation','Description','text']],
  'Placard':[['openingSize','Dimensions de la baie','mm','text'],['doorCount','Nombre de portes','Nombre','numeric'],['facadeType','Façade','Coulissante|Battante|Pliante|Sans façade|Autre','select'],['interiorLayout','Aménagement intérieur','Description','text'],['decor','Décor / finition','Description','text']],
  'Agencement':[['areaSize','Dimensions de la zone','mm','text'],['layoutUse','Usage / éléments à réaliser','Description','text'],['panels','Panneaux / épaisseurs / décors','Description','text'],['hardware','Quincailleries','Description','text'],['services','Passages techniques / réseaux','Description','text']],
  'Garde-corps / main courante':[['totalLength','Longueur totale','mm ou ml','text'],['dropHeight','Hauteur de chute','mm','decimal'],['guardHeight','Hauteur du garde-corps','mm','decimal'],['fixing','Type de fixation','À la française|À l’anglaise|Sur platine|Autre','select'],['infill','Remplissage / barreaudage','Description','text']],
  'Bardage':[['surface','Surface','m²','decimal'],['boardProfile','Profil / dimensions des lames','Description','text'],['support','Support / ossature','Description','text'],['insulation','Isolation / pare-pluie / ventilation','Description','text'],['finish','Essence / finition / coloris','Description','text']],
  'Vitrage':[['glassClearSize','Clair de vitrage','mm','text'],['glassMakeup','Composition du vitrage','Description','text'],['glassThickness','Épaisseur totale','mm','decimal'],['rebate','Feuillure / parcloses / calage','Description','text'],['access','Accès et moyen de levage','Description','text']]
};
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const opt=(arr,val='')=>arr.map(x=>`<option value="${esc(x)}" ${x===val?'selected':''}>${x||'Choisir…'}</option>`).join('');
function micButton(target){return `<button class="mic" type="button" data-target="${target}" aria-label="Dicter ce champ" title="Dicter ce champ">🎙️</button>`}
function associateLabels(root=document){root.querySelectorAll('label:not([for])').forEach(label=>{const control=label.parentElement?.querySelector('input:not([type="file"]),select,textarea');if(!control)return;if(!control.id)control.id='field-'+(++accessibleFieldCounter);label.htmlFor=control.id})}
function pageLabel(page,index){return `${index+1}. ${shown(page.type,page.other)||'Type à choisir'} (${page.works?.length||1})`}
function captureActivePage(){
  if(renderingPage||!pages.length||!pages[activePageIndex])return;
  const page=pages[activePageIndex];page.type=$('pageType').value;page.other=$('pageOther').value;
  page.works=workData().map(w=>({...w,type:page.type,other:page.other}));
}
function renderPageTabs(){
  const box=$('pageTabs');box.innerHTML='';pages.forEach((page,index)=>{const b=document.createElement('button');b.type='button';b.className='page-tab'+(index===activePageIndex?' active':'');b.textContent=pageLabel(page,index);b.onclick=()=>showPage(index);box.appendChild(b)});
  $('removePage').disabled=pages.length===1;
}
function showPage(index,capture=true){
  if(capture)captureActivePage();activePageIndex=Math.max(0,Math.min(index,pages.length-1));const page=pages[activePageIndex];renderingPage=true;
  $('pageType').value=page.type||'';$('pageOther').value=page.other||'';$('pageOtherWrap').classList.toggle('hidden',page.type!=='Autre');$('works').innerHTML='';
  (page.works?.length?page.works:[{}]).forEach(w=>addWork({...w,type:page.type||w.type||'',other:page.other||w.other||''}));renderingPage=false;activeWorkIndex=0;renderPageTabs();
}
function createPage(type='',other=''){
  captureActivePage();pages.push({id:Date.now()+Math.random(),type,other,works:[{type,other,qty:1}]});showPage(pages.length-1,false);scheduleAutosave();
}
function ensurePageForType(type){
  captureActivePage();let index=pages.findIndex(p=>p.type===type),created=false;if(index<0){pages.push({id:Date.now()+Math.random(),type,other:'',works:[{type,qty:1}]});index=pages.length-1;created=true}showPage(index,false);if(created)scheduleAutosave();
}
function normalizePages(project){
  if(Array.isArray(project.pages)&&project.pages.length)return project.pages.map((p,i)=>({id:p.id||Date.now()+i,type:p.type||'',other:p.other||'',works:Array.isArray(p.works)&&p.works.length?p.works:[{type:p.type||'',other:p.other||'',qty:1}]}));
  const grouped=[];legacyToWorks(project).forEach(work=>{let page=grouped.find(p=>p.type===(work.type||'')&&p.other===(work.other||''));if(!page){page={id:Date.now()+grouped.length,type:work.type||'',other:work.other||'',works:[]};grouped.push(page)}page.works.push(work)});return grouped.length?grouped:[{id:Date.now(),type:'',other:'',works:[{}]}];
}
function addWork(w={}){
  const page=pages[activePageIndex]||{},type=page.type||w.type||'',other=page.other||w.other||'';w={...w,type,other};
  const id='w'+(++workCounter),d=document.createElement('div');d.className='work-card';d.dataset.id=id;d._photos=Array.isArray(w.photos)?[...w.photos]:[];d._specific=w.specific||{};d._sketches=Array.isArray(w.sketches)&&w.sketches.length?[...w.sketches]:[w.sketch||''];d._activeSketch=0;
  d.innerHTML=`<div class="work-head"><h3>Ouvrage <span class="work-number"></span></h3><button class="danger remove-work" type="button">Supprimer</button></div>
  <div class="grid">
    <select class="wtype hidden" aria-hidden="true">${opt(workTypes,w.type)}</select><input class="wother hidden" value="${esc(w.other)}" aria-hidden="true">
    <div class="specific-fields hidden"></div>
    <div><label>Matériau</label><div class="field-with-mic"><select class="wmaterial">${opt(materials,w.material)}</select>${micButton(id+'-material')}</div></div>
    <div class="mother-wrap ${w.material==='Autre'?'':'hidden'}"><label>Autre matériau</label><div class="field-with-mic"><input class="mother" value="${esc(w.materialOther)}" placeholder="Préciser">${micButton(id+'-materialOther')}</div></div>
    <div><label>Type de pose</label><div class="field-with-mic"><select class="winstall">${opt(installs,w.install)}</select>${micButton(id+'-install')}</div></div>
    <div class="iother-wrap ${w.install==='Autre'?'':'hidden'}"><label>Autre pose</label><div class="field-with-mic"><input class="iother" value="${esc(w.installOther)}" placeholder="Préciser">${micButton(id+'-installOther')}</div></div>
    <div class="tape-wrap ${w.install==="Avec tapées d'isolation"?'':'hidden'}"><label>Épaisseur des tapées d’isolation</label><div class="field-with-mic"><select class="wtape">${opt(tapeThicknesses,w.tapeThickness)}</select>${micButton(id+'-tapeThickness')}</div></div>
    <div class="tape-other-wrap ${w.install==="Avec tapées d'isolation"&&w.tapeThickness==='Autre'?'':'hidden'}"><label>Autre épaisseur de tapées</label><div class="field-with-mic"><input class="wtape-other" value="${esc(w.tapeThicknessOther)}" inputmode="decimal" placeholder="mm">${micButton(id+'-tapeThicknessOther')}</div></div>
    <div><label>Largeur</label><div class="field-with-mic"><input class="ww" value="${esc(w.width)}" inputmode="decimal" placeholder="mm">${micButton(id+'-width')}</div></div>
    <div><label>Hauteur</label><div class="field-with-mic"><input class="wh" value="${esc(w.height)}" inputmode="decimal" placeholder="mm">${micButton(id+'-height')}</div></div>
    <div class="frame-size-wrap hidden" data-specific-wrap="frameSize"><label>Dimensions hors-tout</label><div class="field-with-mic"><input data-specific="frameSize" value="${esc(w.specific?.frameSize)}" inputmode="text" placeholder="Ex. 1230 x 1480 mm">${micButton(id+'-spec_frameSize')}</div></div>
    <div><label>Hauteur d'allège</label><div class="field-with-mic"><input class="wa" value="${esc(w.sill)}" inputmode="decimal" placeholder="mm">${micButton(id+'-sill')}</div></div>
    <div><label>Épaisseur mur / profondeur</label><div class="field-with-mic"><input class="wd" value="${esc(w.depth)}" inputmode="decimal" placeholder="mm">${micButton(id+'-depth')}</div></div>
    <div><label>Quantité</label><div class="field-with-mic"><input class="wq" value="${esc(w.qty||1)}" inputmode="numeric">${micButton(id+'-qty')}</div></div>
    <div><label>Repère / localisation</label><div class="field-with-mic"><input class="wloc" value="${esc(w.location)}" placeholder="Ex. Chambre 1, OB3...">${micButton(id+'-location')}</div></div>
    <div class="full"><label>Dimensions / cotes complémentaires</label><div class="field-with-mic"><textarea class="wextra" placeholder="Ex. clair de passage, hors-tout, réservation, coffre, jeux...">${esc(w.extra)}</textarea>${micButton(id+'-extra')}</div></div>
    <div class="full"><label>Observations sur l'ouvrage</label><div class="field-with-mic"><textarea class="wobs" placeholder="Finition, couleur, sens d'ouverture, vitrage, occultation, contraintes...">${esc(w.obs)}</textarea>${micButton(id+'-obs')}</div></div>
    <button class="voice-all" type="button">🎙️ Dicter toutes les informations de cet ouvrage</button>
    <div class="voice-help">Exemple : « longueur pièce 5 virgule 2 mètres », puis « largeur pièce 3 virgule 8 », puis « type parquet contrecollé ». Les champs sont remplis après chaque courte pause.</div>
    <details class="sketch-wrap"><summary class="sketch-summary">Croquis et cotes au doigt <span class="sketch-status" aria-live="polite"></span></summary><div class="sketch-body"><div class="sketch-pages"><select class="sketch-select" aria-label="Croquis actif"></select><button class="secondary add-sketch" type="button">+ Croquis</button><button class="danger remove-sketch" type="button">Supprimer</button></div><div class="sketch-tools"><button class="ghost pen tool-active" type="button" title="Dessin libre">✏️ Dessin</button><button class="ghost straight" type="button" title="Ligne droite">╱ Ligne droite</button><button class="ghost eraser" type="button" title="Gomme">⌫ Gomme</button><button class="ghost add-text" type="button" title="Ajouter une cote ou un texte propre">T Lettre / cote</button><button class="ghost undo-sketch" type="button" title="Annuler la dernière action">↶ Retour</button><button class="danger clear-sketch" type="button">Effacer</button></div><div class="sketch-settings"><div><label>Couleur</label><div class="color-swatches"><button class="color-swatch active" type="button" data-color="#111827" style="background:#111827" aria-label="Noir"></button><button class="color-swatch" type="button" data-color="#dc2626" style="background:#dc2626" aria-label="Rouge"></button><button class="color-swatch" type="button" data-color="#2563eb" style="background:#2563eb" aria-label="Bleu"></button><button class="color-swatch" type="button" data-color="#16a34a" style="background:#16a34a" aria-label="Vert"></button><button class="color-swatch" type="button" data-color="#f59e0b" style="background:#f59e0b" aria-label="Orange"></button></div></div><div><label>Épaisseur</label><select class="sketch-width"><option value="2">Fine</option><option value="4" selected>Moyenne</option><option value="8">Épaisse</option><option value="14">Très épaisse</option></select></div><div><label>Style</label><select class="sketch-style"><option value="solid">Continu</option><option value="dotted">Pointillé</option><option value="dashed">Tirets</option></select></div></div><canvas class="sketch-canvas"></canvas><div class="hint">« Lettre / cote » écrit proprement le texte à l’endroit touché. « Retour » annule le dernier trait, texte ou effacement.</div></div></details>
    <details class="work-photos full"><summary class="work-photos-summary">Photos de cet ouvrage <span class="work-photos-status">Aucune photo</span></summary><div class="work-photos-body"><label>Ajouter des photos</label><input class="wphotos" type="file" accept="image/*" capture="environment" multiple><div class="hint">Après la prise de vue, touchez « Ajouter à Photos », puis « Enregistrer l’image » dans la feuille de partage iPadOS.</div><div class="photo-grid wphoto-grid"></div></div></details>
  </div>`;
  d.querySelector('.remove-work').onclick=()=>{if(document.querySelectorAll('.work-card').length===1){alert('Il faut conserver au moins un ouvrage.');return}d.remove();renumberWorks();captureActivePage();renderPageTabs();scheduleAutosave()};
  d.querySelector('.wmaterial').onchange=e=>d.querySelector('.mother-wrap').classList.toggle('hidden',e.target.value!=='Autre');
  const refreshInstallFields=()=>{
    const install=d.querySelector('.winstall').value,tape=d.querySelector('.wtape').value,withTape=install==="Avec tapées d'isolation";
    d.querySelector('.iother-wrap').classList.toggle('hidden',install!=='Autre');
    d.querySelector('.tape-wrap').classList.toggle('hidden',!withTape);
    d.querySelector('.tape-other-wrap').classList.toggle('hidden',!withTape||tape!=='Autre');
    if(install!=='Autre')d.querySelector('.iother').value='';
    if(!withTape){d.querySelector('.wtape').value='';d.querySelector('.wtape-other').value=''}
    else if(tape!=='Autre')d.querySelector('.wtape-other').value='';
  };
  d.querySelector('.winstall').onchange=refreshInstallFields;d.querySelector('.wtape').onchange=refreshInstallFields;refreshInstallFields();
  d.querySelector('.wphotos').onchange=async e=>{for(const f of e.target.files){d._photos.push(await fileToDataURL(f))}e.target.value='';renderWorkPhotos(d);scheduleAutosave()};
  d.querySelector('.voice-all').onclick=()=>startFullVoice(d);
  $('works').appendChild(d);renumberWorks();renderSpecific(d,w.type||'');bindMics(d);associateLabels(d);renderWorkPhotos(d);initSketch(d);
}
function renumberWorks(){[...document.querySelectorAll('.work-card')].forEach((d,i)=>d.querySelector('.work-number').textContent=i+1)}
function specificData(d){const out={};d.querySelectorAll('[data-specific]').forEach(el=>out[el.dataset.specific]=el.value);return out}
function renderSpecific(d,type){
  Object.assign(d._specific,specificData(d));const frameSizeWrap=d.querySelector('.frame-size-wrap'),hasFrameSize=['Fenêtre','Baie coulissante'].includes(type);frameSizeWrap.classList.toggle('hidden',!hasFrameSize);if(!hasFrameSize)frameSizeWrap.querySelector('[data-specific="frameSize"]').value='';const box=d.querySelector('.specific-fields'),schema=specificSchemas[type]||[];box.innerHTML='';box.classList.toggle('hidden',!schema.length);if(!schema.length)return;
  box.innerHTML=`<div class="specific-title">Informations spécifiques — ${esc(type)}</div>`+schema.map(([key,label,choices,kind])=>{
    const value=d._specific[key]||'',target=d.dataset.id+'-spec_'+key;
    const control=kind==='select'?`<select data-specific="${key}"><option value="">Choisir…</option>${choices.split('|').map(x=>`<option ${x===value?'selected':''}>${esc(x)}</option>`).join('')}</select>`:`<input data-specific="${key}" value="${esc(value)}" inputmode="${kind==='decimal'?'decimal':kind==='numeric'?'numeric':'text'}" placeholder="${esc(choices)}">`;
    return `<div class="specific-field" data-specific-wrap="${key}"><label>${esc(label)}</label><div class="field-with-mic">${control}${micButton(target)}</div></div>`}).join('');bindMics(box);updateConditionalSpecificFields(d,type);
}
function updateConditionalSpecificFields(d,type){
  if(type!=='Fenêtre')return;const opening=d.querySelector('[data-specific="opening"]'),other=d.querySelector('[data-specific="openingOther"]'),wrap=d.querySelector('[data-specific-wrap="openingOther"]');if(!opening||!other||!wrap)return;
  const refresh=()=>{const visible=opening.value==='Autre';wrap.classList.toggle('hidden',!visible);if(!visible)other.value=''};opening.addEventListener('change',refresh);refresh();
}
function canvasPoint(canvas,e,width=canvas.width,height=canvas.height){
  const rect=canvas.getBoundingClientRect(),style=getComputedStyle(canvas),borderLeft=parseFloat(style.borderLeftWidth)||0,borderRight=parseFloat(style.borderRightWidth)||0,borderTop=parseFloat(style.borderTopWidth)||0,borderBottom=parseFloat(style.borderBottomWidth)||0,contentWidth=Math.max(1,rect.width-borderLeft-borderRight),contentHeight=Math.max(1,rect.height-borderTop-borderBottom);
  return{x:(e.clientX-rect.left-borderLeft)*width/contentWidth,y:(e.clientY-rect.top-borderTop)*height/contentHeight};
}
function initSketch(d){
  const details=d.querySelector('.sketch-wrap'),c=d.querySelector('.sketch-canvas'),ctx=c.getContext('2d'),select=d.querySelector('.sketch-select'),textButton=d.querySelector('.add-text'),status=d.querySelector('.sketch-status');let drawing=false,last=null,start=null,preview=null,mode='pen',color='#111827',pendingText='',paintVersion=0,dashDistance=0;
  const sketchHistory=d._sketches.map(saved=>[saved||'']);
  function refreshStatus(){const count=d._sketches.filter(Boolean).length;status.textContent=count?`${count} dessin${count>1?'s':''}`:'Aucun dessin'}
  function refreshSelect(){select.innerHTML=d._sketches.map((_,i)=>`<option value="${i}" ${i===d._activeSketch?'selected':''}>Croquis ${i+1}</option>`).join('');refreshStatus()}
  function point(e){return canvasPoint(c,e)}
  function drawingScale(){return ((c.width/Math.max(1,c.clientWidth))+(c.height/Math.max(1,c.clientHeight)))/2}
  function dash(){const scale=drawingScale(),style=d.querySelector('.sketch-style').value;return style==='dotted'?[2*scale,7*scale]:style==='dashed'?[12*scale,8*scale]:[]}
  function stroke(a,b,currentMode=mode,offset=0){const scale=drawingScale(),distance=Math.hypot(b.x-a.x,b.y-a.y);ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=currentMode==='eraser'?'#fff':color;ctx.lineWidth=(currentMode==='eraser'?26:Number(d.querySelector('.sketch-width').value))*scale;ctx.setLineDash(currentMode==='eraser'?[]:dash());ctx.lineDashOffset=-offset;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();return distance}
  function paintSaved(){const version=++paintVersion,saved=d._sketches[d._activeSketch]||'';ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);if(saved){const im=new Image();im.onload=()=>{if(version===paintVersion)ctx.drawImage(im,0,0,c.width,c.height)};im.src=saved}}
  function size(){const ratio=Math.max(1,window.devicePixelRatio||1);c.width=Math.max(1,Math.round(c.clientWidth*ratio));c.height=Math.max(1,Math.round(c.clientHeight*ratio));paintSaved()}
  function currentHistory(){return sketchHistory[d._activeSketch]||(sketchHistory[d._activeSketch]=[d._sketches[d._activeSketch]||''])}
  function recordSnapshot(data){d._sketches[d._activeSketch]=data;const history=currentHistory();if(history[history.length-1]!==data)history.push(data);if(history.length>16)history.shift();refreshStatus();scheduleAutosave()}
  function saveSketch(){recordSnapshot(c.toDataURL('image/png'))}
  function setMode(next){mode=next;pendingText='';d.querySelectorAll('.pen,.straight,.eraser,.add-text').forEach(button=>button.classList.remove('tool-active'));d.querySelector('.'+next).classList.add('tool-active')}
  c.onpointerdown=e=>{paintVersion++;if(pendingText){const p=point(e),scale=drawingScale();ctx.save();ctx.fillStyle=color;ctx.font='bold '+18*scale+'px sans-serif';ctx.textBaseline='bottom';ctx.fillText(pendingText,p.x,Math.max(20*scale,p.y));ctx.restore();pendingText='';textButton.classList.remove('tool-active');d.querySelector('.'+mode).classList.add('tool-active');saveSketch();e.preventDefault();return}drawing=true;dashDistance=0;start=last=point(e);preview=mode==='straight'?ctx.getImageData(0,0,c.width,c.height):null;c.setPointerCapture(e.pointerId);e.preventDefault()};
  c.onpointermove=e=>{if(!drawing)return;if(mode==='straight'){const p=point(e);ctx.putImageData(preview,0,0);stroke(start,p)}else{const samples=typeof e.getCoalescedEvents==='function'?e.getCoalescedEvents():[e];samples.forEach(sample=>{const p=point(sample);dashDistance+=stroke(last,p,mode,dashDistance);last=p})}e.preventDefault()};
  c.onpointerup=e=>{if(!drawing)return;const p=point(e),scale=drawingScale();if(mode==='straight'){ctx.putImageData(preview,0,0);stroke(start,p)}else if(last){const distance=Math.hypot(p.x-last.x,p.y-last.y);if(distance>0)dashDistance+=stroke(last,p,mode,dashDistance);else if(dashDistance===0)stroke({x:p.x-.5*scale,y:p.y},p,mode,0)}drawing=false;saveSketch();e.preventDefault()};
  c.onpointercancel=e=>{if(drawing){if(mode==='straight'&&preview)ctx.putImageData(preview,0,0);drawing=false}e.preventDefault()};
  d.querySelector('.pen').onclick=()=>setMode('pen');d.querySelector('.straight').onclick=()=>setMode('straight');d.querySelector('.eraser').onclick=()=>setMode('eraser');
  d.querySelectorAll('.color-swatch').forEach(button=>button.onclick=()=>{color=button.dataset.color;d.querySelectorAll('.color-swatch').forEach(item=>item.classList.toggle('active',item===button))});
  select.onchange=()=>{d._activeSketch=Number(select.value);pendingText='';textButton.classList.remove('tool-active');paintSaved()};
  d.querySelector('.add-sketch').onclick=()=>{d._sketches.push('');sketchHistory.push(['']);d._activeSketch=d._sketches.length-1;refreshSelect();paintSaved();scheduleAutosave()};
  d.querySelector('.remove-sketch').onclick=()=>{if(d._sketches.length===1){alert('Il faut conserver au moins un croquis.');return}if(confirm('Supprimer ce croquis ?')){d._sketches.splice(d._activeSketch,1);sketchHistory.splice(d._activeSketch,1);d._activeSketch=Math.max(0,d._activeSketch-1);refreshSelect();paintSaved();scheduleAutosave()}};
  d.querySelector('.clear-sketch').onclick=()=>{if(confirm('Effacer entièrement ce croquis ?')){recordSnapshot('');paintSaved()}};
  textButton.onclick=()=>{const text=prompt('Saisir la cote ou la lettre à ajouter :');if(!text?.trim())return;pendingText=text.trim();d.querySelectorAll('.pen,.straight,.eraser,.add-text').forEach(button=>button.classList.remove('tool-active'));textButton.classList.add('tool-active')};
  d.querySelector('.undo-sketch').onclick=()=>{const history=currentHistory();if(history.length<=1)return;history.pop();d._sketches[d._activeSketch]=history[history.length-1];pendingText='';textButton.classList.remove('tool-active');paintSaved();scheduleAutosave()};
  refreshSelect();if(details.open)requestAnimationFrame(size);details.addEventListener('toggle',()=>{if(details.open)requestAnimationFrame(size)});
}
function workData(){return [...document.querySelectorAll('.work-card')].map(d=>({
  type:d.querySelector('.wtype').value,other:d.querySelector('.wother').value,material:d.querySelector('.wmaterial').value,materialOther:d.querySelector('.mother').value,install:d.querySelector('.winstall').value,installOther:d.querySelector('.iother').value,tapeThickness:d.querySelector('.wtape').value,tapeThicknessOther:d.querySelector('.wtape-other').value,width:d.querySelector('.ww').value,height:d.querySelector('.wh').value,sill:d.querySelector('.wa').value,depth:d.querySelector('.wd').value,qty:d.querySelector('.wq').value,location:d.querySelector('.wloc').value,extra:d.querySelector('.wextra').value,obs:d.querySelector('.wobs').value,specific:specificData(d),sketch:d._sketches?.[0]||'',sketches:Array.isArray(d._sketches)?d._sketches:[],photos:Array.isArray(d._photos)?d._photos:[]}))}
function shown(v,other){return v==='Autre'?(other||'Autre'):v}
function tapeThicknessLabel(work){const value=shown(work.tapeThickness,work.tapeThicknessOther);return value&&value!=='Autre'?value+' mm':value}
function normalize(s){return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'')}
function setSelectByVoice(sel,text){const n=normalize(text);let best=[...sel.options].find(o=>normalize(o.textContent)===n)||[...sel.options].find(o=>normalize(o.textContent).includes(n)||n.includes(normalize(o.textContent)));if(best){sel.value=best.value;sel.dispatchEvent(new Event('change',{bubbles:true}));return true}return false}
function resolveMicTarget(key){
  if(!key.includes('-'))return $(key);
  const cut=key.indexOf('-'),id=key.slice(0,cut),field=key.slice(cut+1);const d=document.querySelector(`.work-card[data-id="${id}"]`);if(!d)return null;
  if(field.startsWith('spec_'))return d.querySelector(`[data-specific="${field.slice(5)}"]`);
  const map={type:'.wtype',other:'.wother',material:'.wmaterial',materialOther:'.mother',install:'.winstall',installOther:'.iother',tapeThickness:'.wtape',tapeThicknessOther:'.wtape-other',width:'.ww',height:'.wh',sill:'.wa',depth:'.wd',qty:'.wq',location:'.wloc',extra:'.wextra',obs:'.wobs'};return d.querySelector(map[field]);
}
function startVoice(target,btn){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){$('dictationStatus').textContent='Dictée non disponible sur ce navigateur.';return}
  if(recognition)try{recognition.stop()}catch(e){}
  recognition=new SR();recognition.lang='fr-FR';recognition.continuous=false;recognition.interimResults=false;activeMic=btn;btn.classList.add('listening');$('dictationStatus').textContent='Écoute en cours…';
  recognition.onresult=e=>{const text=e.results[e.results.length-1][0].transcript.trim();if(target.tagName==='SELECT'){if(!setSelectByVoice(target,text)){$('dictationStatus').textContent='Choix non reconnu : '+text}}else{const numeric=target.inputMode==='decimal'||target.inputMode==='numeric';const clean=numeric?text.replace(/\s/g,'').replace(/virgule/i,'.').replace(/[^0-9.,]/g,''):text;target.value=target.value&&target.tagName==='TEXTAREA'?target.value+' '+clean:clean;target.dispatchEvent(new Event('input',{bubbles:true}));}};
  recognition.onend=()=>{if(activeMic)activeMic.classList.remove('listening');activeMic=null;$('dictationStatus').textContent='Dictée terminée.'};recognition.onerror=()=>{$('dictationStatus').textContent='La dictée n’a pas pu être utilisée.'};recognition.start();
}
function voiceAliases(key,label){const custom={roomLength:['longueur piece','longueur de la piece'],roomWidth:['largeur piece','largeur de la piece'],roomArea:['surface'],parquetType:['type parquet'],layingPattern:['motif de pose','sens de pose'],layingMethod:['mode de pose','pose'],parquetThickness:['epaisseur parquet'],floorHeight:['hauteur a monter','hauteur sol fini'],openingLength:['longueur tremie'],openingWidth:['largeur tremie'],trimmerThickness:['epaisseur lincoir','lincoir'],slabThickness:['epaisseur plancher','epaisseur dalle'],stairWidth:['largeur escalier'],stairShape:['forme escalier','type escalier'],turnDirection:['sens tournant'],stepCount:['nombre marches'],stepHeight:['hauteur marche'],tread:['giron'],headroom:['echappee'],startingSpace:['reculement']};const plain=label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();return custom[key]||[plain]}
function voiceNumber(value,unit=''){
  const targetMeters=unit==='m'||unit==='m²';let text=value.replace(/virgule/g,'.').replace(/(\d)\s+(?=\d{3}\b)/g,'$1');
  let match=text.match(/(\d+(?:[.,]\d+)?)\s*(?:metres?|m)\b(?:\s*(\d{1,2}))?/);
  if(match){let meters=Number(match[1].replace(',','.'));if(match[2]&&!match[1].includes('.')&&!match[1].includes(','))meters+=Number(match[2])/100;return String(targetMeters?Math.round(meters*1000)/1000:Math.round(meters*1000))}
  match=text.match(/(\d+(?:[.,]\d+)?)\s*(?:centimetres?|cm)\b/);if(match){const amount=Number(match[1].replace(',','.'));return String(targetMeters?amount/100:Math.round(amount*10))}
  match=text.match(/(\d+(?:[.,]\d+)?)\s*(?:millimetres?|mm)\b/);if(match){const amount=Number(match[1].replace(',','.'));return String(targetMeters?amount/1000:amount)}
  match=text.match(/\d+(?:[.,]\d+)?/);return match?match[0].replace(',','.'):'';
}
function fillVoiceFields(d,spoken){
  const type=d.querySelector('.wtype').value,schema=specificSchemas[type]||[],text=spoken.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').replace(/[^a-z0-9,. ]/g,' ').replace(/\s+/g,' ').trim();
  const installAliases=schema.some(([key])=>key==='layingMethod')?['type de pose','installation']:['type de pose','mode de pose','pose','installation'];
  const common=[
    {key:'material',aliases:['materiau','matiere'],el:d.querySelector('.wmaterial')},
    {key:'install',aliases:installAliases,el:d.querySelector('.winstall')},
    {key:'tapeThickness',aliases:['epaisseur des tapees','epaisseur tapees','tapees isolation'],el:d.querySelector('.wtape')},
    {key:'tapeThicknessOther',aliases:['autre epaisseur de tapees'],el:d.querySelector('.wtape-other'),unit:'mm'},
    {key:'width',aliases:['largeur hors tout','largeur'],el:d.querySelector('.ww'),unit:'mm'},
    {key:'height',aliases:['hauteur hors tout','hauteur'],el:d.querySelector('.wh'),unit:'mm'},
    {key:'sill',aliases:['hauteur allege','allege'],el:d.querySelector('.wa'),unit:'mm'},
    {key:'depth',aliases:['epaisseur du mur','epaisseur mur','profondeur'],el:d.querySelector('.wd'),unit:'mm'},
    {key:'qty',aliases:['quantite','nombre ouvrages'],el:d.querySelector('.wq'),unit:'Nombre'},
    {key:'location',aliases:['repere localisation','localisation','repere'],el:d.querySelector('.wloc')},
    {key:'extra',aliases:['dimensions complementaires','cotes complementaires'],el:d.querySelector('.wextra')},
    {key:'obs',aliases:['observations','observation','remarque'],el:d.querySelector('.wobs'),append:true}
  ];
  const entries=common.concat(schema.map(([key,label,unit])=>({key,aliases:voiceAliases(key,label),unit,el:d.querySelector('[data-specific="'+key+'"]')}))).filter(entry=>entry.el);
  const hits=[];entries.forEach(entry=>entry.aliases.forEach(alias=>{let from=0,index;while((index=text.indexOf(alias,from))>=0){const before=text[index-1],after=text[index+alias.length];if((!before||/[^a-z0-9]/.test(before))&&(!after||/[^a-z0-9]/.test(after)))hits.push({i:index,alias,entry});from=index+alias.length}}));
  hits.sort((a,b)=>a.i-b.i||b.alias.length-a.alias.length);
  const unique=[];hits.forEach(hit=>{if(unique.some(item=>item.entry===hit.entry))return;if(unique.some(item=>hit.i>=item.i&&hit.i<item.i+item.alias.length))return;unique.push(hit)});
  unique.sort((a,b)=>a.i-b.i);let count=0;
  unique.forEach((hit,index)=>{
    let value=text.slice(hit.i+hit.alias.length,unique[index+1]?.i??text.length).replace(/^(est|de|du|a|:| )+/,'').replace(/\b(puis|et ensuite)\b.*$/,'').replace(/[,. ]+$/,'').trim();if(!value)return;
    const {el,unit,append}=hit.entry;
    if(el.tagName==='SELECT'){if(setSelectByVoice(el,value))count++}
    else{if(el.inputMode==='decimal'||el.inputMode==='numeric')value=voiceNumber(value,unit);if(value){el.value=append&&el.value?(el.value+' '+value).trim():value;el.dispatchEvent(new Event('input',{bubbles:true}));count++}}
  });
  if(count)scheduleAutosave();return count;
}
function startFullVoice(d){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){$('dictationStatus').textContent='Dictée non disponible sur ce navigateur. Utilisez les micros placés à côté de chaque champ.';return}
  const btn=d.querySelector('.voice-all');if(btn.classList.contains('listening')&&recognition){recognition.stop();return}if(recognition)try{recognition.stop()}catch(e){}
  recognition=new SR();recognition.lang='fr-FR';recognition.continuous=true;recognition.interimResults=true;btn.classList.add('listening');btn.textContent='Arrêter la dictée';$('dictationStatus').textContent='Dictez une information, marquez une courte pause, puis continuez.';
  recognition.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++){const spoken=e.results[i][0].transcript.trim();if(e.results[i].isFinal){const count=fillVoiceFields(d,spoken);$('dictationStatus').textContent=count?count+' champ(s) rempli(s). Vous pouvez continuer.':'Phrase non reconnue : « '+spoken+' ». Dites par exemple « largeur 1200 ».'}else $('dictationStatus').textContent='Entendu : « '+spoken+'… »'}};
  recognition.onend=()=>{btn.classList.remove('listening');btn.textContent='Dicter toutes les informations de cet ouvrage';recognition=null};recognition.onerror=e=>{if(e.error!=='no-speech')$('dictationStatus').textContent='La dictée n’a pas pu être utilisée.'};recognition.start();
}
function commandText(s){return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').replace(/-/g,' ').replace(/\s+/g,' ').trim()}
function workAtCommand(text){const cards=[...document.querySelectorAll('.work-card')],m=text.match(/ouvrage\s+(\d+)/);if(m)activeWorkIndex=Math.min(cards.length-1,Math.max(0,Number(m[1])-1));return cards[activeWorkIndex]||cards[cards.length-1]}
function typeFromCommand(text){const aliases={fenetre:'Fenêtre','porte entree':"Porte d'entrée",'porte d entree':"Porte d'entrée",'porte interieure':'Porte intérieure','porte garage':'Porte de garage','baie coulissante':'Baie coulissante','volet roulant motorise':'Volet roulant motorisé','volet roulant manuel':'Volet roulant manuel','volet bois':'Volet bois',store:'Store',escalier:'Escalier',parquet:'Parquet',placard:'Placard',agencement:'Agencement','garde corps':'Garde-corps / main courante','main courante':'Garde-corps / main courante',bardage:'Bardage',vitrage:'Vitrage'};return Object.entries(aliases).sort((a,b)=>b[0].length-a[0].length).find(([a])=>text.includes(a))?.[1]||''}
function setSimpleVoiceField(id,text,prefixes){for(const p of prefixes){const i=text.indexOf(p);if(i>=0){const raw=text.slice(i+p.length).replace(/^(est|:|de| )+/,'').trim();if(raw){$(id).value=raw;$(id).dispatchEvent(new Event('input',{bubbles:true}));return true}}}return false}
function stopVoiceAssistant(message='Assistant vocal arrêté.'){
  voiceControlOn=false;if(commandRecognition)try{commandRecognition.stop()}catch(e){}commandRecognition=null;const b=$('voiceAssistant');b.classList.remove('listening');b.textContent='🎙️ Assistant vocal';$('voiceFeedback').textContent=message;
}
async function openProjectByVoice(name){const projects=await allProjects(),n=normalize(name),p=projects.find(x=>normalize(x.projectTitle).includes(n)||normalize(x.contactName).includes(n));if(!p)return false;loadProject(p);return true}
async function executeVoiceCommand(spoken){
  const text=commandText(spoken),feedback=$('voiceFeedback');feedback.textContent=`Commande entendue : « ${spoken} »`;
  if(/arrete|stop|desactive/.test(text)){stopVoiceAssistant();return}
  if(/^(enregistre|sauvegarde)|enregistrer le chantier|sauvegarder le chantier/.test(text)){await save();feedback.textContent='✅ Chantier enregistré.';return}
  if(/nouveau chantier|nouveau releve/.test(text)){if(confirm('Enregistrer le chantier actuel avant d’en créer un nouveau ?'))await save();clearForm();activeWorkIndex=0;feedback.textContent='✅ Nouveau chantier prêt.';return}
  if(/ouvrir (le )?chantier/.test(text)){const name=text.replace(/^.*ouvrir (le )?chantier/,'').trim();feedback.textContent=await openProjectByVoice(name)?`✅ Chantier « ${name} » ouvert.`:`⚠️ Aucun chantier trouvé pour « ${name} ».`;return}
  if(/nouvelle page|nouveau type/.test(text)){const type=typeFromCommand(text);createPage(type);feedback.textContent=`✅ Nouvelle page ${type||'sans type'} créée.`;return}
  if(/ajoute|ajouter|nouvel ouvrage|nouveau ouvrage/.test(text)){const type=typeFromCommand(text);if(type&&pages[activePageIndex]?.type!==type)ensurePageForType(type);addWork({type:pages[activePageIndex]?.type||type});captureActivePage();renderPageTabs();scheduleAutosave();activeWorkIndex=document.querySelectorAll('.work-card').length-1;feedback.textContent=`✅ Ouvrage ${pages[activePageIndex]?.type||'sans type'} ajouté sur la page ${activePageIndex+1}.`;document.querySelectorAll('.work-card')[activeWorkIndex].scrollIntoView({behavior:'smooth',block:'start'});return}
  if(/supprime|supprimer/.test(text)&&text.includes('ouvrage')){const cards=[...document.querySelectorAll('.work-card')];if(cards.length===1){feedback.textContent='⚠️ Il faut conserver au moins un ouvrage.';return}let d=text.includes('dernier')?cards[cards.length-1]:workAtCommand(text);if(d&&confirm(`Supprimer l’ouvrage ${cards.indexOf(d)+1} ?`)){d.remove();renumberWorks();captureActivePage();renderPageTabs();scheduleAutosave();activeWorkIndex=Math.min(activeWorkIndex,cards.length-2);feedback.textContent='✅ Ouvrage supprimé.'}return}
  if(/modifier|selectionne|selectionner|aller a/.test(text)&&text.includes('ouvrage')){const d=workAtCommand(text);if(d){activeWorkIndex=[...document.querySelectorAll('.work-card')].indexOf(d);d.scrollIntoView({behavior:'smooth',block:'start'});feedback.textContent=`✅ Les prochaines modifications concernent l’ouvrage ${activeWorkIndex+1}.`;if(!/(largeur|hauteur|longueur|epaisseur|surface|type|pose|giron|reculement|quantite|localisation|observation)/.test(text))return}}
  if(setSimpleVoiceField('projectTitle',text,['nom du chantier','titre du chantier'])){feedback.textContent='✅ Nom du chantier renseigné.';return}
  if(setSimpleVoiceField('contactName',text,['nom du client','client','contact'])){feedback.textContent='✅ Client renseigné.';return}
  if(setSimpleVoiceField('contactPhone',text,['telephone','numero de telephone'])){feedback.textContent='✅ Téléphone renseigné.';return}
  if(setSimpleVoiceField('contactEmail',text,['adresse mail','email','mail'])){feedback.textContent='✅ E-mail renseigné.';return}
  if(setSimpleVoiceField('address',text,['adresse du chantier','adresse'])){feedback.textContent='✅ Adresse renseignée.';return}
  if(setSimpleVoiceField('notes',text,['notes chantier','note chantier','notes generales'])){feedback.textContent='✅ Notes générales renseignées.';return}
  if(/creer.*demande.*prix|demande.*fournisseur/.test(text)){$('makeSupplier').click();$('summary').scrollIntoView({behavior:'smooth'});feedback.textContent='✅ Demande de prix créée.';return}
  if(/creer.*devis|base.*devis/.test(text)){$('makeQuote').click();$('summary').scrollIntoView({behavior:'smooth'});feedback.textContent='✅ Base de devis créée.';return}
  if(/copier.*resume|copier.*texte/.test(text)){$('copySummary').click();feedback.textContent='✅ Résumé copié.';return}
  const d=workAtCommand(text),type=typeFromCommand(text);if(type&&/type|choisir|mettre|ouvrage/.test(text)){ensurePageForType(type);feedback.textContent=`✅ Page « ${type} » ouverte.`;return}
  const count=fillVoiceFields(d,spoken.replace(/^modifier\s+/i,''));if(count){feedback.textContent=`✅ ${count} information(s) modifiée(s) dans l’ouvrage ${activeWorkIndex+1}.`;d.scrollIntoView({behavior:'smooth',block:'center'});return}
  feedback.textContent='⚠️ Phrase non reconnue : « '+spoken+' ». Dites le nom du champ puis sa valeur, par exemple « matériau PVC » ou « largeur 1200 ».';
}
function startVoiceAssistant(){
  if(voiceControlOn){stopVoiceAssistant();return}if(recognition)try{recognition.stop()}catch(e){}const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){$('voiceFeedback').textContent='La reconnaissance vocale n’est pas disponible dans ce navigateur. Utilisez Chrome ou Safari récent et autorisez le microphone.';return}
  voiceControlOn=true;const btn=$('voiceAssistant');btn.classList.add('listening');btn.textContent='⏹️ Arrêter';
  const listen=()=>{if(!voiceControlOn)return;commandRecognition=new SR();commandRecognition.lang='fr-FR';commandRecognition.continuous=true;commandRecognition.interimResults=true;commandRecognition.onstart=()=>{$('voiceFeedback').textContent='Je vous écoute. Dictez une information, marquez une courte pause, puis continuez.'};commandRecognition.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++){const spoken=e.results[i][0].transcript.trim();if(e.results[i].isFinal)voiceCommandQueue=voiceCommandQueue.then(()=>executeVoiceCommand(spoken)).catch(error=>{console.error('Échec de la commande vocale',error);$('voiceFeedback').textContent='La commande n’a pas pu être appliquée.'});else $('voiceFeedback').textContent='Entendu : « '+spoken+'… »'}};commandRecognition.onerror=e=>{if(e.error!=='no-speech')$('voiceFeedback').textContent='La commande n’a pas été comprise. Vous pouvez recommencer.'};commandRecognition.onend=()=>{commandRecognition=null;if(voiceControlOn)setTimeout(listen,500)};try{commandRecognition.start()}catch(e){stopVoiceAssistant('Impossible de démarrer le microphone. Vérifiez son autorisation.')}};listen();
}
function bindMics(root=document){root.querySelectorAll('.mic').forEach(btn=>{if(btn.dataset.bound)return;btn.dataset.bound='1';btn.onclick=()=>{const t=resolveMicTarget(btn.dataset.target);if(t)startVoice(t,btn)}})}
$('pageType').innerHTML=opt(workTypes);
$('pageType').onchange=e=>{const page=pages[activePageIndex];if(!page)return;page.type=e.target.value;page.other=e.target.value==='Autre'?$('pageOther').value:'';$('pageOtherWrap').classList.toggle('hidden',e.target.value!=='Autre');document.querySelectorAll('.work-card').forEach(d=>{d.querySelector('.wtype').value=page.type;d.querySelector('.wother').value=page.other;renderSpecific(d,page.type)});captureActivePage();renderPageTabs()};
$('pageOther').oninput=e=>{const page=pages[activePageIndex];if(!page)return;page.other=e.target.value;document.querySelectorAll('.wother').forEach(el=>el.value=page.other);captureActivePage();renderPageTabs()};
$('addPage').onclick=()=>createPage();
$('removePage').onclick=()=>{if(pages.length===1)return;if(confirm('Supprimer cette page et tous ses ouvrages ?')){pages.splice(activePageIndex,1);showPage(Math.min(activePageIndex,pages.length-1),false);scheduleAutosave()}};
$('addWork').onclick=()=>{addWork({type:pages[activePageIndex]?.type||'',other:pages[activePageIndex]?.other||''});captureActivePage();renderPageTabs();scheduleAutosave()};
$('photos').onchange=async e=>{for(const f of e.target.files){photoData.push(await fileToDataURL(f))}renderPhotos();scheduleAutosave()};
async function fileToDataURL(file){
  const source=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});
  if(!String(file.type||'').startsWith('image/'))return source;
  try{
    const image=await new Promise((resolve,reject)=>{const candidate=new Image();candidate.onload=()=>resolve(candidate);candidate.onerror=reject;candidate.src=source});
    const maxSide=2000,scale=Math.min(1,maxSide/Math.max(image.naturalWidth,image.naturalHeight)),width=Math.max(1,Math.round(image.naturalWidth*scale)),height=Math.max(1,Math.round(image.naturalHeight*scale));
    const canvas=document.createElement('canvas'),context=canvas.getContext('2d');canvas.width=width;canvas.height=height;context.fillStyle='#fff';context.fillRect(0,0,width,height);context.drawImage(image,0,0,width,height);
    return canvas.toDataURL('image/jpeg',.82);
  }catch(error){console.warn('Photo conservée sans compression',error);return source}
}
function photoFileExtension(type){return({jpeg:'jpg',jpg:'jpg',png:'png',heic:'heic',heif:'heif',webp:'webp'})[String(type||'').split('/')[1]?.split(';')[0].toLowerCase()]||'jpg'}
async function savePhotoToDevice(src,index){
  try{
    const blob=await (await fetch(src)).blob(),type=blob.type||'image/jpeg',file=new File([blob],`photo-chantier-${Date.now()}-${index+1}.${photoFileExtension(type)}`,{type});
    if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Photo de chantier'});return}
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=file.name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)
  }catch(error){if(error?.name!=='AbortError'){console.error('Enregistrement de la photo impossible',error);alert("La photo n’a pas pu être enregistrée sur cet appareil.")}}
}
const photoCanvas=$('photoEditorCanvas'),photoCtx=photoCanvas.getContext('2d');let photoMode='pen',photoColor='#111827',photoDrawing=false,photoStart=null,photoLast=null,photoPreview=null,photoHistory=[],photoTextLine=0;
function photoPoint(e){return canvasPoint(photoCanvas,e)}
function photoStroke(a,b){photoCtx.save();photoCtx.strokeStyle=photoColor;photoCtx.lineWidth=Number($('photoLineWidth').value);photoCtx.lineCap='round';photoCtx.lineJoin='round';photoCtx.beginPath();photoCtx.moveTo(a.x,a.y);photoCtx.lineTo(b.x,b.y);photoCtx.stroke();photoCtx.restore()}
function rememberPhoto(){photoHistory.push(photoCtx.getImageData(0,0,photoCanvas.width,photoCanvas.height));if(photoHistory.length>6)photoHistory.shift()}
function closePhotoEditor(){photoEditorState=null;$('photoEditor').classList.add('hidden')}
function openPhotoEditor(d,index){
  const image=new Image();image.onload=()=>{const scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight));photoCanvas.width=Math.max(1,Math.round(image.naturalWidth*scale));photoCanvas.height=Math.max(1,Math.round(image.naturalHeight*scale));photoCtx.drawImage(image,0,0,photoCanvas.width,photoCanvas.height);photoEditorState={work:d,index};photoHistory=[];photoTextLine=0;rememberPhoto();$('photoEditor').classList.remove('hidden')};image.onerror=()=>alert("Cette photo ne peut pas être ouverte.");image.src=d._photos[index];
}
photoCanvas.onpointerdown=e=>{if(!photoEditorState)return;photoDrawing=true;photoStart=photoLast=photoPoint(e);photoPreview=photoMode==='line'?photoCtx.getImageData(0,0,photoCanvas.width,photoCanvas.height):null;photoCanvas.setPointerCapture(e.pointerId);e.preventDefault()};
photoCanvas.onpointermove=e=>{if(!photoDrawing)return;const p=photoPoint(e);if(photoMode==='line'){photoCtx.putImageData(photoPreview,0,0);photoStroke(photoStart,p)}else{photoStroke(photoLast,p);photoLast=p}e.preventDefault()};
photoCanvas.onpointerup=e=>{if(!photoDrawing)return;const p=photoPoint(e);if(photoMode==='line'){photoCtx.putImageData(photoPreview,0,0);photoStroke(photoStart,p)}photoDrawing=false;rememberPhoto();e.preventDefault()};
photoCanvas.onpointercancel=()=>{if(photoDrawing&&photoMode==='line'&&photoPreview)photoCtx.putImageData(photoPreview,0,0);photoDrawing=false};
function setPhotoMode(mode){photoMode=mode;$('photoPen').classList.toggle('tool-active',mode==='pen');$('photoLine').classList.toggle('tool-active',mode==='line')}
$('photoPen').onclick=()=>setPhotoMode('pen');$('photoLine').onclick=()=>setPhotoMode('line');
$('photoColors').querySelectorAll('.color-swatch').forEach(button=>button.onclick=()=>{photoColor=button.dataset.color;$('photoColors').querySelectorAll('.color-swatch').forEach(item=>item.classList.toggle('active',item===button))});
$('photoText').onclick=()=>{if(!photoEditorState)return;const text=prompt('Texte à ajouter sur la photo :');if(!text)return;photoCtx.fillStyle=photoColor;photoCtx.font='bold '+Math.max(24,Math.round(photoCanvas.width/35))+'px sans-serif';photoCtx.fillText(text,20,45+(photoTextLine++%10)*Math.max(34,Math.round(photoCanvas.width/30)));rememberPhoto()};
$('photoUndo').onclick=()=>{if(photoHistory.length<=1)return;photoHistory.pop();photoCtx.putImageData(photoHistory[photoHistory.length-1],0,0)};
$('savePhotoEdit').onclick=()=>{if(!photoEditorState)return;const {work,index}=photoEditorState;work._photos[index]=photoCanvas.toDataURL('image/jpeg',.9);renderWorkPhotos(work);scheduleAutosave();closePhotoEditor()};
$('closePhotoEditor').onclick=$('cancelPhotoEdit').onclick=closePhotoEditor;
function renderWorkPhotos(d){const g=d.querySelector('.wphoto-grid'),status=d.querySelector('.work-photos-status');if(!g)return;const count=(d._photos||[]).length;if(status)status.textContent=count?count+' photo'+(count>1?'s':''):'Aucune photo';g.innerHTML='';(d._photos||[]).forEach((src,i)=>{const wrap=document.createElement('div'),img=document.createElement('img'),actions=document.createElement('div'),saveButton=document.createElement('button'),edit=document.createElement('button'),remove=document.createElement('button');wrap.className='photo-thumb';actions.className='photo-actions';img.src=src;img.alt='Photo ouvrage';img.onclick=()=>openPhotoEditor(d,i);saveButton.type=edit.type=remove.type='button';saveButton.className='secondary save-photo';edit.className='secondary';remove.className='danger';saveButton.textContent='Ajouter à Photos';edit.textContent='Annoter';remove.textContent='Supprimer';saveButton.onclick=()=>savePhotoToDevice(src,i);edit.onclick=()=>openPhotoEditor(d,i);remove.onclick=()=>{if(confirm('Supprimer cette photo de l\'ouvrage ?')){d._photos.splice(i,1);renderWorkPhotos(d);scheduleAutosave()}};actions.append(saveButton,edit,remove);wrap.append(img,actions);g.appendChild(wrap)})}
function renderPhotos(){const g=$('photoGrid'),status=$('generalPhotosSection')?.querySelector('.section-status');if(status)status.textContent=photoData.length?photoData.length+' photo'+(photoData.length>1?'s':''):'Aucune photo';g.innerHTML='';photoData.forEach((src,i)=>{const wrap=document.createElement('div'),img=document.createElement('img'),actions=document.createElement('div'),saveButton=document.createElement('button'),remove=document.createElement('button');wrap.className='photo-thumb';actions.className='photo-actions';img.src=src;img.alt='Photo générale du chantier';saveButton.type=remove.type='button';saveButton.className='secondary save-photo';remove.className='danger';saveButton.textContent='Ajouter à Photos';remove.textContent='Supprimer';saveButton.onclick=()=>savePhotoToDevice(src,i);remove.onclick=()=>{if(confirm('Supprimer cette photo ?')){photoData.splice(i,1);renderPhotos();scheduleAutosave()}};actions.append(saveButton,remove);wrap.append(img,actions);g.appendChild(wrap)})}
function projectPagesData(){captureActivePage();return pages.map(page=>({...page,works:(page.works||[]).map(w=>({...w,type:page.type,other:page.other}))}))}
function baseLines(){
  let lines=[`Chantier : ${$('projectTitle').value||'-'}`,`Client : ${$('contactName').value||'-'}`];if($('contactPhone').value)lines.push(`Téléphone : ${$('contactPhone').value}`);if($('contactEmail').value)lines.push(`E-mail : ${$('contactEmail').value}`);if($('address').value)lines.push(`Adresse : ${$('address').value}`);const supplierNames=[...new Set([$('supplier').value,...suppliers].filter(Boolean))];if(supplierNames.length)lines.push(`Fabricants / fournisseurs : ${supplierNames.join(', ')}`);
  projectPagesData().forEach((page,pageIndex)=>{lines.push('',`PAGE ${pageIndex+1} — ${shown(page.type,page.other)||'Type non renseigné'}`);page.works.forEach((w,i)=>{lines.push(`Ouvrage ${i+1}`);if(w.location)lines.push(`Repère / localisation : ${w.location}`);if(w.material)lines.push(`Matériau : ${shown(w.material,w.materialOther)}`);if(w.install)lines.push(`Type de pose : ${shown(w.install,w.installOther)}`);if(w.install==="Avec tapées d'isolation"&&w.tapeThickness)lines.push(`Épaisseur des tapées : ${tapeThicknessLabel(w)}`);if(w.width||w.height)lines.push(`Dimensions : ${w.width||'-'} x ${w.height||'-'} mm`);if(w.specific?.frameSize)lines.push(`Dimensions hors-tout : ${w.specific.frameSize}`);if(w.sill)lines.push(`Hauteur d'allège : ${w.sill} mm`);if(w.depth)lines.push(`Épaisseur / profondeur : ${w.depth} mm`);if(w.qty)lines.push(`Quantité : ${w.qty}`);(specificSchemas[page.type]||[]).forEach(([key,label,unit])=>{if(w.specific?.[key])lines.push(`${label} : ${w.specific[key]}${['mm','m','m²','ml'].includes(unit)?' '+unit:''}`)});if(w.extra)lines.push(`Cotes complémentaires : ${w.extra}`);if(w.obs)lines.push(`Observations : ${w.obs}`);if(w.photos?.length)lines.push(`Photos associées : ${w.photos.length}`);{const sketchCount=Array.isArray(w.sketches)?w.sketches.filter(Boolean).length:(w.sketch?1:0);if(sketchCount)lines.push(`Croquis associés : ${sketchCount}`)}})});
  if($('notes').value)lines.push('',`Notes chantier générales : ${$('notes').value}`);return lines;
}
function renderSuppliers(){const box=$('supplierList'),options=$('supplierOptions');box.innerHTML='';options.innerHTML=suppliers.map(name=>`<option value="${esc(name)}"></option>`).join('');suppliers.forEach((name,index)=>{const item=document.createElement('div'),label=document.createElement('span'),remove=document.createElement('button');item.className='supplier-item';label.textContent=name;remove.type='button';remove.className='danger';remove.textContent='×';remove.setAttribute('aria-label','Supprimer '+name);remove.onclick=()=>{suppliers.splice(index,1);renderSuppliers();scheduleAutosave()};item.append(label,remove);box.appendChild(item)})}
function preparePdfImage(source,maxPixels=1400,quality=.78){
  return new Promise((resolve,reject)=>{
    const image=new Image();image.onload=()=>{
      try{
        const scale=Math.min(1,maxPixels/Math.max(image.naturalWidth,image.naturalHeight)),width=Math.max(1,Math.round(image.naturalWidth*scale)),height=Math.max(1,Math.round(image.naturalHeight*scale));
        const canvas=document.createElement('canvas'),context=canvas.getContext('2d');canvas.width=width;canvas.height=height;context.fillStyle='#fff';context.fillRect(0,0,width,height);context.drawImage(image,0,0,width,height);
        resolve({data:canvas.toDataURL('image/jpeg',quality),width,height});
      }catch(error){reject(error)}
    };image.onerror=()=>reject(new Error("Une image n'a pas pu être chargée."));image.src=source;
  });
}
function pdfFileName(title,date){
  const base=(title||'releve-de-cotes').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase()||'releve-de-cotes';
  return base+'-'+(date||new Date().toISOString().slice(0,10))+'.pdf';
}
async function createProjectPdfFile(){
    if(!window.jspdf?.jsPDF)throw new Error("Le générateur PDF n'est pas disponible.");
    const projectTitle=$('projectTitle').value.trim(),projectDate=$('projectDate').value,pdfPages=projectPagesData();
    const hasWork=pdfPages.some(page=>(page.works||[]).some(work=>Object.entries(work).some(([key,value])=>{if(['type','other','qty'].includes(key))return false;if(Array.isArray(value))return value.length>0;if(value&&typeof value==='object')return Object.values(value).some(Boolean);return Boolean(value&&String(value).trim())})));
    if(!projectTitle&&!$('contactName').value.trim()&&!$('address').value.trim()&&!$('notes').value.trim()&&!photoData.length&&!hasWork)throw new Error('Renseignez le chantier ou au moins un ouvrage avant de créer le PDF.');
    const {jsPDF}=window.jspdf,doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true}),margin=14,pageWidth=210,pageHeight=297,contentWidth=pageWidth-margin*2,brand=[132,44,44];
    let logo=null,y=34;try{logo=await preparePdfImage('logo-sam.png',1000,.9)}catch(error){console.warn('Logo absent du PDF',error)}
    doc.setProperties({title:'Relevé de cotes - '+(projectTitle||'Chantier'),subject:'Relevé de chantier',author:'SAM Artisans Menuisiers'});
    function pageHeader(){
      if(logo){const logoWidth=48,logoHeight=logoWidth*logo.height/logo.width;doc.addImage(logo.data,'JPEG',margin,10,logoWidth,logoHeight,undefined,'FAST')}
      doc.setTextColor(17,24,39);doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text('RELEVÉ DE COTES',pageWidth-margin,16,{align:'right'});
      doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(107,114,128);doc.text(projectTitle||'Chantier sans titre',pageWidth-margin,22,{align:'right'});
      doc.setDrawColor(...brand);doc.setLineWidth(.7);doc.line(margin,29,pageWidth-margin,29);y=36;
    }
    function ensureSpace(height){if(y+height>pageHeight-18){doc.addPage();pageHeader()}}
    function section(title){
      ensureSpace(11);doc.setFillColor(246,247,249);doc.roundedRect(margin,y-5,contentWidth,9,1,1,'F');doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(...brand);doc.text(String(title),margin+3,y+1);y+=9;
    }
    function field(label,value,unit=''){
      if(value===undefined||value===null||String(value).trim()==='')return;
      const suffix=unit&&['mm','m','m²','ml'].includes(unit)?' '+unit:'',lines=doc.splitTextToSize(String(label)+' : '+String(value)+suffix,contentWidth);
      ensureSpace(lines.length*4.4+2);doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(31,41,55);doc.text(lines,margin,y,{lineHeightFactor:1.2});y+=lines.length*4.4+1;
    }
    function workHeading(title){
      ensureSpace(9);doc.setDrawColor(203,213,225);doc.setLineWidth(.35);doc.line(margin,y-2,pageWidth-margin,y-2);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(51,65,85);doc.text(String(title),margin,y+3);y+=8;
    }
    async function imageList(title,items){
      const sources=(items||[]).filter(Boolean);if(!sources.length)return;ensureSpace(110);section(title);
      for(let index=0;index<sources.length;index++){
        try{
          const image=await preparePdfImage(sources[index]),maxWidth=145,maxHeight=90,scale=Math.min(maxWidth/image.width,maxHeight/image.height),width=image.width*scale,height=image.height*scale;
          ensureSpace(height+8);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(107,114,128);doc.text('Image '+(index+1),margin,y);y+=3;
          doc.addImage(image.data,'JPEG',margin,y,width,height,undefined,'FAST');y+=height+5;
        }catch(error){console.warn('Image ignorée dans le PDF',error);field('Image '+(index+1),'impossible à intégrer')}
      }
    }
    pageHeader();section('Chantier et client');
    field('Chantier',projectTitle||'Sans titre');field('Date',projectDate?new Date(projectDate+'T12:00:00').toLocaleDateString('fr-FR'):'');
    field('Client / contact',$('contactName').value);field('Téléphone',$('contactPhone').value);field('E-mail',$('contactEmail').value);field('Adresse du chantier',$('address').value);
    const supplierNames=[...new Set([$('supplier').value,...suppliers].filter(Boolean))];if(supplierNames.length){section('Fournisseurs et quincaillerie');field('Fabricants / fournisseurs',supplierNames.join(', '));field('Référence / gamme',$('hardwareRef').value);field('Besoin spécifique',$('hardwareNeed').value)}
    if($('notes').value){section('Notes générales');field('Notes',$('notes').value)}
    await imageList('Photos générales du chantier',photoData);
    for(let pageIndex=0;pageIndex<pdfPages.length;pageIndex++){
      const page=pdfPages[pageIndex];section('Page '+(pageIndex+1)+' - '+(shown(page.type,page.other)||'Type non renseigné'));
      for(let workIndex=0;workIndex<(page.works||[]).length;workIndex++){
        const work=page.works[workIndex];workHeading('Ouvrage '+(workIndex+1)+(work.location?' - '+work.location:''));
        field('Matériau',shown(work.material,work.materialOther));field('Type de pose',shown(work.install,work.installOther));if(work.install==="Avec tapées d'isolation")field('Épaisseur des tapées',tapeThicknessLabel(work));
        if(work.width||work.height)field('Dimensions',(work.width||'-')+' x '+(work.height||'-'),'mm');field('Dimensions hors-tout',work.specific?.frameSize);
        field("Hauteur d'allège",work.sill,'mm');field('Épaisseur / profondeur',work.depth,'mm');field('Quantité',work.qty);field('Repère / localisation',work.location);
        (specificSchemas[page.type]||[]).forEach(([key,label,unit])=>field(label,work.specific?.[key],unit));
        field('Cotes complémentaires',work.extra);field('Observations',work.obs);
        await imageList('Photos - page '+(pageIndex+1)+', ouvrage '+(workIndex+1),work.photos);
        const sketches=Array.isArray(work.sketches)?work.sketches.filter(Boolean):(work.sketch?[work.sketch]:[]);
        await imageList('Croquis - page '+(pageIndex+1)+', ouvrage '+(workIndex+1),sketches);
      }
    }
    const totalPages=doc.getNumberOfPages(),generated=new Date().toLocaleString('fr-FR');
    for(let pageNumber=1;pageNumber<=totalPages;pageNumber++){doc.setPage(pageNumber);doc.setDrawColor(209,213,219);doc.setLineWidth(.2);doc.line(margin,pageHeight-13,pageWidth-margin,pageHeight-13);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(107,114,128);doc.text('Généré le '+generated,margin,pageHeight-8);doc.text('Page '+pageNumber+' / '+totalPages,pageWidth-margin,pageHeight-8,{align:'right'})}
    const name=pdfFileName(projectTitle,projectDate),blob=doc.output('blob');
    return new File([blob],name,{type:'application/pdf'});
}
async function downloadProjectPdf(){
  const status=$('pdfStatus'),button=$('downloadPdf');status.style.color='var(--ok)';status.textContent='Création du PDF…';button.disabled=true;
  try{
    const projectTitle=$('projectTitle').value.trim(),file=await createProjectPdfFile();
    if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
      try{await navigator.share({title:'Relevé de cotes '+(projectTitle||''),files:[file]});status.textContent='PDF créé et partagé.';return}catch(error){if(error?.name==='AbortError'){status.textContent='Partage du PDF annulé.';return}}
    }
    downloadBackupFile(file);status.textContent='PDF téléchargé : '+file.name;
  }catch(error){
    console.error('Échec de la création du PDF',error);status.style.color='#991b1b';status.textContent='Le PDF n’a pas pu être créé : '+(error.message||'erreur inconnue');
  }finally{button.disabled=false}
}
function addSupplier(){const input=$('supplierEntry'),name=input.value.trim();if(!name)return;if(!suppliers.some(item=>normalize(item)===normalize(name)))suppliers.push(name);if(!$('supplier').value)$('supplier').value=name;input.value='';renderSuppliers();scheduleAutosave()}
$('addSupplier').onclick=addSupplier;$('supplierEntry').onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();addSupplier()}};
$('makeSupplier').onclick=()=>{$('summarySection').open=true;let l=['Bonjour,','','Pouvez-vous me transmettre votre meilleure offre de prix pour le besoin suivant :','',...baseLines()];if($('hardwareRef').value)l.push(`Référence / gamme : ${$('hardwareRef').value}`);if($('hardwareNeed').value)l.push(`Quincaillerie / besoin spécifique : ${$('hardwareNeed').value}`);l.push('','Merci d\'indiquer le prix, le délai et les éventuelles contraintes techniques.','','Cordialement.');$('summary').value=l.join('\n')};
$('makeQuote').onclick=()=>{$('summarySection').open=true;$('summary').value=['Fourniture et pose des ouvrages suivants :','',...baseLines(),'','Prestations à prévoir :','- Prise de cotes et vérification sur site','- Fourniture des ouvrages selon caractéristiques ci-dessus','- Pose, réglages et finitions','- Évacuation et traitement des déchets si dépose de l\'existant','','À compléter après retour fournisseur : prix d\'achat, temps de pose, accessoires, finitions et marge.'].join('\n')};
$('copySummary').onclick=async()=>{await navigator.clipboard.writeText($('summary').value);alert('Texte copié.')};
$('shareSummary').onclick=async()=>{const text=$('summary').value;if(navigator.share)await navigator.share({title:$('projectTitle').value||'Relevé chantier',text});else{await navigator.clipboard.writeText(text);alert('Partage non disponible : texte copié.')}};
$('downloadPdf').onclick=downloadProjectPdf;
$('searchWeb').onclick=()=>{captureActivePage();const page=pages[activePageIndex]||{},first=page.works?.[0]||{};const q=[shown(page.type,page.other),first.material,$('hardwareNeed').value,$('hardwareRef').value,$('supplier').value].filter(Boolean).join(' ');window.open('https://www.google.com/search?q='+encodeURIComponent(q),'_blank')};
const BACKUP_FORMAT='releve-chantier-backup',BACKUP_VERSION=1,MAX_BACKUP_SIZE=250*1024*1024;
function setBackupStatus(message,isError=false){const status=$('backupStatus');status.textContent=message;status.style.color=isError?'#991b1b':'var(--ok)'}
async function flushPendingSave(){
  clearTimeout(autoSaveTimer);
  while(isSaving)await new Promise(resolve=>setTimeout(resolve,50));
  if(changeVersion>lastSavedVersion)await persistProject(false);
  if(changeVersion>lastSavedVersion)throw new Error("Le dossier en cours n'a pas pu être enregistré.");
}
function downloadBackupFile(file){
  const url=URL.createObjectURL(file),link=document.createElement('a');
  link.href=url;link.download=file.name;document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function projectBackupFileName(project,exportedAt){
  const raw=project.projectTitle||project.contactName||'releve-de-cotes';
  const base=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase()||'releve-de-cotes';
  const stamp=exportedAt.replace(/[-:]/g,'').replace('T','-').slice(0,15);
  return 'releve-de-cotes-'+base+'-'+stamp+'.json';
}
async function shareCurrentProjectBackup(){
  const projects=await allProjects(),project=projects.find(item=>item.id===currentId);
  if(!project)throw new Error("le relevé courant n'a pas été retrouvé");
  const exportedAt=new Date().toISOString(),backup={format:BACKUP_FORMAT,version:BACKUP_VERSION,exportedAt,projects:[project]};
  const appFile=new File([JSON.stringify(backup)],projectBackupFileName(project,exportedAt),{type:'application/json'}),pdfFile=await createProjectPdfFile(),files=[pdfFile,appFile];
  setBackupStatus('Choisissez « Enregistrer dans Fichiers », puis kDrive et le dossier « Relevés de cotes ».');
  if(navigator.share&&navigator.canShare&&navigator.canShare({files})){
    try{
      await navigator.share({title:'Relevé de cotes - '+(project.projectTitle||project.contactName||'Chantier'),files});
      setBackupStatus('PDF et fichier application envoyés vers la destination choisie.');
    }catch(error){
      if(error?.name==='AbortError'){
        setBackupStatus('Relevé enregistré sur cet iPad. Enregistrement kDrive annulé.');
        return;
      }
      throw error;
    }
  }else{
    files.forEach(downloadBackupFile);
    setBackupStatus('Partage de fichiers indisponible : PDF et fichier application téléchargés séparément.');
  }
}
function validateBackup(backup){
  if(!backup||backup.format!==BACKUP_FORMAT||backup.version!==BACKUP_VERSION||!Array.isArray(backup.projects))throw new Error('Ce fichier ne correspond pas à une sauvegarde Relevé Chantier compatible.');
  if(!backup.projects.every(project=>project&&typeof project==='object'&&Number.isFinite(project.id)&&(project.updated===undefined||Number.isFinite(project.updated))&&(project.pages===undefined||Array.isArray(project.pages))&&(project.photos===undefined||Array.isArray(project.photos))))throw new Error('La sauvegarde contient un dossier incomplet ou endommagé.');
}
async function importBackupFile(file){
  setBackupStatus('Lecture de la sauvegarde…');
  try{
    if(file.size>MAX_BACKUP_SIZE)throw new Error('Le fichier dépasse la taille maximale de 250 Mo.');
    await flushPendingSave();
    const backup=JSON.parse(await file.text());
    validateBackup(backup);
    const newestImported=new Map();
    backup.projects.forEach(project=>{const previous=newestImported.get(project.id);if(!previous||(project.updated||0)>=(previous.updated||0))newestImported.set(project.id,project)});
    const existing=await allProjects(),existingById=new Map(existing.map(project=>[project.id,project]));
    const projectsToWrite=[...newestImported.values()].filter(project=>!existingById.has(project.id)||(project.updated||0)>=(existingById.get(project.id).updated||0));
    if(!projectsToWrite.length){setBackupStatus('Aucun dossier plus récent à importer.');return}
    if(!confirm('Importer '+projectsToWrite.length+' dossier(s) ? Les versions les plus récentes seront conservées.')){setBackupStatus('Import annulé.');return}
    const db=await dbOpen();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction('projects','readwrite'),store=tx.objectStore('projects');
      projectsToWrite.forEach(project=>store.put(project));
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    });
    await renderProjects();
    const openedProject=projectsToWrite.reduce((latest,project)=>(project.updated||0)>=(latest.updated||0)?project:latest);
    loadProject(openedProject);
    setBackupStatus(projectsToWrite.length+' dossier(s) importé(s). Le plus récent est ouvert.');
  }catch(error){
    console.error("Échec de l'import",error);
    setBackupStatus("L'import a échoué : "+(error.message||'erreur inconnue'),true);
  }
}
function dbOpen(){return new Promise((res,rej)=>{const r=indexedDB.open('releveChantierDB',1);r.onupgradeneeded=()=>r.result.createObjectStore('projects',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function setSaveState(state){
  const button=$('saveProject');if(!button)return;
  button.textContent=state==='saving'?'Enregistrement…':state==='saved'?'Enregistré ✓':state==='error'?'Réessayer':'Enregistrer';
}
function hasProjectContent(savedPages){
  const mainFields=fields.filter(f=>f!=='projectDate').some(f=>String($(f).value||'').trim());
  const workContent=savedPages.some(page=>page.type||page.other||(page.works||[]).some(work=>Object.entries(work).some(([key,value])=>{
    if(['type','other'].includes(key))return false;
    if(key==='qty')return String(value||'1')!=='1';
    if(Array.isArray(value))return value.length>0;
    if(value&&typeof value==='object')return Object.values(value).some(Boolean);
    return Boolean(String(value||'').trim());
  })));
  return mainFields||photoData.length>0||workContent;
}
function scheduleAutosave(){
  changeVersion++;setSaveState('dirty');clearTimeout(autoSaveTimer);
  autoSaveTimer=setTimeout(()=>persistProject(false),300);
}
async function persistProject(notify=false){
  clearTimeout(autoSaveTimer);
  const savedPages=projectPagesData(),versionToSave=changeVersion;
  if(!notify&&!hasProjectContent(savedPages)){lastSavedVersion=changeVersion;setSaveState('idle');return false}
  if(isSaving){autoSaveTimer=setTimeout(()=>persistProject(false),300);return false}
  isSaving=true;setSaveState('saving');
  try{
    const db=await dbOpen(),data={id:currentId||Date.now(),updated:Date.now(),photos:photoData,suppliers:[...suppliers],pages:savedPages,works:savedPages.flatMap(p=>p.works)};
    fields.forEach(f=>data[f]=$(f).value);currentId=data.id;
    await new Promise((resolve,reject)=>{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put(data);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
    lastSavedVersion=Math.max(lastSavedVersion,versionToSave);setSaveState(changeVersion>lastSavedVersion?'dirty':'saved');await renderProjects();
    if(notify)alert('Chantier et pages enregistrés sur cet appareil.');
    return true;
  }catch(error){
    console.error('Échec de l’enregistrement',error);setSaveState('error');
    if(notify)alert('L’enregistrement a échoué. Vérifiez l’espace disponible, puis réessayez.');
    return false;
  }finally{
    isSaving=false;if(changeVersion>lastSavedVersion)autoSaveTimer=setTimeout(()=>persistProject(false),300);
  }
}
async function save(){
  const currentTitle=$('projectTitle').value.trim(),client=$('contactName').value.trim(),suggested=currentTitle||['Chantier',client].filter(Boolean).join(' - ');
  const checkedTitle=prompt('Vérifiez le titre du document (référence chantier / client). Vous pouvez le modifier avant l’enregistrement :',suggested);
  if(checkedTitle===null)return;
  const title=checkedTitle.trim();if(!title){alert('Indiquez une référence chantier / client avant d’enregistrer.');$('projectTitle').focus();return}
  if(title!==currentTitle){$('projectTitle').value=title;changeVersion++;setSaveState('dirty')}
  while(isSaving)await new Promise(resolve=>setTimeout(resolve,50));
  const saved=await persistProject(false);
  if(!saved)return;
  try{
    await shareCurrentProjectBackup();
  }catch(error){
    console.error("Échec de la copie externe",error);
    setBackupStatus("Le relevé est enregistré sur cet appareil, mais la copie vers kDrive a échoué : "+(error.message||"erreur inconnue"),true);
  }
}
async function renderStorageStatus(){
  const box=$('storageStatus');if(!box)return;
  if(!navigator.storage?.estimate){box.textContent='Espace de stockage : estimation indisponible sur ce navigateur.';return}
  try{const {usage=0,quota=0}=await navigator.storage.estimate(),mb=value=>(value/1048576).toFixed(value>=104857600?0:1);box.textContent='Stockage utilisé : '+mb(usage)+' Mo'+(quota?' sur '+mb(quota)+' Mo disponibles':'')+'. Les nouvelles photos sont réduites à 2 000 px. Une sauvegarde kDrive régulière reste recommandée.'}
  catch(error){box.textContent="L’espace de stockage n’a pas pu être estimé."}
}
async function allProjects(){const db=await dbOpen();return new Promise((res,rej)=>{const r=db.transaction('projects').objectStore('projects').getAll();r.onsuccess=()=>res(r.result.sort((a,b)=>b.updated-a.updated));r.onerror=()=>rej(r.error)})}
async function renderProjects(){const p=await allProjects(),box=$('projectList'),status=$('projectsSection')?.querySelector('.section-status');if(status)status.textContent=p.length?p.length+' projet'+(p.length>1?'s':''):'Aucun projet';box.innerHTML='';await renderStorageStatus();if(!p.length){box.innerHTML='<span class="hint">Aucun projet enregistré.</span>';return}p.forEach(x=>{const d=document.createElement('div');d.style='padding:10px 0;border-bottom:1px solid #e5e7eb';const projectPages=normalizePages(x),count=projectPages.reduce((n,page)=>n+(page.works?.length||0),0),types=projectPages.map(page=>shown(page.type,page.other)).filter(Boolean).join(', ');d.innerHTML=`<strong>${esc(x.projectTitle||'Projet sans titre')}</strong><br><span class="hint">${esc(x.contactName||'')} • ${projectPages.length} page(s) • ${count} ouvrage(s)${types?' • '+esc(types):''}</span><div class="row" style="margin-top:6px"><button class="secondary">Ouvrir</button><button class="danger">Supprimer</button></div>`;const [openBtn,delBtn]=d.querySelectorAll('button');openBtn.onclick=()=>loadProject(x);delBtn.onclick=async()=>{if(confirm('Supprimer ce projet ?')){const db=await dbOpen();db.transaction('projects','readwrite').objectStore('projects').delete(x.id);renderProjects()}};box.appendChild(d)})}
function legacyToWorks(x){if(x.works?.length)return x.works;if(x.workType||x.measures?.length){const m=x.measures?.[0]||{};return[{type:x.workType||'',other:x.workOther||'',material:x.material||'',materialOther:x.materialOther||'',install:x.installType||'',installOther:x.installOther||'',width:m.w||'',height:m.h||'',extra:(x.measures||[]).slice(1).map(a=>`${a.label||'Dimension'} : ${a.w||''}${a.h?' x '+a.h:''} ${a.u||'mm'}`).join('\n')}]}return[{}]}
function loadProject(x){clearTimeout(autoSaveTimer);currentId=x.id;fields.forEach(f=>$(f).value=x[f]||'');photoData=x.photos||[];suppliers=Array.isArray(x.suppliers)?[...x.suppliers]:(x.supplier?[x.supplier]:[]);renderSuppliers();pages=normalizePages(x);activePageIndex=0;showPage(0,false);renderPhotos();changeVersion=lastSavedVersion=0;setSaveState('saved');scrollTo({top:0,behavior:'smooth'})}
function clearForm(){clearTimeout(autoSaveTimer);currentId=null;fields.forEach(f=>$(f).value='');$('projectDate').value=new Date().toISOString().slice(0,10);photoData=[];suppliers=[];renderPhotos();renderSuppliers();pages=[{id:Date.now(),type:'',other:'',works:[{}]}];activePageIndex=0;showPage(0,false);$('summary').value='';changeVersion=lastSavedVersion=0;setSaveState('idle')}
$('saveProject').onclick=save;$('newProject').onclick=()=>{if(confirm('Créer un nouveau relevé ?'))clearForm()};$('voiceAssistant').onclick=startVoiceAssistant;
$('exportBackup').onclick=save;
$('backupFile').onchange=async event=>{const file=event.target.files?.[0];event.target.value='';if(file)await importBackupFile(file)};
function trackEditableChange(event){
  const target=event.target;
  if(target.matches('input:not([type="file"]),select,textarea')&&target.id!=='summary')scheduleAutosave();
}
document.addEventListener('input',trackEditableChange);
document.addEventListener('change',trackEditableChange);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&changeVersion>lastSavedVersion)persistProject(false)});
window.addEventListener('pagehide',()=>{if(changeVersion>lastSavedVersion)persistProject(false)});
window.addEventListener('beforeunload',event=>{
  if(changeVersion<=lastSavedVersion&&!isSaving)return;
  event.preventDefault();event.returnValue='';
});
if('serviceWorker' in navigator){
  let refreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!refreshing){refreshing=true;location.reload()}});
  navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{});
}
$('projectDate').value=new Date().toISOString().slice(0,10);bindMics();associateLabels();renderSuppliers();pages=[{id:Date.now(),type:'',other:'',works:[{}]}];showPage(0,false);renderProjects();
