// netlify/functions/shiprocket.js
// Ye file aapko: netlify/functions/shiprocket.js path par rakhni hai

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if(event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if(event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({error: 'Method not allowed'}) };
  }

  try {
    const { action, orderData } = JSON.parse(event.body);

    // Step 1: Get Shiprocket Auth Token
    const authRes = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'gopal.wwani5@gmail.com',
        password: 'D!8Nkb*Ao7lb2*i5rvTQqbMR*TBQL%K*'
      })
    });

    const authData = await authRes.json();

    if(!authData.token) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Auth failed', details: authData })
      };
    }

    const token = authData.token;

    // Step 2: Based on action
    if(action === 'create_order') {
      const o = orderData;

      // Calculate weight based on product
      const weightMap = {
        'Oil Shield Facewash': 0.15,
        'Glow Charger Facewash': 0.15,
        'Skin Shield Sunscreen': 0.10
      };
      const weight = (weightMap[o.product] || 0.15) * o.qty;

      const shipRes = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          order_id: o.id,
          order_date: new Date(o.timestamp).toISOString().split('T')[0] + ' ' + new Date(o.timestamp).toTimeString().split(' ')[0],
          pickup_location: 'Primary',
          channel_id: '',
          comment: o.notes || 'Indian Care Order',
          billing_customer_name: o.name,
          billing_last_name: '',
          billing_address: o.address,
          billing_address_2: '',
          billing_city: o.city,
          billing_pincode: o.pin,
          billing_state: o.state,
          billing_country: 'India',
          billing_email: o.email || 'query.indiancare@gmail.com',
          billing_phone: o.phone,
          shipping_is_billing: true,
          shipping_customer_name: o.name,
          shipping_last_name: '',
          shipping_address: o.address,
          shipping_address_2: '',
          shipping_city: o.city,
          shipping_pincode: o.pin,
          shipping_state: o.state,
          shipping_country: 'India',
          shipping_email: o.email || 'query.indiancare@gmail.com',
          shipping_phone: o.phone,
          order_items: [{
            name: o.product + ' (' + o.size + ')',
            sku: o.productKey || 'IC-' + o.product.substring(0,3).toUpperCase(),
            units: o.qty,
            selling_price: o.total / o.qty,
            discount: 0,
            tax: '',
            hsn: 33049990
          }],
          payment_method: 'COD',
          shipping_charges: 0,
          giftwrap_charges: 0,
          transaction_charges: 0,
          total_discount: 0,
          sub_total: o.total,
          length: 15,
          breadth: 8,
          height: 5,
          weight: weight
        })
      });

      const shipData = await shipRes.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          shiprocket_order_id: shipData.order_id,
          shipment_id: shipData.shipment_id,
          status: shipData.status,
          awb_code: shipData.awb_code || null,
          courier_name: shipData.courier_name || null,
          raw: shipData
        })
      };
    }

    // Step 3: Assign AWB (courier)
    if(action === 'assign_awb') {
      const awbRes = await fetch('https://apiv2.shiprocket.in/v1/external/courier/assign/awb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ shipment_id: orderData.shipment_id })
      });
      const awbData = await awbRes.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          awb_code: awbData.response?.data?.awb_code,
          courier_name: awbData.response?.data?.courier_name,
          raw: awbData
        })
      };
    }

    // Step 4: Track order
    if(action === 'track') {
      const trackRes = await fetch('https://apiv2.shiprocket.in/v1/external/courier/track/awb/' + orderData.awb, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const trackData = await trackRes.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, tracking: trackData })
      };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };

  } catch(err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
