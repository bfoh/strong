import {test,expect} from '@playwright/test';
const base=process.env.MEDIA_REVIEW_TEST_URL,mock='http://127.0.0.1:3004',id='44444444-4444-4444-a444-444444444444',editor='/admin/properties/'+id;
test.skip(!base,'Loopback-only synthetic property/editor backend.');
test.beforeEach(async({context,request})=>{expect(new URL(base!).hostname).toBe('127.0.0.1');await request.post(mock+'/_qa/reset');await context.addCookies([{name:'sp_admin_token',value:'local-synthetic-token',url:base!,httpOnly:true,sameSite:'Lax'}]);});
test('missing publication fields remain editable and unfinished details can be saved as a draft',async({page,request},info)=>{
  await page.goto(base+editor);const form=page.locator('.property-editor');
  await form.locator('[name=title]').fill('QA edited title — never real inventory');await form.locator('[name=plot_size_sqm]').fill('321.5');await form.locator('[name=status]').selectOption('published');
  await form.getByRole('button',{name:'Save property',exact:true}).click();
  const alert=form.getByRole('alert');await expect(alert).toContainText('Your entries are still here');await expect(alert.getByRole('link')).toHaveCount(6);
  for(const field of ['region','city','property_type','availability','review_status','publication_authorized'])await expect(form.locator(`[name=${field}]`)).toHaveAttribute('aria-invalid','true');
  await alert.getByRole('link',{name:/City \/ town:/}).click();await expect(form.locator('[name=city]')).toBeFocused();
  await expect(form.locator('[name=title]')).toHaveValue('QA edited title — never real inventory');await expect(page).toHaveURL(base+editor);
  expect((await(await request.get(mock+'/_qa/state')).json()).saves).toHaveLength(0);
  await alert.screenshot({path:info.outputPath('publication-requirements.png')});
  await form.locator('[name=status]').selectOption('draft');await expect(form.locator('[aria-invalid=true]')).toHaveCount(0);
  await form.getByRole('button',{name:'Save property',exact:true}).click();await expect(form.getByRole('status')).toContainText('Property saved as draft');
  let state=await(await request.get(mock+'/_qa/state')).json();expect(state.saves).toHaveLength(1);expect(state.features[0].plot_size_sqm).toBe(321.5);expect(state.property.price).toBeNull();expect(state.property.beds).toBeNull();
  await form.locator('[name=slug]').fill('qa-conflicting-slug');await form.getByRole('button',{name:'Save property',exact:true}).click();
  await expect(form.getByRole('alert')).toContainText('already used');await expect(form.locator('[name=slug]')).toHaveAttribute('aria-invalid','true');await expect(form.locator('[name=plot_size_sqm]')).toHaveValue('321.5');
  await form.locator('[name=slug]').fill('qa-corrected-slug');await form.getByRole('button',{name:'Save property',exact:true}).click();await expect(form.getByRole('status')).toContainText('saved as draft');
  state=await(await request.get(mock+'/_qa/state')).json();expect(state.saves).toHaveLength(2);expect(state.propertyStatus).toBe('draft');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('complete details still require media identity confirmation before synthetic publication',async({page,request})=>{
  await page.goto(base+editor);const form=page.locator('.property-editor');
  await form.locator('[name=region]').selectOption('Ashanti');await form.locator('[name=city]').fill('QA city');await form.locator('[name=property_type]').fill('QA house');await form.locator('[name=availability]').selectOption('available');await form.locator('[name=review_status]').selectOption('approved');await form.locator('[name=publication_authorized]').check();await form.locator('[name=status]').selectOption('published');
  await form.getByRole('button',{name:'Save property',exact:true}).click();await expect(form.getByRole('alert')).toContainText('Confirm the media match');expect((await(await request.get(mock+'/_qa/state')).json()).saves).toHaveLength(0);
  const review=page.locator('.media-decision');await review.locator('[name=evidence]').fill('Synthetic local fixture review only; no real property approval.');await review.getByRole('checkbox').check();await review.getByRole('button',{name:'Save media identity confirmation',exact:true}).click();await expect(review.getByRole('status')).toContainText('confirmation saved');
  await expect(form.locator('[name=city]')).toHaveValue('QA city');await expect(form.locator('[name=status]')).toHaveValue('published');
  await form.getByRole('button',{name:'Save property',exact:true}).click();await expect(form.getByRole('status')).toContainText('Property saved as published');
  const state=await(await request.get(mock+'/_qa/state')).json();expect(state.saves).toHaveLength(1);expect(state.property.publication_authorized).toBe(true);
});
test('native property forms show named publication requirements and can save unfinished drafts',async({browser,request})=>{
  const context=await browser.newContext({javaScriptEnabled:false});await context.addCookies([{name:'sp_admin_token',value:'local-synthetic-token',url:base!,httpOnly:true,sameSite:'Lax'}]);const page=await context.newPage();await page.goto(base+editor);
  let form=page.locator('.property-editor');await form.locator('[name=title]').fill('Native QA title — not inventory');await form.locator('[name=status]').selectOption('published');await form.getByRole('button',{name:'Save property',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Your property needs attention.'})).toBeVisible();await expect(page.getByRole('listitem')).toHaveCount(6);await expect(page.getByText('City / town:',{exact:true})).toBeVisible();expect((await(await request.get(mock+'/_qa/state')).json()).saves).toHaveLength(0);
  await page.goBack();form=page.locator('.property-editor');await expect(form.locator('[name=title]')).toHaveValue('Native QA title — not inventory');await form.locator('[name=status]').selectOption('draft');await form.getByRole('button',{name:'Save property',exact:true}).click();
  await expect(page).toHaveURL(base+editor);expect((await(await request.get(mock+'/_qa/state')).json()).propertyStatus).toBe('draft');await context.close();
});
test('new synthetic drafts redirect to their saved editor and JSON callers receive per-field errors',async({page,request})=>{
  await page.goto(base+'/admin/properties/new');const form=page.locator('.property-editor');
  await form.locator('[name=title]').fill('New QA draft — not company inventory');await form.locator('[name=slug]').fill('new-qa-only');await form.locator('[name=location]').fill('QA only');await form.locator('[name=description]').fill('New synthetic draft created only for local browser verification.');
  const fields=await form.evaluate(element=>Object.fromEntries(new FormData(element as HTMLFormElement)));
  const rejected=await page.request.post(base+'/api/admin/properties',{headers:{origin:base!,accept:'application/json'},form:{...fields,status:'published'}});expect(rejected.status()).toBe(400);expect(Object.keys((await rejected.json()).details.fieldErrors)).toHaveLength(6);
  await form.getByRole('button',{name:'Save property',exact:true}).click();await expect(page).toHaveURL(base+editor);await expect(page.locator('.property-editor [name=title]')).toHaveValue('New QA draft — not company inventory');expect((await(await request.get(mock+'/_qa/state')).json()).propertyStatus).toBe('draft');
});
