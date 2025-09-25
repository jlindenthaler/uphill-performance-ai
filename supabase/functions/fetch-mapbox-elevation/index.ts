import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { coordinates } = await req.json()
    
    if (!coordinates || !Array.isArray(coordinates)) {
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get MapBox token from environment
    const mapboxToken = Deno.env.get('MAPBOX_PUBLIC_TOKEN')
    if (!mapboxToken) {
      console.error('MAPBOX_PUBLIC_TOKEN environment variable is not set')
      return new Response(
        JSON.stringify({ error: 'MapBox configuration not available' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Batch coordinates for MapBox Elevation API (max 25 coordinates per request)
    const batchSize = 25
    const elevationResults: number[] = []
    
    console.log(`Processing ${coordinates.length} coordinates in batches of ${batchSize}`)
    
    for (let i = 0; i < coordinates.length; i += batchSize) {
      const batch = coordinates.slice(i, i + batchSize)
      
      // Format coordinates as required by MapBox API: lng,lat;lng,lat;...
      const coordString = batch
        .map((coord: number[]) => `${coord[0]},${coord[1]}`)
        .join(';')
      
      try {
        // Call MapBox Tilequery API for elevation data
        const mapboxUrl = `https://api.mapbox.com/v4/mapbox.terrain-rgb/tilequery/${coordString}.json?access_token=${mapboxToken}`
        
        const response = await fetch(mapboxUrl)
        
        if (!response.ok) {
          console.error(`MapBox API error: ${response.status} ${response.statusText}`)
          // Fallback to original elevation if available, otherwise use 0
          const fallbackElevations = batch.map((coord: number[]) => coord[2] || 0)
          elevationResults.push(...fallbackElevations)
          continue
        }
        
        const data = await response.json()
        
        // Extract elevation from MapBox terrain-rgb data
        const batchElevations = data.features?.map((feature: any) => {
          if (feature.properties?.tilequery?.layer === 'terrain') {
            // MapBox terrain-rgb encoding: elevation = -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1)
            const rgb = feature.properties.tilequery.geometry?.coordinates || [0, 0, 0]
            const elevation = -10000 + ((rgb[0] * 256 * 256 + rgb[1] * 256 + rgb[2]) * 0.1)
            return Math.round(elevation * 10) / 10 // Round to 1 decimal place
          }
          return 0
        }) || batch.map((coord: number[]) => coord[2] || 0)
        
        elevationResults.push(...batchElevations)
        
        // Rate limiting: small delay between requests
        if (i + batchSize < coordinates.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
      } catch (batchError) {
        console.error('Error processing batch:', batchError)
        // Fallback to original elevations
        const fallbackElevations = batch.map((coord: number[]) => coord[2] || 0)
        elevationResults.push(...fallbackElevations)
      }
    }
    
    // Calculate enhanced elevation profile
    let cumulativeDistance = 0
    const elevationProfile = coordinates.map((coord: number[], index: number) => {
      if (index > 0) {
        const prevCoord = coordinates[index - 1]
        // Haversine formula for more accurate distance calculation
        const lat1 = prevCoord[1] * Math.PI / 180
        const lat2 = coord[1] * Math.PI / 180
        const deltaLat = (coord[1] - prevCoord[1]) * Math.PI / 180
        const deltaLng = (coord[0] - prevCoord[0]) * Math.PI / 180
        
        const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
          Math.cos(lat1) * Math.cos(lat2) *
          Math.sin(deltaLng/2) * Math.sin(deltaLng/2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
        const distance = 6371000 * c // Earth's radius in meters
        
        cumulativeDistance += distance
      }
      
      return {
        distance: cumulativeDistance / 1000, // Convert to km
        elevation: elevationResults[index] || coord[2] || 0,
        index
      }
    })
    
    // Calculate statistics
    const elevations = elevationProfile.map(p => p.elevation)
    const minElevation = Math.min(...elevations)
    const maxElevation = Math.max(...elevations)
    
    // Calculate total elevation gain
    let totalElevationGain = 0
    for (let i = 1; i < elevationProfile.length; i++) {
      const gain = elevationProfile[i].elevation - elevationProfile[i - 1].elevation
      if (gain > 0) {
        totalElevationGain += gain
      }
    }
    
    const result = {
      coordinates,
      elevationData: elevationProfile,
      calculatedAt: new Date().toISOString(),
      source: 'mapbox_api',
      minElevation: Math.round(minElevation * 10) / 10,
      maxElevation: Math.round(maxElevation * 10) / 10,
      totalElevationGain: Math.round(totalElevationGain * 10) / 10,
      apiCallsUsed: Math.ceil(coordinates.length / batchSize)
    }
    
    console.log(`MapBox elevation API processing completed. Calls used: ${result.apiCallsUsed}`)
    
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
    
  } catch (error) {
    console.error('Error in fetch-mapbox-elevation function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})