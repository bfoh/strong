import {test} from 'node:test';
import assert from 'node:assert/strict';
import {propertyInputSchema} from '../../lib/property-validation';
import {propertyFormFailure,propertyFormSuccess} from '../../lib/property-form-response';
const draft={id:'',title:'Synthetic test property',slug:'synthetic-property',category:'residential',location:'QA only',price:'',image:'',images:'',beds:'',baths:'',description:'Synthetic fixture, never real inventory.',status:'draft',plot_size_sqm:'',building_size_sqm:'',tenure:'',documentation_status:'',amenities:''};
test('publication reports every missing requirement on its own field while unfinished drafts remain valid',()=>{
  const result=propertyInputSchema.safeParse({...draft,status:'published'});
  assert.equal(result.success,false);
  if(result.success)throw Error('Invalid publication accepted');
  assert.deepEqual(Object.keys(result.error.flatten().fieldErrors).sort(),['availability','city','property_type','publication_authorized','region','review_status']);
  assert.equal(propertyInputSchema.safeParse(draft).success,true);
  const ready={...draft,status:'published',region:'Ashanti',city:'Kumasi',property_type:'Detached house',availability:'available',review_status:'approved',publication_authorized:'on'};
  assert.equal(propertyInputSchema.safeParse(ready).success,true);
  for(const field of ['region','city','property_type'])assert.equal(propertyInputSchema.safeParse({...ready,[field]:'   '}).success,false);
});
test('property form failures preserve structured JSON for clients and provide escaped readable native errors',async()=>{
  const details={fieldErrors:{city:['Confirm <city> & "town".']}};
  const jsonReq=new Request('https://strong.example/api/admin/properties',{headers:{accept:'application/json'}});
  const response=propertyFormFailure(jsonReq,'Check details.',400,'invalid_fields',details);
  assert.equal(response.status,400);assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.deepEqual(await response.json(),{error:'Check details.',code:'invalid_fields',details});
  const htmlReq=new Request(jsonReq.url,{headers:{accept:'text/html'}});
  const native=propertyFormFailure(htmlReq,'Check <details>.',400,'invalid_fields',details,'"><script>alert(1)</script>');
  const html=await native.text();assert.equal(native.status,400);assert.match(native.headers.get('content-type')!,/text\/html/);
  assert.ok(html.includes('City / town'));assert.ok(html.includes('Confirm &lt;city&gt; &amp; &quot;town&quot;.'));assert.ok(html.includes('Check &lt;details&gt;.'));
  assert.ok(!html.includes('<script>'));assert.ok(html.includes('href="/admin/properties"'));assert.ok(html.includes('choose Draft'));
});
test('successful property saves acknowledge enhanced forms and retain native origin-based redirects',async()=>{
  const id='44444444-4444-4444-a444-444444444444';
  const request=(accept:string)=>new Request('http://localhost:3000/api/admin/properties',{headers:{accept,origin:'https://strong.example'}});
  assert.deepEqual(await propertyFormSuccess(request('application/json'),id,'draft').json(),{ok:true,id,status:'draft'});
  const native=propertyFormSuccess(request('text/html'),id,'draft');assert.equal(native.status,303);assert.equal(native.headers.get('location'),'https://strong.example/admin/properties/'+id);
});
