// Side panel script
(function(){
  const historyList = document.getElementById('historyList');
  const details = document.getElementById('details');
  const toggleMatchers = document.getElementById('toggleMatchers');
  const toggleExtractorBtn = document.getElementById('toggleExtractor');
  let history = [];
  let currentId = null;
  let extractorActive = false;
  let selectedNodePath = null; // path within current extraction tree

  // Utility to show quick feedback (copy or download)
  function showFeedback(message='Copied!') {
    const el = document.createElement('div');
    el.className = 'copy-feedback';
    el.style.position = 'fixed';
    el.style.bottom = '16px';
    el.style.left = '50%';
    el.style.transform = 'translateX(-50%)';
    el.style.padding = '6px 12px';
    el.style.borderRadius = '6px';
    el.style.background = 'var(--primary)';
    el.style.color = '#fff';
    el.style.fontSize = '12px';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }

  function loadHistory(){
    chrome.storage.local.get(['extractionHistory'], res=>{
      history = res.extractionHistory || [];
      renderHistory();
      if(history.length>0){ select(history[0].id); }
    });
  }

  function renderHistory(){
    historyList.innerHTML='';
    const recent = history.slice(0,5); // show last 5 extractions
    recent.forEach(item=>{
      const div=document.createElement('div');
      div.className='history-item'+(item.id===currentId?' active':'');
      let label = '';
      try {
        label = generateComponentName(item.data);
      } catch(e) { /* ignore */ }
      if(!label) {
        label = new Date(item.id).toLocaleTimeString();
      }
      div.textContent = label;
      div.addEventListener('click',()=>select(item.id));
      historyList.appendChild(div);
    });
    const empty=document.getElementById('emptyState');
    if(history.length===0){
      empty.style.display='flex';
      details.classList.add('hidden');
    } else {
      empty.style.display='none';
    }
  }

  function select(id){
    currentId=id;
    selectedNodePath=null;
    renderHistory();
    const entry=history.find(h=>h.id===id);
    if(!entry){details.classList.add('hidden');return;}
    details.classList.remove('hidden');
    renderDetails(entry.data);
  }

  function renderDetails(data){
    details.innerHTML='';
    // Tabs
    const tabs=['Component','HTML','Storybook','Compiled','Raw'];
    let active='Component';
    const tabBar=document.createElement('div');
    tabBar.className='tabs';
    tabs.forEach(t=>{
      const b=document.createElement('button');
      b.className='tab-button'+(t===active?' active':'');
      b.textContent=t;
      b.addEventListener('click',()=>{active=t;renderMain();});
      tabBar.appendChild(b);
    });
    details.appendChild(tabBar);

    // Code container
    const codeContainer=document.createElement('div');
    codeContainer.className='code-container';
    const pre=document.createElement('pre');
    pre.className='code-pre';
    codeContainer.appendChild(pre);
    // Copy button
    const copyBtn=document.createElement('button');
    copyBtn.className='icon-button';
    copyBtn.title='Copy';
    copyBtn.textContent='📄';
    copyBtn.addEventListener('click',()=>{
      navigator.clipboard.writeText(pre.textContent).then(()=>showFeedback());
    });
    codeContainer.appendChild(copyBtn);
    details.appendChild(codeContainer);

    // Download button
    const downloadBtn=document.createElement('button');
    downloadBtn.textContent='Download Component';
    downloadBtn.className='button';
    downloadBtn.style.margin='8px 0';
    downloadBtn.addEventListener('click',()=>{
      downloadCurrent();
    });
    details.appendChild(downloadBtn);

    // Design Tokens section
    const tokenSection=document.createElement('div');
    tokenSection.id='designTokens';
    tokenSection.className='design-tokens';
    tokenSection.innerHTML='<h3 style="margin-bottom:8px;">Design Token Mapping</h3><div class="tokens-list" id="tokensList"></div>';
    details.appendChild(tokenSection);

    // Component tree section
    const treeSection=document.createElement('div');
    treeSection.className='panel-section';
    treeSection.innerHTML='<h3 style="margin-bottom:8px;">Component Structure</h3><div class="tree-view" id="componentTree"></div>';
    details.appendChild(treeSection);

    function downloadCurrent(){
      const node=selectedNodePath?findNodeByPath(data,selectedNodePath):data;
      if(!node) return;
      const name=generateComponentName(node);
      const component=generateComponentCode(node);
      const types=generateTypeDefinitions(node);
      const story=generateStorybookStories(node);
      const fileContent=`// ${name}.tsx\n${component}\n\n// ${name}.d.ts\n${types}\n\n// ${name}.stories.tsx\n${story}`;
      const blob=new Blob([fileContent],{type:'text/plain'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download=`${name}.tsx`;
      document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
      showFeedback('Component downloaded');
    }

    function renderMain(){
      const displayData=selectedNodePath?findNodeByPath(data,selectedNodePath):data;
      // update pre text
      if(active==='Component') {
        pre.textContent = generateComponentCode(displayData);
      } else if(active==='HTML') {
        pre.textContent = generateHTML(displayData);
      } else if(active==='Storybook') {
        pre.textContent = generateStorybookStories(displayData);
      } else if(active==='Compiled') {
        if(window.DSETransformer && typeof window.DSETransformer.transform==='function'){
          try {
            const res=window.DSETransformer.transform(displayData);
            pre.textContent=res.jsx||'// No output';
          } catch(err){
            pre.textContent='Error compiling: '+err.message;
          }
        } else {
          pre.textContent='Transformer loading...';
        }
      } else {
        // Raw JSON fallback
        pre.textContent = JSON.stringify(displayData, null, 2);
      }

      // Highlight active tab
      Array.from(tabBar.children).forEach(btn=>{
        btn.classList.toggle('active',btn.textContent===active);
      });

      // Render tokens
      const tokensList=document.getElementById('tokensList');
      tokensList.innerHTML='';
      renderDesignTokens(displayData);

      // Render tree
      const treeView=document.getElementById('componentTree');
      treeView.innerHTML='';
      renderComponentTree(data,treeView,[]);
    }

    renderMain();
  }

  // ---- helper functions (subset from popup) ----
  function generateComponentName(data){
    if(!data||data.type==='text')return'Component';
    const {tag,classList}=data;
    if(classList&&classList.length){
      const s=classList.find(c=>/button|card|input|nav|header|footer|menu|modal|dialog|alert/.test(c));
      if(s) return s.split('-').map(p=>p.charAt(0).toUpperCase()+p.slice(1)).join('');
    }
    return tag.charAt(0).toUpperCase()+tag.slice(1)+'Component';
  }
  function generateComponentCode(data){
    if(!data)return'';
    if(data.type==='batch'&&data.elements)return data.elements.map(generateSingleComponentCode).join('\n\n');
    return generateSingleComponentCode(data);
  }
  function generateSingleComponentCode(data){
    if(!data||data.type==='text')return'';
    const {tag,style,designTokens}=data;
    const name=generateComponentName(data);
    const cls=[];
    if(designTokens){
      if(designTokens.backgroundColor)cls.push(`bg-${designTokens.backgroundColor}`);
      if(designTokens.textColor)cls.push(`text-${designTokens.textColor}`);
      if(designTokens.borderRadius)cls.push(designTokens.borderRadius);
    }
    if(style){ if(style.display==='flex')cls.push('flex'); }
    const tw=cls.join(' ');
    return `import React from 'react';\nexport const ${name}=({className='',...props})=>(\n  <${tag} className=\`${tw} \${className}\` {...props}/>\n)`;
  }
  function generateTypeDefinitions(data){
    if(!data)return'';
    if(data.type==='batch'&&data.elements)return data.elements.map(generateSingleTypeDefinition).join('\n\n');
    return generateSingleTypeDefinition(data);
  }
  function generateSingleTypeDefinition(data){
    if(!data||data.type==='text')return'';
    const name=generateComponentName(data);
    return `export interface ${name}Props{children?:React.ReactNode;className?:string}`;
  }
  function generateStorybookStories(data){
    if(!data)return'';
    if(data.type==='batch'&&data.elements)return data.elements.map(generateSingleStorybook).join('\n\n');
    return generateSingleStorybook(data);
  }
  function generateSingleStorybook(data){
    if(!data||data.type==='text')return'';
    const name=generateComponentName(data);
    return `import {${name}} from './${name}';\nexport default {title:'${name}',component:${name}};`;
  }

  // Persist checkbox state
  chrome.storage.local.get(['useMatchers'], res => {
    const enabled = res.useMatchers ?? false;
    toggleMatchers.checked = enabled;
    window.DSE_USE_MATCHERS = enabled;
  });

  toggleMatchers.addEventListener('change', () => {
    window.DSE_USE_MATCHERS = toggleMatchers.checked;
    chrome.storage.local.set({ useMatchers: toggleMatchers.checked });
    renderDetails(history.find(h=>h.id===currentId)?.data);
  });

  // init extractor state
  chrome.runtime.sendMessage({ action: 'getExtractorState' }, res => {
    extractorActive = res?.active || false;
    updateToggleBtn();
  });

  function updateToggleBtn() {
    if (extractorActive) {
      toggleExtractorBtn.textContent = 'Disable Selection Mode';
      toggleExtractorBtn.style.background = 'var(--success)';
    } else {
      toggleExtractorBtn.textContent = 'Enable Selection Mode';
      toggleExtractorBtn.style.background = 'var(--primary)';
    }
  }

  toggleExtractorBtn.addEventListener('click', () => {
    extractorActive = !extractorActive;
    chrome.runtime.sendMessage({ action: 'toggleExtractor', value: extractorActive }, () => {
      updateToggleBtn();
    });
  });

  // Listen for state change from other tabs
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'extractorStateChanged') {
      extractorActive = msg.value;
      updateToggleBtn();
    }
  });

  loadHistory();
  chrome.storage.onChanged.addListener((changes)=>{
    if(changes.extractionHistory){loadHistory();}
  });

  // Load transformer then custom matchers
  const transformerScript=document.createElement('script');
  transformerScript.src='transformer.js';
  transformerScript.onload=()=>{
    window.DSETransformer = window.module?.exports || {};
    const matcherScript=document.createElement('script');
    matcherScript.src='custom-matchers.js';
    document.head.appendChild(matcherScript);
  };
  document.head.appendChild(transformerScript);

  // -------------------- tree & token helpers --------------------
  function findNodeByPath(node,path){
    if(!node||!path||path.length===0)return node;
    const [idx,...rest]=path;
    if(node.children&&node.children[idx]) return findNodeByPath(node.children[idx],rest);
    return node;
  }

  function renderComponentTree(node,container,path=[]){
    if(!node)return;
    const item=document.createElement('div');item.className='tree-item';
    const content=document.createElement('div');content.className='tree-item-content';
    const currentPath=path.join('.');
    const isSelected=currentPath===selectedNodePath;
    if(isSelected) content.classList.add('selected');
    if(node.type==='text'){
      content.innerHTML=`<span class="tree-toggle"></span><span class="tree-text">"${node.value}"</span>`;
      item.appendChild(content);
      content.addEventListener('click',()=>{selectedNodePath=currentPath;renderDetails(history.find(h=>h.id===currentId).data);});
      container.appendChild(item);
      return;
    }
    const hasChildren=node.children&&node.children.length>0;
    content.innerHTML=hasChildren?'<span class="tree-toggle">▶</span>':'<span class="tree-toggle" style="visibility:hidden">▶</span>';
    content.innerHTML+=`<span class="tree-tag">${node.tag}</span>`;
    if(node.classList&&node.classList.length>0){content.innerHTML+=`<span class="tree-class">.${node.classList[0]}</span>`;}
    if(hasChildren) content.innerHTML+=`<span class="tree-count">${node.children.length}</span>`;
    item.appendChild(content);
    content.addEventListener('click',e=>{
      if(e.target.classList.contains('tree-toggle'))return;
      selectedNodePath=currentPath;renderDetails(history.find(h=>h.id===currentId).data);
    });
    if(hasChildren){
      const childrenContainer=document.createElement('div');childrenContainer.className='tree-children';
      const expanded=path.length<1||isSelected||(selectedNodePath&&selectedNodePath.startsWith(currentPath));
      childrenContainer.style.display=expanded?'block':'none';
      node.children.forEach((child,idx)=>renderComponentTree(child,childrenContainer,[...path,idx]));
      item.appendChild(childrenContainer);
      const toggle=content.querySelector('.tree-toggle');toggle.textContent=expanded?'▼':'▶';
      toggle.addEventListener('click',e=>{e.stopPropagation();const isExp=childrenContainer.style.display!=='none';childrenContainer.style.display=isExp?'none':'block';toggle.textContent=isExp?'▶':'▼';});
    }
    container.appendChild(item);
  }

  function renderDesignTokens(displayData){
    const container=document.getElementById('designTokens');
    if(!displayData||!displayData.designTokens||Object.keys(displayData.designTokens).length===0){
      container.style.display='none';return;
    }
    container.style.display='block';
    const list=container.querySelector('.tokens-list');
    list.innerHTML='';
    Object.entries(displayData.designTokens).forEach(([key,val])=>{
      const item=document.createElement('div');item.className='token-item';
      const color=document.createElement('div');color.className='token-color';item.appendChild(color);
      const orig=document.createElement('code');orig.className='token-code';
      const cssKey=key.replace(/([A-Z])/g,'-$1').toLowerCase();
      orig.textContent=`${key}: ${displayData.style?displayData.style[cssKey]:''}`;
      item.appendChild(orig);
      const arrow=document.createElement('span');arrow.className='token-arrow';arrow.textContent='→';item.appendChild(arrow);
      const tokenVal=document.createElement('code');tokenVal.className='token-code';tokenVal.textContent=val;item.appendChild(tokenVal);
      list.appendChild(item);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Shift' && extractorActive) {
      chrome.runtime.sendMessage({ action: 'traverseUp' });
    }
  });

  // ---- HTML generator ----
  function generateHTML(node, indent = 0) {
    const pad = '  '.repeat(indent);
    if (!node) return '';
    if (node.type === 'text') {
      const value = (node.value || '').trim();
      return value ? `${pad}${value}\n` : '';
    }
    const cls = node.classList && node.classList.length ? ` class=\"${node.classList.join(' ')}\"` : '';
    const openTag = `${pad}<${node.tag}${cls}>\n`;
    const childrenHTML = (node.children || []).map(child => generateHTML(child, indent + 1)).join('');
    const closeTagPad = childrenHTML ? pad : '';
    const closeTag = `</${node.tag}>\n`;
    return openTag + childrenHTML + closeTagPad + closeTag;
  }
})(); 