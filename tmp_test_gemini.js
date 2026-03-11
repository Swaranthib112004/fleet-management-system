const axios=require('./backend/node_modules/axios');
const fs=require('fs');
const key=fs.readFileSync('backend/.env','utf8').match(/GEMINI_API_KEY=(.+)/)[1];
const model='gemini-2.5-flash';
(async()=>{
  try {
    const url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const r=await axios.post(url,{contents:[{parts:[{text:'Hello'}]}]});
    console.log('success:', r.data?.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch(e) {
    console.error('err', e.response?.status, e.response?.data);
  }
  console.log('done');
})();
