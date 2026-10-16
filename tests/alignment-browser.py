from playwright.sync_api import sync_playwright
import struct
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome')
    page=browser.new_page(viewport={'width':1440,'height':1000},accept_downloads=True)
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.goto('http://localhost:4200/alignment',wait_until='networkidle')
    page.get_by_role('button',name='Load test audio').click()
    page.get_by_role('button',name='Analyze overall offset').click()
    assert '-180.0' in page.get_by_test_id('applied-offset').inner_text()
    page.get_by_role('button',name='Play audition').click()
    page.wait_for_function("document.querySelector('[aria-label=\"Playback position\"]').value > 0.2")
    before=float(page.get_by_label('Playback position').input_value())
    page.get_by_role('button',name='Aligned',exact=True).click()
    assert float(page.get_by_label('Playback position').input_value()) >= before
    page.get_by_role('button',name='Stop audition').click()
    page.get_by_label('Timing strength').fill('50')
    assert '-90.0' in page.get_by_test_id('applied-offset').inner_text()
    page.get_by_label('Timing strength').fill('100')
    page.evaluate('''async()=>{const {authClient}=await import('/src/web/lib/auth.ts');const r=await authClient.signUp.email({name:'Alignment test',email:`alignment-${Date.now()}@example.com`,password:'Alignment-test-8372!'});if(r.error)throw new Error(r.error.message)}''')
    page.get_by_role('button',name='Save aligned WAV to Sessions').wait_for()
    page.get_by_role('button',name='Save aligned WAV to Sessions').click()
    link=page.get_by_role('button',name='Download saved WAV')
    link.wait_for(timeout=60000)
    with page.expect_download() as d:
        link.click()
    d.value.save_as('/tmp/alignment-click-download.wav')
    data=open('/tmp/alignment-click-download.wav','rb').read()
    assert data[:4]==b'RIFF'
    assert struct.unpack_from('<H',data,20)[0]==3
    assert struct.unpack_from('<H',data,22)[0]==2
    assert struct.unpack_from('<I',data,24)[0]==48000
    assert len(data)==56+8*48000*2*4
    result=page.evaluate('''async()=>{const {client}=await import('/src/web/lib/api.ts');const {decodeWav,analyzeOffset,testStems}=await import('/src/web/lib/alignment.ts');const rows=await client.sessions.list();const s=rows.find(s=>s.title.startsWith('Vocal alignment · SYNTHETIC'));if(!s)throw new Error('Not persisted');const {url}=await client.sessions.downloadUrl({fileId:s.files[0].id});const bytes=await (await fetch(url)).arrayBuffer();const stem=decodeWav(bytes,'saved');const r=analyzeOffset(testStems().lead,stem);window.testSessionId=s.id;return r;}''')
    assert result['accepted'] and result['offsetMs']==0,result
    page.screenshot(path='/tmp/alignment-desktop.png',full_page=True)
    page.reload(wait_until='networkidle')
    persisted=page.evaluate('''async()=>{const {client}=await import('/src/web/lib/api.ts');const rows=await client.sessions.list();const s=rows.find(s=>s.title.startsWith('Vocal alignment · SYNTHETIC'));if(!s)return false;await client.sessions.remove({id:s.id});return true;}''')
    assert persisted
    page.get_by_role('button',name='Load test audio').click()
    page.get_by_role('button',name='Analyze overall offset').click()
    page.set_viewport_size({'width':390,'height':844})
    page.screenshot(path='/tmp/alignment-mobile.png',full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
    assert not errors,errors
    print('AUDIO_AB_STRENGTH_TIGRIS_WAV_PERSISTENCE_PASS',result,'page_errors',errors)
    browser.close()