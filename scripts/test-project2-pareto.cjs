// Synthetic DOM regression for the published Project 2 Pareto visualization.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync(require('node:path').join(__dirname,'..','la-service-operations.html'),'utf8');
const start=html.indexOf('function renderPareto('),end=html.indexOf('async function loadData()',start);
assert.ok(start>=0&&end>start,'Pareto implementation not found');
const source=html.slice(start,end);
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.style={};this.attrs={};this.textContent='';}
 replaceChildren(...items){this.children=[...items];}
 append(...items){this.children.push(...items);}
 appendChild(item){this.children.push(item);}
 setAttribute(key,value){this.attrs[key]=value;}
}
function render(types,total){
 const nodes={paretoBars:new Element('div'),paretoTable:new Element('tbody'),paretoInsight:new Element('p')};
 const document={getElementById:id=>nodes[id],createElement:tag=>new Element(tag)};
 new Function('document',source+'\nreturn renderPareto;')(document)(types,total);
 return nodes;
}
test('Pareto bars represent cumulative shares, not individual category shares',()=>{
 const data=[{requesttype:'A',count:50},{requesttype:'B',count:30},{requesttype:'C',count:20}];
 const result=render(data,100);
 const widths=result.paretoBars.children.map(row=>row.children[1].children[0].style.width);
 assert.deepEqual(widths,['50.0%','80.0%','100.0%']);
 assert.match(result.paretoBars.children[1].children[1].attrs['aria-label'],/cumulative 80.0 percent/);
 assert.match(result.paretoBars.children[1].children[2].textContent,/80.0% cum/);
});
test('Pareto preserves remaining categories and avoids a false 80 percent claim',()=>{
 const result=render([{requesttype:'A',count:20},{requesttype:'B',count:10}],100);
 assert.deepEqual(result.paretoBars.children.map(row=>row.children[1].children[0].style.width),['20.0%','30.0%']);
 assert.match(result.paretoInsight.textContent,/do not reach 80%/);
 const remainder=result.paretoTable.children.at(-1);
 assert.equal(remainder.children[1].textContent,'70');
});
test('missing denominator displays no fabricated concentration',()=>{
 const result=render([{requesttype:'A',count:10}],0);
 assert.equal(result.paretoBars.children.length,0);
 assert.match(result.paretoInsight.textContent,/No valid City total/);
});
