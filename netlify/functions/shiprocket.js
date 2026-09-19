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
    const body = JSON.parse(event.body);
    const { action, orderData } = body;

    // Use environment variables
    const SR_EMAIL = process.env.SR_EMAIL || 'gopal.wwani5@gmail.com';
    const SR_PASS  = process.env.SR_PASS  || 'D!8Nkb*Ao7lb2*i5rvTQqbMR*TBQL%K*';

    // Step 1: Auth
    const authRes = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: SR_EMAIL,
        password: SR_PASS
      })
    });

    const authText = await authRes.text();
    let authData;
    try { authData = JSON.parse(authText); }
    catch(e) { 
      return { 
        statusCode: 500, headers,
        body: JSON.stringify({ 
          error: 'Auth parse failed', 
          raw: authText.substring(0, 500),
          email_used: SR_EMAIL
        })
      };
    }

    if(!authData.token) {
      return {
        statusCode: 401, headers,
        body: JSON.stringify({ 
          error: 'Auth failed',
          message: authData.message || 'No token received',
          email_used: SR_EMAIL,
          shiprocket_response: authData
        })
      };
    }

    const token = authData.token;

    // Step 2: Create Order
    if(action === 'create_order') {
      const o = orderData;
      const weightMap = {
        'Oil Shield Facewash': 0.15,
        'Glow Charger Facewash': 0.15,
        'Skin Shield Sunscreen': 0.10
      };
      const weight = (weightMap[o.product] || 0.15) * (o.qty || 1);

      const orderDate = o.timestamp 
        ? new Date(o.timestamp).toISOString().replace('T', ' ').substring(0, 19)
        : new Date().toISOString().replace('T', ' ').substring(0, 19);

      const shipPayload = {
        order_id: o.id,
        order_date: orderDate,
        pickup_location: 'Primary',
        comment: o.notes || 'Indian Care Order',
        billing_customer_name: o.name,
        billing_last_name: '',
        billing_address: o.address,
        billing_address_2: '',
        billing_city: o.city,
        billing_pincode: String(o.pin),
        billing_state: o.state,
        billing_country: 'India',
        billing_email: o.email || SR_EMAIL,
        billing_phone: String(o.phone),
        shipping_is_billing: true,
        order_items: [{
          name: o.product + ' (' + (o.size || '') + ')',
          sku: (o.productKey || 'IC001').toUpperCase(),
          units: o.qty || 1,
          selling_price: Math.round((o.total || 235) / (o.qty || 1)),
          discount: 0,
          tax: '',
          hsn: 33049990
        }],
        payment_method: 'COD',
        shipping_charges: 0,
        giftwrap_charges: 0,
        transaction_charges: 0,
        total_discount: 0,
        sub_total: o.total || 235,
        length: 15,
        breadth: 8,
        height: 5,
        weight: weight
      };

      const shipRes = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(shipPayload)
      });

      const shipText = await shipRes.text();
      let shipData;
      try { shipData = JSON.parse(shipText); }
      catch(e) {
        return { 
          statusCode: 500, headers,
          body: JSON.stringify({ error: 'Order parse failed', raw: shipText.substring(0, 500) })
        };
      }

      if(shipData.order_id || shipData.shipment_id) {
        return {
          statusCode: 200, headers,
          body: JSON.stringify({
            success: true,
            shiprocket_order_id: shipData.order_id,
            shipment_id: shipData.shipment_id,
            status: shipData.status,
            awb_code: shipData.awb_code || null,
            courier_name: shipData.courier_name || null
          })
        };
      } else {
        return {
          statusCode: 400, headers,
          body: JSON.stringify({ 
            error: 'Order creation failed',
            shiprocket_response: shipData
          })
        };
      }
    }

    return { 
      statusCode: 400, headers, 
      body: JSON.stringify({ error: 'Unknown action: ' + action }) 
    };

  } catch(err) {
    return {
      statusCode: 500, headers,
      body: JSON.stringify({ 
        error: 'Function error',
        message: err.message,
        stack: err.stack ? err.stack.substring(0, 300) : null
      })
    };
  }
};
