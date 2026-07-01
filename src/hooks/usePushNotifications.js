import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const VAPID_PUBLIC_KEY = 'BI974Pa53UykQGvMNTlCTgXi_zMtn0fsHH_yAAsKE66_JTxGhfmH8wQS4gpxmnFlIkXOPumZLycbDjWXq_vvhCs'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function usePushNotifications(user, restoId) {
  const done = useRef(false)

  useEffect(() => {
    if (!user || !restoId || done.current) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission === 'denied') return

    done.current = true
    register(user, restoId)
  }, [user, restoId])
}

async function register(user, restoId) {
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const swReg = await navigator.serviceWorker.ready

    // Force re-subscribe si la clé VAPID a changé
    let sub = await swReg.pushManager.getSubscription()
    if (sub) await sub.unsubscribe()
    sub = await swReg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    const json = sub.toJSON()
    await supabase.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        restaurant_id: restoId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
      { onConflict: 'endpoint' }
    )
  } catch (err) {
    console.warn('Push subscription failed:', err)
  }
}
