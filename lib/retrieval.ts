import { supabase } from './supabase'

export async function buildContext(query: string) {
  const q = query.toLowerCase()

  const vendorMap: Record<string, string> = {
    'blue dart': 'Blue Dart',
    'bluedart': 'Blue Dart',
    'delhivery': 'Delhivery',
    'safexpress': 'Safexpress',
    'gati': 'Gati',
    'dtdc': 'DTDC',
  }
  const mentionedVendor = Object.entries(vendorMap).find(([k]) => q.includes(k))?.[1] ?? null

  const zoneKeywords: Record<string, string> = {
    northeast: 'northeast', 'north east': 'northeast', 'ne ': 'northeast',
    guwahati: 'northeast', imphal: 'northeast', agartala: 'northeast', shillong: 'northeast',
    metro: 'metro',
    tier2: 'tier2', 'tier 2': 'tier2',
    remote: 'remote',
  }
  const mentionedZone = Object.entries(zoneKeywords).find(([k]) => q.includes(k))?.[1] ?? null

  const cities = [
    'chennai','mumbai','delhi','kolkata','hyderabad','pune','guwahati','imphal',
    'shillong','agartala','jaipur','lucknow','patna','bhubaneswar','raipur',
    'kochi','chandigarh','nagpur','surat','vadodara','coimbatore','vizag',
    'visakhapatnam','dehradun','ranchi','bhopal','indore','amritsar',
  ]
  const mentionedCity = cities.find(c => q.includes(c)) ?? null

  // Broad analytical queries need all 150 rows — skip filtering
  const isBroadQuery = q.includes('all lane') || q.includes('all vendor') || q.includes('all 30') ||
    q.includes('30 lane') || q.includes('each lane') || q.includes('every lane') ||
    q.includes('average') || q.includes('saving') || q.includes('cheapest') ||
    q.includes('lowest') || q.includes('highest') || q.includes('rank') ||
    q.includes('calculate') || q.includes('across') || q.includes('briefing') ||
    q.includes('compare all') || q.includes('overall')

  const { data: items } = await supabase
    .from('bid_line_items')
    .select('*')
    .limit(150)

  let filtered = items ?? []

  if (!isBroadQuery) {
    if (mentionedVendor) filtered = filtered.filter(r => r.vendor === mentionedVendor)
    if (mentionedZone) filtered = filtered.filter(r => r.zone === mentionedZone)
    if (mentionedCity) filtered = filtered.filter(r => r.destination_city?.toLowerCase() === mentionedCity)
  }

  // For qualitative questions about SLA/contracts, fetch contract text
  const isQualitative = q.includes('sla') || q.includes('penalty') || q.includes('contract')
    || q.includes('escalat') || q.includes('liability') || q.includes('terms')
    || q.includes('clause') || q.includes('agreement') || q.includes('risk')
    || q.includes('risks') || q.includes('concern') || q.includes('issue')

  let contractContext: any[] = []
  if (isQualitative) {
    const contractQuery = supabase.from('contracts').select('vendor, body')
    if (mentionedVendor) {
      const { data } = await contractQuery.eq('vendor', mentionedVendor)
      contractContext = data ?? []
    } else {
      const { data } = await contractQuery
      contractContext = data ?? []
    }
  }

  return {
    bid_data: filtered.length > 0 ? filtered : (items ?? []),
    contracts: contractContext,
  }
}
