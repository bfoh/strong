// Loopback-only synthetic review backend. No live credentials, inventory or originals.
import {createServer} from 'node:http';
const property='44444444-4444-4444-a444-444444444444',staff='66666666-6666-4666-a666-666666666666';
const batch='11111111-1111-4111-a111-111111111111',asset='22222222-2222-4222-a222-222222222222',group='33333333-3333-4333-a333-333333333333',mediaId='55555555-5555-4555-a555-555555555555';
const initialRow={id:property,title:'Synthetic media review — not for sale',slug:'synthetic-review-only',category:'residential',location:'QA only',price:null,beds:null,baths:null,status:'draft',description:'Synthetic local media review fixture; never company inventory.',image:'/images/properties/executive-residence.webp',images:[],region:null,city:'',locality:'',approximate_address:'',property_type:'',availability:'unknown',featured:false,review_status:'draft',publication_authorized:false};
let row=structuredClone(initialRow),features=[],saves=[];
const original={bucket:'strong-media-review',path:`batches/${batch}/originals/synthetic.jpeg`,mime:'image/jpeg'};
const manifest={version:1,id:batch,createdAt:'2026-10-17T12:00:00.000Z',archiveSha256:'a'.repeat(64),missingDescriptions:[],groups:[{id:group,sourceMediaGroup:'LOCAL_QA_ONLY',title:row.title,confidence:'Likely',needsReview:true,propertyId:property,proposed:{location:null,city:null,beds:null,price:null,currency:'GHS'},notes:['Synthetic local fixture.'],assetIds:[asset],assignedAssetIds:[asset]}],assets:[{id:asset,sourceId:'01',sourceMediaGroup:'LOCAL_QA_ONLY',sourceFilename:'synthetic.jpeg',kind:'image',sha256:'b'.repeat(64),bytes:100,confidence:'Likely',sourceNotes:'Synthetic only',notes:[],original,thumbnail:original,frames:[],duration:null,duplicateOf:null,mediaId}]};
let version=0,decision=null,audits=[];
const media=()=>[{id:mediaId,property_id:property,kind:'image',url:row.image,caption:`Synthetic gallery version ${version}`,sort_order:0}];
function json(res,value,status=200){res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(value));}
function rows(req,res,value){return json(res,req.headers.accept?.includes('application/vnd.pgrst.object+json')?value[0]:value);}
async function body(req){let text='';for await(const chunk of req)text+=chunk;return JSON.parse(text||'{}');}
createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  if(url.pathname==='/_qa/reset'){version=0;decision=null;audits=[];row=structuredClone(initialRow);features=[];saves=[];return json(res,{ok:true});}
  if(url.pathname==='/_qa/change'){version++;return json(res,{version});}
  if(url.pathname==='/_qa/state')return json(res,{version,decision,audits,propertyStatus:row.status,property:row,features,saves});
  if(url.pathname==='/auth/v1/user')return json(res,{id:staff,email:'synthetic-admin@example.invalid',aud:'authenticated',role:'authenticated'});
  if(url.pathname==='/rest/v1/staff_profiles')return rows(req,res,[{id:staff,full_name:'Synthetic administrator',role:'admin'}]);
  if(url.pathname==='/rest/v1/properties')return rows(req,res,url.searchParams.get('limit')==='0'?[]:[row]);
  if(url.pathname==='/rest/v1/property_features')return rows(req,res,features);
  if(url.pathname==='/rest/v1/rpc/save_property_launch'&&req.method==='POST'){
    const payload=await body(req);
    if(payload.p.slug==='qa-conflicting-slug')return json(res,{code:'23505',message:'Synthetic duplicate slug'},409);
    const {plot_size_sqm,building_size_sqm,tenure,documentation_status,amenities,...core}=payload.p;
    row={...row,...core,id:property};features=[{property_id:property,plot_size_sqm,building_size_sqm,tenure,documentation_status,amenities}];saves.push(payload);
    return json(res,property);
  }
  if(url.pathname==='/rest/v1/property_media')return rows(req,res,media());
  if(url.pathname==='/rest/v1/audit_logs'&&req.method==='POST'){audits.push(await body(req));return json(res,{},201);}
  if(url.pathname==='/storage/v1/bucket/strong-media-review')return json(res,{id:'strong-media-review',name:'strong-media-review',public:false});
  if(url.pathname.includes('/object/')&&url.pathname.includes('/strong-media-review/')){
    if(req.method==='POST'&&url.pathname.endsWith(`/decisions/${property}.json`)){decision=await body(req);return json(res,{Key:'synthetic'},201);}
    if(url.pathname.endsWith('/index.json'))return json(res,{version:1,batches:[batch],properties:{[property]:{batchId:batch,groupId:group,needsReview:true}}});
    if(url.pathname.endsWith('/manifest.json'))return json(res,manifest);
    if(url.pathname.endsWith(`/decisions/${property}.json`)&&decision)return json(res,decision);
    return json(res,{statusCode:'404',message:'Missing synthetic object'},404);
  }
  return json(res,{message:'Unknown local test endpoint'},404);
}).listen(3004,'127.0.0.1',()=>console.log('Synthetic media-review backend ready on loopback port 3004'));
