import { NextApiRequest, NextApiResponse } from 'next'
import { stripe } from 'services/stripe'
import { Readable } from 'stream'
import Stripe from 'stripe'

async function buffer(readable: Readable) {
  const chunks = []

  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }

  return Buffer.concat(chunks)
}

export const config = {
  api: {
    bodyParser: false,
  },
}

const relevantsEvents = new Set(['checkout.session.completed'])

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const buf = await buffer(req)
  const secret = req.headers['stripe-signature']
  let event: Stripe.Event

  if (req.method === 'POST') {
    try {
      event = stripe.webhooks.constructEvent(
        buf,
        secret,
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } catch (err) {
      return res.status(400).json({ error: err })
    }

    const { type } = event

    if (relevantsEvents.has(type)) {
      try {
        switch (type) {
          case 'checkout.session.completed':
            break
          default:
            throw new Error('Unhandled event.')
        }
      } catch (err) {
        return res.json({ error: 'Webhook handler failed' })
      }
    }

    return res.status(200).json({ recieved: true })
  } else {
    res.setHeader('Allow', 'POST')
    res.status(405).end('Method not allowed')
  }
}
