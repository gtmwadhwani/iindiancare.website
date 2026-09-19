// netlify/functions/razorpay-create.js
const crypto = require('crypto');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if(event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if(event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({error: 'Method not allowed'}) };

  try {
    const { amount, currency, receipt, notes } = JSON.parse(event.body);

    // Validate amount (min 100 paise = Re 1)
    if(!amount || amount < 100) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Amount must be at least 100 paise (₹1)' }) };
    }

    const KEY_ID     = process.env.RAZORPAY_KEY_ID     || 'rzp_test_TdmUPiihRAVeBD';
    const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET  || 's44cv3G07Z3FAHWXwhhwjipS';

    const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');

    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        amount,
        currency: currency || 'INR',
        receipt: receipt || 'receipt_' + Date.now(),
        notes: notes || {}
      })
    });

    const data = await res.json();

    if(data.id) {
      return {
        statusCode: 200, headers,
        body: JSON.stringify({
          order_id: data.id,
          amount: data.amount,
          currency: data.currency,
          receipt: data.receipt
        })
      };
    } else {
      return {
        statusCode: 500, headers,
        body: JSON.stringify({ error: 'Razorpay order creation failed', details: data })
      };
    }

  } catch(err) {
    return {
      statusCode: 500, headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
