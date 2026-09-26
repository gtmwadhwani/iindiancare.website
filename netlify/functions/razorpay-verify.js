// netlify/functions/razorpay-verify.js
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = JSON.parse(event.body);

    if(!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'R5MaLPvH1QaR6pl3jaaH4k2p';

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const generated_signature = crypto
      .createHmac('sha256', KEY_SECRET)
      .update(body)
      .digest('hex');

    if(generated_signature === razorpay_signature) {
      return {
        statusCode: 200, headers,
        body: JSON.stringify({
          success: true,
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          message: 'Payment verified successfully'
        })
      };
    } else {
      return {
        statusCode: 400, headers,
        body: JSON.stringify({ success: false, error: 'Signature mismatch - payment not verified' })
      };
    }

  } catch(err) {
    return {
      statusCode: 500, headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
