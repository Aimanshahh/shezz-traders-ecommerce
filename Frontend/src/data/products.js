export const allProducts = [
  {
    id: '1', name: 'OBD GPS Tracker', price: 12999, category: 'Vehicle Trackers',
    image: '/images/obd-tracker.jpg',
    description: 'Plug and play OBD GPS tracker with real-time location tracking, vehicle health monitoring and geo-fencing. Perfect for cars, trucks and fleets.',
    rating: 4.8, reviewCount: 124,
    features: ['Real-time location tracking', 'Vehicle health monitoring', 'Geo-fencing & instant alerts', 'Easy plug and play installation'],
  },
  {
    id: '2', name: 'Magnetic GPS Tracker', price: 10499, category: 'Vehicle Trackers',
    image: '/images/magnetic-tracker.jpg',
    description: 'Compact magnetic GPS tracker that attaches discreetly to any vehicle. Long battery life for extended tracking without charging.',
    rating: 4.6, reviewCount: 98,
    features: ['Strong magnetic mount', 'Long battery life', 'Real-time location tracking', 'Weatherproof design'],
  },
  {
    id: '3', name: 'Mini GPS Tracker', price: 8999, category: 'Personal Trackers',
    image: '/images/mini-tracker.jpg',
    description: 'Ultra-portable GPS tracker for personal safety and peace of mind — small enough to carry anywhere.',
    rating: 4.5, reviewCount: 76,
    features: ['Pocket-sized design', 'SOS alert button', 'Real-time location tracking', 'Long standby battery'],
  },
  {
    id: '4', name: 'Bike GPS Tracker', price: 9999, category: 'Bike Trackers',
    image: '/images/bike-tracker.jpg',
    description: 'Theft-protection GPS tracker built specifically for motorbikes and bicycles.',
    rating: 4.7, reviewCount: 61,
    features: ['Anti-theft alerts', 'Weatherproof housing', 'Real-time location tracking', 'Easy concealed installation'],
  },
  {
    id: '5', name: 'Car GPS Tracker', price: 11999, category: 'Vehicle Trackers',
    image: '/images/car-tracker.jpg',
    description: 'Reliable in-car GPS tracker with engine kill/resume support for enhanced vehicle security.',
    rating: 4.7, reviewCount: 89,
    features: ['Engine kill/resume', 'Real-time location tracking', 'Geo-fencing & instant alerts', 'Speed monitoring'],
  },
  {
    id: '6', name: 'Portable GPS Tracker', price: 7999, category: 'Personal Trackers',
    image: '/images/portable-tracker.jpg',
    description: 'Lightweight, portable tracker ideal for tracking personal belongings or loved ones on the go.',
    rating: 4.4, reviewCount: 52,
    features: ['Compact & lightweight', 'Real-time location tracking', 'Long battery life', 'Simple mobile app pairing'],
  },
  {
    id: '7', name: 'Asset Tracker', price: 6999, category: 'Asset Trackers',
    image: '/images/asset-tracker.jpg',
    description: 'Durable asset tracker for monitoring equipment, containers, or valuable cargo.',
    rating: 4.5, reviewCount: 44,
    features: ['Rugged, durable build', 'Long battery life', 'Real-time location tracking', 'Geo-fencing & instant alerts'],
  },
  {
    id: '8', name: '4G GPS Tracker', price: 13999, category: 'Vehicle Trackers',
    image: '/images/4g-tracker.jpg',
    description: 'Next-gen 4G GPS tracker with faster, more reliable location updates than standard 2G/3G trackers.',
    rating: 4.9, reviewCount: 110,
    features: ['4G connectivity', 'Real-time location tracking', 'Geo-fencing & instant alerts', 'Vehicle health monitoring'],
  },
]

export const categoryColors = {
  'Vehicle Trackers': '#1D4ED8',
  'Bike Trackers': '#7C3AED',
  'Personal Trackers': '#0F9D6C',
  'Asset Trackers': '#B45309',
}


export const categories = ['All Products', 'Vehicle Trackers', 'Bike Trackers', 'Personal Trackers', 'Asset Trackers']
export const featuredProducts = allProducts.slice(0, 4)

export function getProductById(id) {
  return allProducts.find((p) => String(p.id) === String(id))
}