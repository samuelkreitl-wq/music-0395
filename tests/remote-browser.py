from playwright.sync_api import sync_playwright
import time
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome')
 web=b.new_page();web.goto('http://localhost:4200/companion',wait_until='networkidle')
 out=web.evaluate('''async()=>{const {authClient}=await import('/src/web/lib/auth.ts'); await authClient.signUp.email({name:'Remote test',email:`remote-${Date.now()}@example.com`,password:'Remote-test-password-938!'});const {client}=await import('/src/web/lib/api.ts');window.rc=client;return await client.remote.create();}''')
 mobile=b.new_page(viewport={'width':390,'height':844});errs=[];mobile.on('pageerror',lambda e:errs.append(str(e)))
 mobile.goto('http://localhost:4300',wait_until='networkidle',timeout=90000)
 mobile.get_by_label('Pairing code').wait_for(timeout=60000);mobile.get_by_label('Pairing code').fill(out['code']);mobile.get_by_role('button',name='Connect to Mac').click()
 mobile.get_by_text('Paired with your Mac',exact=True).wait_for(timeout=15000)
 snap={'live':True,'midi':True,'playing':False,'recording':False,'tempo':123,'beat':0,'version':'TEST FIXTURE','tracks':[{'id':0,'name':'TEST vocal track','volume':0.7,'panning':0,'mute':False,'solo':False,'arm':False,'canArm':True,'meter':0,'clips':[{'scene':0,'name':'TEST clip','hasClip':True,'playing':False}],'devices':[] }],'error':None}
 web.evaluate('''({token,snapshot})=>window.rc.remote.exchange({token,snapshot})''',{'token':out['token'],'snapshot':snap})
 mobile.get_by_role('tab',name='Mixer').click();mobile.get_by_text('TEST vocal track',exact=True).wait_for(timeout=15000)
 with mobile.expect_response(lambda response: '/remote/command' in response.url and response.status==200):
  mobile.get_by_role('button',name='Play',exact=True).click()
 result=web.evaluate('''({token,snapshot})=>window.rc.remote.exchange({token,snapshot})''',{'token':out['token'],'snapshot':snap})
 assert any(c['command']['kind']=='play' for c in result['commands']),result
 print('PAIR_AND_TRANSPORT_PASS',True,'mobile_errors',errs)
 mobile.screenshot(path='/tmp/remote-mixer.png',full_page=True)
 mobile.get_by_role('tab',name='Takes').click();mobile.get_by_text('Catch the vocal.').wait_for();mobile.screenshot(path='/tmp/remote-takes.png',full_page=True)
 web.evaluate('''token=>window.rc.remote.close({token})''',out['token'])
 mobile.get_by_role('tab',name='Connect').click();mobile.screenshot(path='/tmp/remote-connect.png',full_page=True)
 b.close()
