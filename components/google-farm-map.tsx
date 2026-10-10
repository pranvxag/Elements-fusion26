'use client'

import { useEffect, useRef, useState } from 'react'
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import { AlertTriangle, CloudRain } from 'lucide-react'

type GoogleMapLibraries = {
  Map: typeof google.maps.Map
  Marker: typeof google.maps.Marker
}

let configuredApiKey: string | undefined
let mapLibrariesPromise: Promise<GoogleMapLibraries> | undefined

function loadGoogleMapLibraries(apiKey: string): Promise<GoogleMapLibraries> {
  if (configuredApiKey && configuredApiKey !== apiKey) {
    return Promise.reject(new Error('The Google Maps API key changed after the loader was initialized. Reload the page to use the new key.'))
  }

  if (!configuredApiKey) {
    setOptions({ key: apiKey, v: 'weekly' })
    configuredApiKey = apiKey
  }

  if (!mapLibrariesPromise) {
    mapLibrariesPromise = Promise.all([
      importLibrary('maps'),
      importLibrary('marker'),
    ]).then(([mapsLibrary, markerLibrary]) => ({
      Map: mapsLibrary.Map,
      Marker: markerLibrary.Marker,
    })).catch(error => {
      mapLibrariesPromise = undefined
      throw error
    })
  }

  return mapLibrariesPromise
}

export function GoogleFarmMap() {
  const [lat, setLat] = useState('18.5204')
  const [lng, setLng] = useState('73.8567')
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [libraries, setLibraries] = useState<GoogleMapLibraries | null>(null)
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const markerInstance = useRef<google.maps.Marker | null>(null)

  useEffect(() => {
    let disposed = false
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      setError('Google Maps API key is missing. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local and restart the dev server.')
      setStatus('error')
      return () => { disposed = true }
    }

    loadGoogleMapLibraries(apiKey).then(loadedLibraries => {
      if (disposed) return
      setLibraries(loadedLibraries)
      setStatus('ready')
    }).catch(caughtError => {
      if (disposed) return
      setError(caughtError instanceof Error
        ? `Google Maps could not be loaded: ${caughtError.message}`
        : 'Google Maps could not be loaded. Check the API key, billing, API enablement, and website restrictions.')
      setStatus('error')
    })

    return () => { disposed = true }
  }, [])

  useEffect(() => {
    if (status !== 'ready' || !libraries || !mapRef.current) return

    const parsedLat = Number(lat)
    const parsedLng = Number(lng)
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng) || parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
      setError('Enter valid latitude and longitude values to center the farm map.')
      return
    }

    const position = { lat: parsedLat, lng: parsedLng }
    try {
      if (!mapInstance.current) {
        mapInstance.current = new libraries.Map(mapRef.current, {
          center: position,
          zoom: 15,
          mapTypeId: 'satellite',
          streetViewControl: true,
          zoomControl: true,
          fullscreenControl: true,
          mapTypeControl: true,
        })
        markerInstance.current = new libraries.Marker({
          position,
          map: mapInstance.current,
          title: 'Farm location',
        })
      } else {
        mapInstance.current.setCenter(position)
        mapInstance.current.setMapTypeId('satellite')
        markerInstance.current?.setPosition(position)
      }
      setError('')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Google Maps could not initialize the farm map.')
      setStatus('error')
    }
  }, [status, libraries, lat, lng])

  const applyFarmLocation = () => {
    const parsedLat = Number(lat)
    const parsedLng = Number(lng)
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng) || parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
      setError('The farm latitude or longitude is invalid. Use decimal coordinates.')
      return
    }

    setError('')
    if (mapInstance.current) {
      const position = { lat: parsedLat, lng: parsedLng }
      mapInstance.current.setCenter(position)
      mapInstance.current.setMapTypeId('satellite')
      mapInstance.current.setZoom(15)
      markerInstance.current?.setPosition(position)
    }
  }

  return (
    <section className="card satellite-panel">
      <div className="section-title">
        <div className="icon-box"><CloudRain size={17} /></div>
        <div>
          <h2>Farm map</h2>
          <p>Google Maps satellite view centred on the farmer’s actual coordinates.</p>
        </div>
      </div>
      <div className="satellite-form">
        <label>Latitude<input value={lat} onChange={event => setLat(event.target.value)} type="number" step="0.0001" /></label>
        <label>Longitude<input value={lng} onChange={event => setLng(event.target.value)} type="number" step="0.0001" /></label>
        <button className="button button-primary" onClick={applyFarmLocation} disabled={status !== 'ready'}>
          {status === 'loading' ? 'Loading map...' : 'Centre farm'}
        </button>
      </div>
      {status === 'loading' && <div className="demo-alert compact"><AlertTriangle size={16} /><span>Loading Google Maps JavaScript API…</span></div>}
      {error && <div className="demo-alert compact" role="alert"><AlertTriangle size={16} /><span>{error}</span></div>}
      <div ref={mapRef} className="google-map" />
    </section>
  )
}
