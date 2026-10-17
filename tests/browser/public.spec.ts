import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('public pages meet automated WCAG checks and expose no browser errors',async({page},info)=>{
 test.setTimeout(120000);await page.emulateMedia({reducedMotion:'reduce'});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const route of ['/','/tv','/properties','/about','/contact','/book-viewing','/privacy']) {
  await page.goto(route);const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(result.violations,`${route}: ${result.violations.map(v=>`${v.id} ${v.nodes.map(n=>n.target).join(',')}`).join('; ')}`).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route).toBe(true);
 }
 expect(errors).toEqual([]);await page.screenshot({path:`docs/visual-verification/ghana-launch/${info.project.name}-privacy.png`});
});
test('private routes, missing inventory and invalid origins stay protected',async({request,page})=>{
 await page.goto('/admin');await expect(page).toHaveURL(/\/admin\/login$/);
 for(const path of ['/properties/unpublished-or-missing','/locations/invented-region'])expect((await request.get(path)).status()).toBe(404);
 expect((await request.post('/api/enquiries',{data:{propertyId:'demo-1',name:'QA',phone:'+000 000 000 000'}})).status()).toBe(403);
 expect((await request.post('/api/admin/properties',{data:{},headers:{origin:'https://untrusted.example'}})).status()).toBe(403);
});
