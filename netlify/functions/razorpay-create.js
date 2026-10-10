// netlify/functions/razorpay-create.js
const crypto = require('crypto');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  if(event.httpMethod === 'OPTIONS') return { statusCode:200, headers, body:'' };
  if(event.httpMethod !== 'POST') return { statusCode:405, headers, body: JSON.stringify({error:'Method not allowed'}) };
  try {
    const { amount, currency, receipt, notes } = JSON.parse(event.body);
    if(!amount || amount < 100) return { statusCode:400, headers, body: JSON.stringify({error:'Amount must be at least 100 paise'}) };
    const KEY_ID     = process.env.RAZORPAY_KEY_ID     || 'rzp_test_TlRjLN8AVeMInK';
    const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET  || 'gGYqQL2c5crsEMtmDeztHKoJ';
    const auth = Buffer.from(KEY_ID + ':' + KEY_SECRET).toString('base64');
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':'Basic '+auth },
      body: JSON.stringify({ amount, currency: currency||'INR', receipt: receipt||('receipt_'+Date.now()), notes: notes||{} })
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { return { statusCode:500, headers, body: JSON.stringify({error:'Parse failed', raw:text.substring(0,300)}) }; }
    if(data.id) return { statusCode:200, headers, body: JSON.stringify({order_id:data.id, amount:data.amount, currency:data.currency, receipt:data.receipt}) };
    return { statusCode:500, headers, body: JSON.stringify({error:'Razorpay order creation failed', details:data}) };
  } catch(err) {
    return { statusCode:500, headers, body: JSON.stringify({error:err.message}) };
  }
};
